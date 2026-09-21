-- 002 — hardening on top of PRs #3–#5. Safe to re-run.
--
-- Requires the schema.sql sections from PRs #3–#5 (review_likes, reply_text,
-- recompute_tea_score, the protect_* triggers) to already be applied. Run once
-- in the Supabase SQL Editor for the project in .env; the same content is also
-- appended to schema.sql so a fresh install gets it.
--
-- What this fixes:
--   1. Review hearts never counted (a trigger undid the like trigger's update).
--   2. A business with no reviews showed an invented score. It's now 0 ("New").
--   3. Reviews accepted fake like counts / names / ratings, and authors and
--      shop owners could rewrite them afterwards.
--   4. Orders could be placed at any price, pre-marked "completed", created by
--      the shop in a customer's name, or cancelled after completion.
--   5. Shop owners could set their own score and promotion directly.
--   6. Every name shown in the app was the author's email prefix. Profiles
--      (username + avatar) replace it.
--
-- How "client vs trusted" is decided: PostgREST runs client requests as the
-- `authenticated` / `anon` Postgres roles, while the SQL Editor, the service
-- key and every SECURITY DEFINER function run as a privileged owner. Triggers
-- that must only constrain *clients* check `current_user in ('authenticated',
-- 'anon')` and are deliberately NOT security definer themselves (a definer
-- function always sees its owner as current_user). This is also why the
-- like-count trigger (definer) is allowed to touch fields a client can't.

-- ── 6a. Convert a profiles table that already exists ───────────────────
-- The live project already had a `profiles` table from earlier experimenting:
-- user_id (uuid, foreign key to auth.users), display_name, avatar_url. Creating
-- the table below with `if not exists` would silently skip it and then fail on
-- the missing `username` column, so convert it in place first. Its rows are
-- kept (display_name becomes username). No-op on a fresh database or on a
-- second run.
do $$
declare
  rec record;
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  -- Policies can block the column changes below, and the ones defined further
  -- down are meant to be the only ones — start clean.
  for rec in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', rec.policyname);
  end loop;

  -- A foreign key to auth.users(id) (uuid) would stop user_id becoming text like
  -- every other table here. delete_own_account() removes the profile explicitly.
  for rec in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'f' loop
    execute format('alter table public.profiles drop constraint %I', rec.conname);
  end loop;

  if (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') <> 'text' then
    alter table public.profiles alter column user_id type text using user_id::text;
  end if;

  if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name')
     and not exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
    alter table public.profiles rename column display_name to username;
  end if;

  alter table public.profiles add column if not exists username text;
  alter table public.profiles add column if not exists avatar_url text;
  alter table public.profiles add column if not exists created_at timestamptz not null default now();

  -- Make existing rows satisfy the rules the constraints below enforce.
  update public.profiles set username = lower(username) where username <> lower(username);
  update public.profiles set username = 'kuppio_' || substr(md5(user_id), 1, 6)
    where username is null or username !~ '^[a-z0-9_.]{3,20}$';
  update public.profiles p set username = 'kuppio_' || substr(md5(p.user_id), 1, 6)
    where p.user_id in (
      select user_id from (
        select user_id, row_number() over (partition by username order by created_at, user_id) as rn
        from public.profiles
      ) d where d.rn > 1
    );
  update public.profiles set avatar_url = null where avatar_url is not null and avatar_url !~ '^https://';
  alter table public.profiles alter column username set not null;

  -- Any other trigger on auth.users that writes to profiles would now insert
  -- into columns that no longer exist and break every signup. Ours is
  -- (re)created below, so drop the others.
  for rec in
    select tg.tgname
    from pg_trigger tg join pg_proc pr on pr.oid = tg.tgfoid
    where tg.tgrelid = 'auth.users'::regclass and not tg.tgisinternal
      and tg.tgname <> 'on_auth_user_created' and pr.prosrc ilike '%profiles%'
  loop
    execute format('drop trigger %I on auth.users', rec.tgname);
  end loop;
end $$;

-- ── 6. Profiles ─────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id text primary key,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$'),
  constraint profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://')
);
alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$');
alter table profiles drop constraint if exists profiles_avatar_https;
alter table profiles add constraint profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://');
create unique index if not exists profiles_user_id_unique_idx on profiles (user_id);
create unique index if not exists profiles_username_unique_idx on profiles (username);
alter table profiles enable row level security;

drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);

