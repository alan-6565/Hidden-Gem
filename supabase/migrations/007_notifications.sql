-- 007 — notifications (the bell icon, part of #1). Safe to re-run.
--
-- Requires PRs #2–#8 (profiles, business-profile editing) to already be
-- applied.
--
-- What this adds:
--   A notifications table for four events: someone follows you, a business
--   replies to your review, your order's status changes, and your business
--   application is approved or rejected. Rows are only ever written by
--   security-definer triggers on the events themselves — there's no insert
--   policy for clients, so a notification can't be forged. Text is baked in
--   at write time (same convention as reviews/posts storing the author's
--   name at insert) so the app doesn't need to join anything to render it.

create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  recipient_user_id text not null,
  actor_user_id text,
  type text not null check (type in ('follow', 'review_reply', 'order_status', 'verification_approved', 'verification_rejected')),
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on notifications (recipient_user_id, created_at desc);
alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select
  using (auth.uid()::text = recipient_user_id);

-- The only column a client may change is read_at, and only on their own
-- notification — enforced by the trigger below, not just the policy, in case
-- a future policy change loosens the "using" clause.
drop policy if exists "mark own notifications read" on notifications;
create policy "mark own notifications read" on notifications for update
  using (auth.uid()::text = recipient_user_id)
  with check (auth.uid()::text = recipient_user_id);

create or replace function protect_notification_fields() returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.recipient_user_id := old.recipient_user_id;
    new.actor_user_id := old.actor_user_id;
    new.type := old.type;
    new.title := old.title;
    new.body := old.body;
    new.data := old.data;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_notification_fields on notifications;
create trigger trg_protect_notification_fields before update on notifications
  for each row execute function protect_notification_fields();

-- No insert/delete policy at all for authenticated/anon — every row is
-- written by a security-definer trigger below, which bypasses RLS as its
-- owner. Deleting a notification isn't supported yet (mark-as-read only).

-- ── New follower ──────────────────────────────────────────────────────────
create or replace function notify_new_follower() returns trigger as $$
declare
  actor_name text;
begin
  select username into actor_name from profiles where user_id = new.follower_id;
  insert into notifications (recipient_user_id, actor_user_id, type, title, body, data)
    values (
      new.followed_id, new.follower_id, 'follow',
      coalesce(actor_name, 'Someone') || ' started following you',
      null,
      jsonb_build_object('followerId', new.follower_id)
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_follower on follows;
create trigger trg_notify_new_follower after insert on follows
  for each row execute function notify_new_follower();

-- ── A business replied to your review ───────────────────────────────────
-- Fires only when reply_text actually changes from empty/null to non-empty —
-- protect_review_reply_fields (from #6) has already finalized reply_text and
-- replied_at by the time this AFTER trigger runs, so it only needs to compare.
create or replace function notify_review_reply() returns trigger as $$
declare
  spot_name text;
begin
  if coalesce(old.reply_text, '') = '' and coalesce(new.reply_text, '') <> '' then
    select name into spot_name from spots where id = new.spot_id;
    insert into notifications (recipient_user_id, actor_user_id, type, title, body, data)
      values (
        new.user_id, auth.uid()::text, 'review_reply',
        coalesce(spot_name, 'A business') || ' replied to your review',
        new.reply_text,
        jsonb_build_object('spotId', new.spot_id, 'reviewId', new.id)
      );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_review_reply on reviews;
create trigger trg_notify_review_reply after update on reviews
  for each row execute function notify_review_reply();

-- ── Your order's status changed ─────────────────────────────────────────
-- Only the four shop-initiated transitions notify the customer — a customer
-- cancelling their own pending order already knows, so 'cancelled' is
-- excluded (guard_order_status_change, from #6, only lets a customer move
-- pending -> cancelled; every other transition here is the shop's doing).
create or replace function notify_order_status_change() returns trigger as $$
declare
  spot_name text;
  status_label text;
begin
  if new.status = old.status or new.status not in ('accepted', 'ready', 'completed', 'declined') then
    return new;
  end if;
  select name into spot_name from spots where id = new.spot_id;
  status_label := case new.status
    when 'accepted' then 'accepted your order'
    when 'ready' then 'has your order ready for pickup'
    when 'completed' then 'marked your order complete'
    when 'declined' then 'declined your order'
  end;
  insert into notifications (recipient_user_id, actor_user_id, type, title, body, data)
    values (
      new.customer_user_id, auth.uid()::text, 'order_status',
      coalesce(spot_name, 'A business') || ' ' || status_label,
      null,
      jsonb_build_object('spotId', new.spot_id, 'orderId', new.id, 'status', new.status)
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_order_status on orders;
create trigger trg_notify_order_status after update on orders
  for each row execute function notify_order_status_change();

-- ── Your business application was approved or rejected ──────────────────
create or replace function notify_verification_decision() returns trigger as $$
begin
  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;
  insert into notifications (recipient_user_id, actor_user_id, type, title, body, data)
    values (
      new.user_id, auth.uid()::text,
      case when new.status = 'approved' then 'verification_approved' else 'verification_rejected' end,
      case when new.status = 'approved'
        then '"' || new.business_name || '" was approved'
        else '"' || new.business_name || '" wasn''t approved'
      end,
      case when new.status = 'rejected' then new.reviewer_note else null end,
      jsonb_build_object('verificationId', new.id, 'existingSpotId', new.existing_spot_id)
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_verification_decision on business_verifications;
create trigger trg_notify_verification_decision after update on business_verifications
  for each row execute function notify_verification_decision();
