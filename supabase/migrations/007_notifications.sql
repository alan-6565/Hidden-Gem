-- 007 — in-app notifications (part of #1). Safe to re-run.
--
-- What this adds:
--   A notifications table plus triggers that populate it for the four
--   events the app already has data for: a new follower, a reply to your
--   review, an order status change (customer side), and a new order
--   (business side). This is the bell icon's real backing data — it does
--   not add OS-level push notifications, which need Expo push tokens and a
--   server-side sender and are a separate, larger piece of work.
--
--   Rows are only ever written by the triggers below (security definer) —
--   there's no insert policy for the authenticated role, so a client can't
--   forge a notification for someone else.

create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  type text not null check (type in ('new_follower', 'review_reply', 'order_status', 'new_order')),
  title text not null,
  body text not null,
  spot_id text references spots(id) on delete cascade,
  order_id text references orders(id) on delete cascade,
  review_id text references reviews(id) on delete cascade,
  actor_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select
  using (auth.uid()::text = user_id);

drop policy if exists "mark own notifications read" on notifications;
create policy "mark own notifications read" on notifications for update
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

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
