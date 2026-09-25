-- 015 — Push notifications. Safe to re-run.
--
-- Every notification row (new order, order status, review reply, follow,
-- verification result) is already created by a database trigger. This adds
-- one more trigger on top: whenever a notification is inserted, send it to
-- each of the recipient's devices through Expo's push service
-- (https://exp.host/--/api/v2/push/send), using pg_net so it happens
-- asynchronously and never slows down or fails the insert itself.
--
-- Nothing else changes about notifications — the in-app list still reads
-- the same table. A user with no registered device just doesn't get a push.

create extension if not exists pg_net with schema extensions;

-- One row per device. The token is the primary key because a device can
-- switch accounts; register_push_token() moves it to whoever is signed in.
-- user_id references auth.users so deleting an account (delete_own_account
-- ends with `delete from auth.users`) takes its devices with it.
create table if not exists push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on push_tokens (user_id);
alter table push_tokens enable row level security;

-- Read-only for the owner; all writes go through the functions below.
drop policy if exists "read own push_tokens" on push_tokens;
create policy "read own push_tokens" on push_tokens for select
  using (auth.uid() = user_id);

create or replace function register_push_token(token_param text, platform_param text)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to register for notifications';
  end if;
  if token_param !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Not an Expo push token';
  end if;
  insert into push_tokens (token, user_id, platform, updated_at)
    values (token_param, auth.uid(), platform_param, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;

-- Called on sign-out, so the next person to use the device doesn't get the
-- previous account's order alerts.
create or replace function unregister_push_token(token_param text)
returns void as $$
begin
  delete from push_tokens where token = token_param and user_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function send_push_for_notification() returns trigger as $$
declare
  messages jsonb;
  unread integer;
begin
  select count(*) into unread
    from notifications
    where recipient_user_id = new.recipient_user_id and read_at is null;

  select jsonb_agg(jsonb_build_object(
      'to', t.token,
      'title', new.title,
      'body', coalesce(new.body, ''),
      'sound', 'default',
      'badge', unread,
      'data', new.data || jsonb_build_object('notificationId', new.id, 'type', new.type)
    ))
    into messages
    from push_tokens t
    where t.user_id::text = new.recipient_user_id;

  if messages is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := messages,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json'
      )
    );
  exception when others then
    -- A push is a nice-to-have; the notification row must still be saved.
    raise notice 'Push send failed for notification %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

drop trigger if exists trg_send_push_for_notification on notifications;
create trigger trg_send_push_for_notification
  after insert on notifications
  for each row execute function send_push_for_notification();