drop policy if exists "insert own profile" on profiles;
create policy "insert own profile" on profiles for insert with check (auth.uid()::text = user_id);

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Internal: returns a user's profile, creating one with a random handle if
-- missing (deliberately not derived from the email — that was the leak).
-- Clients must NOT be able to call this with an arbitrary user id, so
-- execute is revoked below; the only client entry point is ensure_my_profile().
create or replace function ensure_profile(uid text) returns profiles as $$
declare
  p profiles%rowtype;
  handle text;
begin
  select * into p from profiles where user_id = uid;
  if found then
    return p;
  end if;
  loop
    handle := 'kuppio_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    exit when not exists (select 1 from profiles where username = handle);
  end loop;
  insert into profiles (user_id, username) values (uid, handle) on conflict do nothing;
  select * into p from profiles where user_id = uid;
  return p;
end;
$$ language plpgsql security definer set search_path = public;

-- The client-facing version: only ever acts on the caller's own id. The app
-- calls it at startup, and the invoker-side triggers below use it, so a user
-- who signed up before profiles existed still gets one.
create or replace function ensure_my_profile() returns profiles as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  return ensure_profile(auth.uid()::text);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function handle_new_user() returns trigger as $$
begin
  perform ensure_profile(new.id::text);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

insert into profiles (user_id, username)
select u.id::text, 'kuppio_' || substr(md5(u.id::text), 1, 6)
from auth.users u
where not exists (select 1 from profiles p where p.user_id = u.id::text)
on conflict do nothing;

-- ── 3 + 6. Reviews: server-set fields, ranges, and protection ───────────
alter table reviews drop constraint if exists reviews_rating_range;
alter table reviews add constraint reviews_rating_range check (
  rating_overall between 1 and 5 and rating_taste between 1 and 5
  and rating_value between 1 and 5 and rating_vibe between 1 and 5
);
alter table reviews drop constraint if exists reviews_vibe_tag_valid;
alter table reviews add constraint reviews_vibe_tag_valid check (
  vibe_tag in ('worth_the_hype', 'hidden_gem', 'overpriced', 'skip_it')
);
alter table reviews drop constraint if exists reviews_body_length;
alter table reviews add constraint reviews_body_length check (char_length(body) <= 2000);

alter table post_comments drop constraint if exists post_comments_body_length;
alter table post_comments add constraint post_comments_body_length check (char_length(body) between 1 and 1000);
alter table posts drop constraint if exists posts_caption_length;
alter table posts add constraint posts_caption_length check (caption is null or char_length(caption) <= 2200);

-- On insert a client can no longer choose its own name, avatar, like count,
-- reply, timestamp, or overall rating (which is always the rounded average of
-- the three sub-ratings).
create or replace function apply_review_defaults() returns trigger as $$
declare
  p profiles%rowtype;
begin
  if current_user in ('authenticated', 'anon') then
    p := ensure_my_profile();
    new.user_name := p.username;
    new.user_avatar := p.avatar_url;
    new.like_count := 0;
    new.reply_text := null;
    new.replied_at := null;
    new.created_at := now();
    new.rating_overall := round((new.rating_taste + new.rating_value + new.rating_vibe) / 3.0);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_review_defaults on reviews;
create trigger trg_review_defaults before insert on reviews
  for each row execute function apply_review_defaults();

-- Replaces the PR #4 version. Two changes:
--  * It only constrains clients. PR #4's version ran for everyone, so it also
--    undid the like-count trigger's own update (a definer function, whose
--    current_user is its owner) — that is why likes from anyone but the
--    review's author never counted (problem 1). It also silently reverted
--    edits made in the SQL Editor.
--  * Identity/engagement fields (name, avatar, like_count, created_at) are
--    locked for EVERY client — the author and the shop owner alike.
create or replace function protect_review_reply_fields() returns trigger as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  new.like_count := old.like_count;
  new.created_at := old.created_at;
  new.user_name := old.user_name;
  new.user_avatar := old.user_avatar;

  if auth.uid()::text = old.user_id then
    -- the review's author: can edit their own review content, but not fabricate a reply
    new.reply_text := old.reply_text;
    new.replied_at := old.replied_at;
    new.rating_overall := round((new.rating_taste + new.rating_value + new.rating_vibe) / 3.0);
  else
    -- anyone else got here via the owner-reply policy: only the reply may move
    new.rating_overall := old.rating_overall;
    new.rating_taste := old.rating_taste;
    new.rating_value := old.rating_value;
    new.rating_vibe := old.rating_vibe;
    new.vibe_tag := old.vibe_tag;
    new.body := old.body;
    new.photo := old.photo;

    if new.reply_text is distinct from old.reply_text then
      new.replied_at := case when coalesce(new.reply_text, '') = '' then null else now() end;
    else
      new.replied_at := old.replied_at;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- ── 6. Posts and comments take their name from the profile ──────────────
