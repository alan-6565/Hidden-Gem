-- 010 — reconcile two independently-built notification features, and apply
-- #8's block-self-orders. Safe to re-run.
--
-- What happened: #16 (this branch) and #17 (rguerreroyu's, merged first)
-- both built the bell icon independently, with different `notifications`
-- table shapes, and #16's version was already run against the live database.
-- Per the decision to standardize on #17's shape and keep only what #17
-- doesn't already cover: this converts the live table from #16's shape to
-- #17's (preserving any rows), reinstates #17's functions/triggers/policies
-- exactly, re-adds the one thing #16 had that #17 doesn't — a notification
-- when a business application is approved or rejected — as an additive
-- extension of #17's schema rather than a competing one, and applies #8's
-- self-order block (`price_order` with the owner-ordering-from-themselves
-- check), which hadn't been run live yet.
--
-- Fresh installs never see #16's shape at all (schema.sql's own copy of
-- migration 007 is being replaced by #17's version in this same change), so
-- this file's conversion step is a no-op for anyone starting clean; it only
-- matters for this project's already-migrated live database.

-- ── Convert the table from #16's shape to #17's, if needed ──────────────
do $$
begin
  if to_regclass('public.notifications') is null then
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'recipient_user_id'
  ) then
    -- Already #17's shape (or no table yet) — nothing to convert.
    return;
  end if;

  -- The old policies, index and trigger reference the old column names, so
  -- Postgres won't let those columns be dropped while any of this exists.
  drop policy if exists "read own notifications" on notifications;
  drop policy if exists "mark own notifications read" on notifications;
  drop trigger if exists trg_protect_notification_fields on notifications;
  drop index if exists notifications_recipient_idx;

  alter table notifications drop constraint if exists notifications_type_check;
  alter table notifications add column if not exists user_id text;
  alter table notifications add column if not exists spot_id text;
  alter table notifications add column if not exists order_id text;
  alter table notifications add column if not exists review_id text;
  alter table notifications add column if not exists verification_id text;
  alter table notifications add column if not exists actor_id text;
  alter table notifications add column if not exists is_read boolean;

  update notifications set
    user_id = recipient_user_id,
    actor_id = actor_user_id,
    is_read = (read_at is not null),
    spot_id = data->>'spotId',
    order_id = data->>'orderId',
    review_id = data->>'reviewId',
    verification_id = data->>'verificationId',
    type = case when type = 'follow' then 'new_follower' else type end,
    body = coalesce(body, '')
  where user_id is null;

  alter table notifications alter column user_id set not null;
  alter table notifications alter column is_read set not null;
  alter table notifications alter column is_read set default false;
  alter table notifications alter column body set not null;

  alter table notifications drop column if exists recipient_user_id;
  alter table notifications drop column if exists actor_user_id;
  alter table notifications drop column if exists read_at;
  alter table notifications drop column if exists data;

  alter table notifications add constraint notifications_spot_id_fkey
    foreign key (spot_id) references spots(id) on delete cascade;
  alter table notifications add constraint notifications_order_id_fkey
    foreign key (order_id) references orders(id) on delete cascade;
  alter table notifications add constraint notifications_review_id_fkey
    foreign key (review_id) references reviews(id) on delete cascade;
end $$;

-- ── #17's shape, for a fresh install (no-op if the block above already
-- got there) ─────────────────────────────────────────────────────────────
create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  type text not null,
  title text not null,
  body text not null,
  spot_id text references spots(id) on delete cascade,
  order_id text references orders(id) on delete cascade,
  review_id text references reviews(id) on delete cascade,
  actor_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications add column if not exists verification_id text
  references business_verifications(id) on delete cascade;

-- Extends #17's four types with the two #16 had that #17 doesn't.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (
  type in ('new_follower', 'review_reply', 'order_status', 'new_order', 'verification_approved', 'verification_rejected')
);

alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select
  using (auth.uid()::text = user_id);

drop policy if exists "mark own notifications read" on notifications;
create policy "mark own notifications read" on notifications for update
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- #16's column-lock, applied to #17's shape: the only thing a client may
-- change is is_read, and only on their own row.
create or replace function protect_notification_fields() returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.user_id := old.user_id;
    new.type := old.type;
    new.title := old.title;
    new.body := old.body;
    new.spot_id := old.spot_id;
    new.order_id := old.order_id;
    new.review_id := old.review_id;
    new.verification_id := old.verification_id;
    new.actor_id := old.actor_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_notification_fields on notifications;
create trigger trg_protect_notification_fields before update on notifications
  for each row execute function protect_notification_fields();

create index if not exists notifications_user_unread_idx on notifications (user_id, is_read, created_at desc);

-- New follower.
create or replace function notify_new_follower() returns trigger as $$
declare
  follower_name text;
begin
  select username into follower_name from profiles where user_id = new.follower_id;
  insert into notifications (user_id, type, title, body, actor_id)
  values (
    new.followed_id, 'new_follower', 'New follower',
    coalesce('@' || follower_name, 'Someone') || ' started following you',
    new.follower_id
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_follower on follows;
create trigger trg_notify_new_follower after insert on follows
  for each row execute function notify_new_follower();

-- A business replies to your review.
create or replace function notify_review_reply() returns trigger as $$
declare
  spot_name text;
begin
  if coalesce(new.reply_text, '') <> '' and coalesce(old.reply_text, '') = '' then
    select name into spot_name from spots where id = new.spot_id;
    insert into notifications (user_id, type, title, body, spot_id, review_id)
    values (
      new.user_id, 'review_reply', 'New reply to your review',
      coalesce(spot_name, 'A business') || ' replied to your review',
      new.spot_id, new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_review_reply on reviews;
create trigger trg_notify_review_reply after update on reviews
  for each row execute function notify_review_reply();

-- Order status changes (tells the customer).
create or replace function notify_order_status_change() returns trigger as $$
declare
  spot_name text;
  status_label text;
begin
  if new.status is distinct from old.status then
    select name into spot_name from spots where id = new.spot_id;
    status_label := case new.status
      when 'accepted' then 'accepted'
      when 'ready' then 'ready for pickup'
      when 'completed' then 'completed'
      when 'declined' then 'declined'
      when 'cancelled' then 'cancelled'
      else new.status
    end;
    insert into notifications (user_id, type, title, body, spot_id, order_id)
    values (
      new.customer_user_id, 'order_status', 'Order update',
      'Your order at ' || coalesce(spot_name, 'the business') || ' is ' || status_label,
      new.spot_id, new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_order_status on orders;
create trigger trg_notify_order_status after update on orders
  for each row execute function notify_order_status_change();

-- New order (tells the business owner).
create or replace function notify_new_order() returns trigger as $$
declare
  owner_id text;
begin
  select owner_user_id into owner_id from spots where id = new.spot_id;
  if owner_id is not null then
    insert into notifications (user_id, type, title, body, spot_id, order_id)
    values (owner_id, 'new_order', 'New order', 'You have a new order to review', new.spot_id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_order on orders;
create trigger trg_notify_new_order after insert on orders
  for each row execute function notify_new_order();

-- ── Re-added from #16: a business application decision notifies the
-- applicant. #17 doesn't have this one. ─────────────────────────────────
create or replace function notify_verification_decision() returns trigger as $$
begin
  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;
  insert into notifications (user_id, actor_id, type, title, body, verification_id)
    values (
      new.user_id, auth.uid()::text,
      case when new.status = 'approved' then 'verification_approved' else 'verification_rejected' end,
      case when new.status = 'approved' then 'Application approved' else 'Application not approved' end,
      case when new.status = 'approved'
        then '"' || new.business_name || '" was approved'
        else coalesce(new.reviewer_note, '"' || new.business_name || '" wasn''t approved')
      end,
      new.id
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_verification_decision on business_verifications;
create trigger trg_notify_verification_decision after update on business_verifications
  for each row execute function notify_verification_decision();

-- Deleting an account shouldn't leave its notifications behind either.
create or replace function delete_own_account() returns void as $$
declare
  uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;

  update spots set owner_user_id = null where owner_user_id = uid;
  delete from reviews where user_id = uid;
  delete from posts where user_id = uid;
  delete from post_comments where user_id = uid;
  delete from post_likes where user_id = uid;
  delete from saved_posts where user_id = uid;
  delete from collections where user_id = uid;
  delete from saved_spots where user_id = uid;
  delete from spot_hype_votes where user_id = uid;
  delete from review_likes where user_id = uid;
  delete from follows where follower_id = uid or followed_id = uid;
  delete from business_verifications where user_id = uid;
  delete from reports where reporter_user_id = uid;
  delete from blocked_users where blocker_user_id = uid or blocked_user_id = uid;
  delete from admins where user_id = uid;
  delete from notifications where user_id = uid;

  update orders set note = null, pickup_time = null where customer_user_id = uid;

  delete from storage.objects
    where bucket_id in ('media', 'verification-docs')
      and (storage.foldername(name))[1] = uid;

  delete from profiles where user_id = uid;
  delete from auth.users where id = uid::uuid;
end;
$$ language plpgsql security definer set search_path = public;

-- ── #8: block ordering from your own business ────────────────────────────
create or replace function price_order() returns trigger as $$
declare
  spot_menu jsonb;
  accepting boolean;
  owner_id text;
  line jsonb;
  menu_item jsonb;
  priced jsonb := '[]'::jsonb;
  running numeric := 0;
  qty int;
begin
  select menu, accepting_orders, owner_user_id into spot_menu, accepting, owner_id
    from spots where id = new.spot_id;
  if spot_menu is null then
    raise exception 'Unknown spot.';
  end if;
  if not accepting then
    raise exception 'This business isn''t accepting orders right now.';
  end if;
  if owner_id is not null and owner_id = new.customer_user_id then
    raise exception 'You can''t order from your own business.';
  end if;

  for line in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    qty := coalesce((line->>'quantity')::int, 0);
    if qty < 1 or qty > 50 then
      raise exception 'Invalid quantity for %.', coalesce(line->>'name', 'an item');
    end if;
    select m into menu_item from jsonb_array_elements(spot_menu) m
      where m->>'id' = line->>'menuItemId' limit 1;
    if menu_item is null then
      raise exception '% is no longer on the menu.', coalesce(line->>'name', 'An item');
    end if;
    if coalesce((menu_item->>'soldOut')::boolean, false) then
      raise exception '% is sold out.', coalesce(menu_item->>'name', 'That item');
    end if;
    priced := priced || jsonb_build_object(
      'menuItemId', menu_item->>'id',
      'name', menu_item->>'name',
      'price', (menu_item->>'price')::numeric,
      'quantity', qty
    );
    running := running + (menu_item->>'price')::numeric * qty;
  end loop;

  if jsonb_array_length(priced) = 0 then
    raise exception 'Add at least one item to your order.';
  end if;

  new.items := priced;
  new.total := running;
  new.status := 'pending';
  return new;
end;
$$ language plpgsql;