-- Replaces PR #3's version, which derived author_name from the email prefix
-- (spoof-proof, but it was the privacy leak). Same trusted fields otherwise.
create or replace function set_post_trusted_fields() returns trigger as $$
declare
  p profiles%rowtype;
begin
  if new.spot_id is not null and new.user_id is not null and exists (
    select 1 from spots where id = new.spot_id and owner_user_id = new.user_id
  ) then
    new.author_type := 'owner';
  else
    new.author_type := 'customer';
  end if;

  if new.user_id is not null then
    p := ensure_profile(new.user_id);
    new.author_name := p.username;
    new.author_avatar := p.avatar_url;
  end if;

  new.like_count := 0;
  new.comment_count := 0;
  new.share_count := 0;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function apply_comment_defaults() returns trigger as $$
declare
  p profiles%rowtype;
begin
  if current_user in ('authenticated', 'anon') then
    p := ensure_my_profile();
    new.user_name := p.username;
    new.user_avatar := p.avatar_url;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_comment_defaults on post_comments;
create trigger trg_comment_defaults before insert on post_comments
  for each row execute function apply_comment_defaults();

-- Changing your username/avatar updates it on everything you've posted.
-- security definer: clients have no UPDATE right on those columns.
create or replace function propagate_profile_changes() returns trigger as $$
begin
  if new.username is distinct from old.username or new.avatar_url is distinct from old.avatar_url then
    update reviews set user_name = new.username, user_avatar = new.avatar_url where user_id = new.user_id;
    update posts set author_name = new.username, author_avatar = new.avatar_url where user_id = new.user_id;
    update post_comments set user_name = new.username, user_avatar = new.avatar_url where user_id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_profile_propagate on profiles;
create trigger trg_profile_propagate after update on profiles
  for each row execute function propagate_profile_changes();

-- Backfill: replace email-prefix names on existing content for real users.
update reviews r set user_name = p.username, user_avatar = p.avatar_url
  from profiles p where p.user_id = r.user_id;
update posts po set author_name = p.username, author_avatar = p.avatar_url
  from profiles p where p.user_id = po.user_id;
update post_comments c set user_name = p.username, user_avatar = p.avatar_url
  from profiles p where p.user_id = c.user_id;

-- ── 2. Kuppio Score: "New" until a spot has reviews ─────────────────────
-- Replaces PR #5's version. Identical math once a spot has at least one
-- review (its own average, pulled toward the platform average until it has
-- ~5 reviews, plus a small capped bonus from hype votes) — but a spot with no
-- reviews now scores 0, which the app displays as "New", instead of
-- inheriting the platform average (that showed 4.5 stars over "0 reviews").
-- hidden_gem_votes is derived here too (count of "Hidden Gem" tags), since it
-- is no longer client-editable.
create or replace function recompute_tea_score(spot_id_param text) returns void as $$
declare
  review_count integer;
  spot_avg numeric;
  gems integer;
  platform_avg numeric;
  hype_votes integer;
  confidence constant numeric := 5;
  weighted_rating numeric;
begin
  select count(*), avg(rating_overall), count(*) filter (where vibe_tag = 'hidden_gem')
    into review_count, spot_avg, gems
    from reviews where spot_id = spot_id_param;

  if review_count = 0 then
    update spots set tea_score = 0, hidden_gem_votes = 0 where id = spot_id_param;
    return;
  end if;

  select coalesce(avg(rating_overall), 4.0) into platform_avg from reviews;
  select coalesce(worth_the_hype_votes, 0) into hype_votes from spots where id = spot_id_param;

  weighted_rating :=
    (review_count::numeric / (review_count + confidence)) * spot_avg
    + (confidence / (review_count + confidence)) * platform_avg;

  update spots
    set tea_score = round(least(100, weighted_rating * 20 + least(hype_votes, 10) * 0.5)),
        hidden_gem_votes = gems
    where id = spot_id_param;
end;
$$ language plpgsql security definer set search_path = public;

-- ── 5. Spots: owners can edit content, not their own ranking ────────────
-- "owner can update own spot" has no column limits, so an owner could set
-- tea_score = 100 or promoted_until = 'infinity' in one API call. The
-- score/vote/promotion triggers and the SQL Editor are unaffected — they don't
-- run as authenticated/anon.
create or replace function protect_spot_columns() returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
       or new.owner_user_id is distinct from old.owner_user_id
       or new.tea_score is distinct from old.tea_score
       or new.worth_the_hype_votes is distinct from old.worth_the_hype_votes
       or new.hidden_gem_votes is distinct from old.hidden_gem_votes
       or new.promoted_until is distinct from old.promoted_until
       or new.created_at is distinct from old.created_at then
      raise exception 'That field can''t be edited directly.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_spot_columns on spots;
create trigger trg_protect_spot_columns before update on spots
  for each row execute function protect_spot_columns();

-- ── 4. Orders: server prices them, legal status moves only ──────────────
-- PR #3 stopped items/total being edited after placing an order, but an order
-- could still be *inserted* at any price or pre-marked "completed", the shop
-- could insert orders in a customer's name (its policy was "for all"), and a
-- customer could cancel an order that was already completed.
create or replace function price_order() returns trigger as $$
declare
  spot_menu jsonb;
  line jsonb;
  menu_item jsonb;
  priced jsonb := '[]'::jsonb;
  running numeric := 0;
  qty int;
begin
  select menu into spot_menu from spots where id = new.spot_id;
  if spot_menu is null then
    raise exception 'Unknown spot.';
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

drop trigger if exists trg_price_order on orders;
create trigger trg_price_order before insert on orders
  for each row execute function price_order();

create or replace function guard_order_status_change() returns trigger as $$
declare
  caller text := auth.uid()::text;
  shop_owner boolean;
begin
  if current_user not in ('authenticated', 'anon') or new.status = old.status then
    return new;
  end if;

  select exists (
    select 1 from spots where id = old.spot_id and owner_user_id = caller
  ) into shop_owner;

  if shop_owner then
    if not (
      (old.status = 'pending' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status in ('ready', 'declined'))
      or (old.status = 'ready' and new.status = 'completed')
    ) then
      raise exception 'That isn''t a valid status change for this order.';
    end if;
  elsif caller = old.customer_user_id then
    if not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'You can only cancel an order that is still pending.';
    end if;
  else
    raise exception 'Not allowed.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_order_status on orders;
create trigger trg_guard_order_status before update on orders
  for each row execute function guard_order_status_change();

-- Split the shop's "for all" policy so it can read and update (status only —
-- PR #3's immutable-fields trigger plus the guard above) but not insert.
drop policy if exists "owner manage orders for their spots" on orders;
drop policy if exists "owner read shop orders" on orders;
drop policy if exists "owner update shop orders" on orders;

create policy "owner read shop orders" on orders for select using (
  exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = auth.uid()::text)
);

create policy "owner update shop orders" on orders for update using (
  exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = auth.uid()::text)
) with check (
  exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = auth.uid()::text)
);

-- ── Storage: size and type limits ───────────────────────────────────────
-- Any signed-in user could upload any file type at any size into the public
-- bucket. The app sends real image/video content types (mediaUpload.ts).
update storage.buckets set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'video/mp4', 'video/quicktime'
  ]
where id = 'media';

update storage.buckets set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'verification-docs';

-- ── Internal helpers must not be callable through the public API ────────
-- PostgREST exposes every function in `public`. These two are SECURITY
-- DEFINER internals: anyone could call recompute_tea_score() in a loop (it
-- averages every review), or ensure_profile() to mint profiles for arbitrary
-- user ids. Triggers run as the owner, so they keep working.
revoke execute on function ensure_profile(text) from public, anon, authenticated;
revoke execute on function recompute_tea_score(text) from public, anon, authenticated;

-- One-time backfill with the new rules ("New" for spots with no reviews).
select recompute_tea_score(id) from spots;

-- ── Account deletion now removes the profile too ────────────────────────
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
  delete from profiles where user_id = uid;
  delete from auth.users where id = uid::uuid;
end;
$$ language plpgsql security definer set search_path = public;
