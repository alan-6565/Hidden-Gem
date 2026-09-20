-- Kuppio — schema + seed data
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).
--
-- Auth: the app uses real Supabase email/password accounts. saved_spots,
-- collections, and collection_spots are scoped to auth.uid(). reviews and
-- posts stay publicly readable but can only be inserted as yourself.
-- Business accounts: a spot with owner_user_id set is "claimed" by that
-- user, who can then edit it and whose posts tagging that spot are
-- auto-marked author_type='owner' by a trigger (never trust the client
-- for this — see set_post_author_type below).

create extension if not exists pgcrypto;

-- ── Spots ───────────────────────────────────────────────────────────────
create table if not exists spots (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null,
  tags text[] not null default '{}',
  is_home_based boolean not null default false,
  lat double precision not null,
  lng double precision not null,
  address text,
  service_area text,
  price_range text not null,
  description text,
  photos text[] not null default '{}',
  hours jsonb not null default '[]',
  menu jsonb not null default '[]',
  tea_score integer not null default 0,
  worth_the_hype_votes integer not null default 0,
  hidden_gem_votes integer not null default 0,
  owner_user_id text,
  promoted_until timestamptz,
  created_at timestamptz not null default now()
);

-- ── Reviews ─────────────────────────────────────────────────────────────
create table if not exists reviews (
  id text primary key default gen_random_uuid()::text,
  spot_id text not null references spots(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  user_avatar text,
  rating_overall numeric not null,
  rating_taste numeric not null,
  rating_value numeric not null,
  rating_vibe numeric not null,
  vibe_tag text not null,
  body text not null,
  photo text,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Posts (Reels) ───────────────────────────────────────────────────────
create table if not exists posts (
  id text primary key default gen_random_uuid()::text,
  spot_id text references spots(id) on delete cascade,
  user_id text,
  author_type text not null check (author_type in ('customer', 'owner')),
  author_name text not null,
  author_avatar text,
  media_url text not null,
  is_video boolean not null default false,
  caption text,
  sound_label text,
  explore_tags text[] not null default '{}',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  is_story boolean not null default false,
  created_at timestamptz not null default now()
);

-- Idempotent for an already-existing posts table (create table above only
-- runs on a fresh database). A story is just a post with is_story = true —
-- "disappearing after 24h" is enforced by the app's fetch query filtering on
-- created_at, not by deleting rows, so likes/reports on an expired story
-- still resolve to a real row.
alter table posts add column if not exists is_story boolean not null default false;

create index if not exists posts_stories_idx on posts (is_story, created_at desc)
  where is_story = true;

-- ── Collections ─────────────────────────────────────────────────────────
create table if not exists collections (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists collection_spots (
  collection_id text not null references collections(id) on delete cascade,
  spot_id text not null references spots(id) on delete cascade,
  primary key (collection_id, spot_id)
);

-- ── Saved spots ─────────────────────────────────────────────────────────
create table if not exists saved_spots (
  user_id text not null,
  spot_id text not null references spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

-- ── Row Level Security (permissive — no auth yet) ──────────────────────
alter table spots enable row level security;
alter table reviews enable row level security;
alter table posts enable row level security;
alter table collections enable row level security;
alter table collection_spots enable row level security;
alter table saved_spots enable row level security;

drop policy if exists "public read spots" on spots;
create policy "public read spots" on spots for select using (true);

-- Ownership is only ever granted by apply_business_verification_approval()
-- below (a security-definer trigger), never directly by the client — see
-- the business_verifications section further down. Once a spot has an
-- owner, only that owner can keep editing it; owner_user_id itself can
-- only ever be set to the caller's own id, so no takeover via update.
drop policy if exists "own or claim spot" on spots;
drop policy if exists "owner can update own spot" on spots;
create policy "owner can update own spot" on spots for update
  using (auth.uid()::text = owner_user_id)
  with check (auth.uid()::text = owner_user_id);

-- No insert policy at all for the authenticated role — all spot creation
-- happens exclusively inside apply_business_verification_approval().
drop policy if exists "insert own spot" on spots;

create unique index if not exists spots_name_unique_idx on spots (lower(name));

-- reviews stay publicly readable (that's the point of a review), but you can
-- only post a review as yourself, matching the authenticated user's id, and
-- never for a spot you own — a business rating its own listing isn't a real
-- review. One review per user per spot is enforced by the unique index below.
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
drop policy if exists "public write reviews" on reviews;
drop policy if exists "insert own reviews" on reviews;
create policy "insert own reviews" on reviews for insert
  with check (
    auth.uid()::text = user_id
    and not exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = auth.uid()::text)
  );

create unique index if not exists reviews_user_spot_unique_idx on reviews (user_id, spot_id);

-- You can edit your own review in place (rather than being blocked outright
-- by the unique index above once you already have one for this spot), but
-- never reassign it to a different spot or user.
drop policy if exists "update own reviews" on reviews;
create policy "update own reviews" on reviews for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create or replace function protect_review_identity_fields() returns trigger as $$
begin
  if new.spot_id is distinct from old.spot_id or new.user_id is distinct from old.user_id then
    raise exception 'spot_id and user_id cannot be changed on a review';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_review_protect_identity on reviews;
create trigger trg_review_protect_identity before update on reviews
  for each row execute function protect_review_identity_fields();

drop policy if exists "delete own reviews" on reviews;
create policy "delete own reviews" on reviews for delete
  using (auth.uid()::text = user_id);

-- A business owner can reply to reviews left on their own spot. This is a
-- separate update policy from "update own reviews" above (which lets the
-- review's author edit their own review) — the trigger below restricts each
-- actor to the columns they're allowed to touch, so a reply can't rewrite
-- the review itself and an edit can't fabricate a reply.
alter table reviews add column if not exists reply_text text;
alter table reviews add column if not exists replied_at timestamptz;

drop policy if exists "owner reply to review" on reviews;
create policy "owner reply to review" on reviews for update
  using (exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = auth.uid()::text))
  with check (exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = auth.uid()::text));

create or replace function protect_review_reply_fields() returns trigger as $$
begin
  if auth.uid()::text = old.user_id then
    -- the review's author: can edit their own review content, but not fabricate a reply
    new.reply_text := old.reply_text;
    new.replied_at := old.replied_at;
  else
    -- anyone else touching this row only got here via the owner-reply policy
    -- above: lock every review-content column and only allow the reply
    -- fields to move.
    new.rating_overall := old.rating_overall;
    new.rating_taste := old.rating_taste;
    new.rating_value := old.rating_value;
    new.rating_vibe := old.rating_vibe;
    new.vibe_tag := old.vibe_tag;
    new.body := old.body;
    new.photo := old.photo;
    new.like_count := old.like_count;

    if new.reply_text is distinct from old.reply_text then
      new.replied_at := case when coalesce(new.reply_text, '') = '' then null else now() end;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_review_protect_reply_fields on reviews;
create trigger trg_review_protect_reply_fields before update on reviews
  for each row execute function protect_review_reply_fields();

drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select using (true);
drop policy if exists "public write posts" on posts;
drop policy if exists "insert own posts" on posts;
create policy "insert own posts" on posts for insert with check (auth.uid()::text = user_id);

drop policy if exists "delete own posts" on posts;
create policy "delete own posts" on posts for delete
  using (auth.uid()::text = user_id);

-- Never trust the client for these: author_type is derived from whether the
-- posting user owns the tagged spot; author_name is derived from their real
-- account rather than whatever string the client sends (stops posting under
-- a spoofed display name); the engagement counters always start at zero
-- regardless of what the insert payload claims (like_count/comment_count
-- move via the post_likes/post_comments triggers below; share_count has no
-- increment path yet and stays at its seeded/zero value either way).
create or replace function set_post_trusted_fields() returns trigger as $$
begin
  if new.spot_id is not null and new.user_id is not null and exists (
    select 1 from spots where id = new.spot_id and owner_user_id = new.user_id
  ) then
    new.author_type := 'owner';
  else
    new.author_type := 'customer';
  end if;

  if new.user_id is not null then
    select split_part(email, '@', 1) into new.author_name
    from auth.users where id = new.user_id::uuid;
  end if;

  new.like_count := 0;
  new.comment_count := 0;
  new.share_count := 0;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_set_post_author_type on posts;
drop trigger if exists trg_set_post_trusted_fields on posts;
create trigger trg_set_post_trusted_fields before insert on posts
  for each row execute function set_post_trusted_fields();

-- collections, their spot links, and saved spots are private to the owner.
drop policy if exists "public read collections" on collections;
drop policy if exists "public write collections" on collections;
drop policy if exists "own collections" on collections;
create policy "own collections" on collections for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

drop policy if exists "public read collection_spots" on collection_spots;
drop policy if exists "public write collection_spots" on collection_spots;
drop policy if exists "own collection_spots" on collection_spots;
create policy "own collection_spots" on collection_spots for all
  using (exists (select 1 from collections c where c.id = collection_spots.collection_id and c.user_id = auth.uid()::text))
  with check (exists (select 1 from collections c where c.id = collection_spots.collection_id and c.user_id = auth.uid()::text));

drop policy if exists "public read saved_spots" on saved_spots;
drop policy if exists "public write saved_spots" on saved_spots;
drop policy if exists "own saved_spots" on saved_spots;
create policy "own saved_spots" on saved_spots for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ── Post likes ──────────────────────────────────────────────────────────
-- Membership is scoped to the owner; posts.like_count is kept in sync via
-- triggers so it stays accurate under concurrent likes without needing a
-- public UPDATE policy on posts.
create table if not exists post_likes (
  user_id text not null,
  post_id text not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table post_likes enable row level security;

drop policy if exists "public read post_likes" on post_likes;
create policy "public read post_likes" on post_likes for select using (true);

drop policy if exists "own post_likes" on post_likes;
create policy "own post_likes" on post_likes for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create or replace function increment_post_like_count() returns trigger as $$
begin
  update posts set like_count = like_count + 1 where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function decrement_post_like_count() returns trigger as $$
begin
  update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_like_insert on post_likes;
create trigger trg_post_like_insert after insert on post_likes
  for each row execute function increment_post_like_count();

drop trigger if exists trg_post_like_delete on post_likes;
create trigger trg_post_like_delete after delete on post_likes
  for each row execute function decrement_post_like_count();

-- ── Kuppio Score (spots.tea_score) ──────────────────────────────────────
-- A Bayesian-weighted blend of a spot's own average rating and the
-- platform-wide average rating, weighted by review count (same idea as
-- IMDb's weighted rating) — a brand-new spot with zero reviews lands at the
-- platform average instead of a stark 0, and each real review pulls the
-- score toward that spot's own average, dominating it after ~5 reviews.
-- Hype votes add a small capped bonus so they nudge but never dominate.
-- Recomputed via triggers below (reviews + hype votes changing) instead of
-- being a static seeded number that never updates.
create or replace function recompute_tea_score(spot_id_param text) returns void as $$
declare
  review_count integer;
  spot_avg numeric;
  platform_avg numeric;
  hype_votes integer;
  confidence constant numeric := 5;
  weighted_rating numeric;
begin
  select count(*), avg(rating_overall) into review_count, spot_avg
    from reviews where spot_id = spot_id_param;

  select coalesce(avg(rating_overall), 4.0) into platform_avg from reviews;

  select coalesce(worth_the_hype_votes, 0) into hype_votes from spots where id = spot_id_param;

  weighted_rating :=
    (coalesce(review_count, 0)::numeric / (coalesce(review_count, 0) + confidence)) * coalesce(spot_avg, platform_avg)
    + (confidence / (coalesce(review_count, 0) + confidence)) * platform_avg;

  update spots
    set tea_score = round(least(100, weighted_rating * 20 + least(hype_votes, 10) * 0.5))
    where id = spot_id_param;
end;
$$ language plpgsql security definer;

create or replace function trg_recompute_tea_score_from_review() returns trigger as $$
begin
  perform recompute_tea_score(coalesce(new.spot_id, old.spot_id));
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_review_recompute_tea_score on reviews;
create trigger trg_review_recompute_tea_score after insert or update or delete on reviews
  for each row execute function trg_recompute_tea_score_from_review();

-- One-time backfill so existing spots (seed data, and anything approved
-- before this trigger existed) get a live score immediately, rather than
-- waiting on their next review or hype vote. Safe to re-run — it just
-- recomputes to the same values.
do $$
declare
  spot_row record;
begin
  for spot_row in select id from spots loop
    perform recompute_tea_score(spot_row.id);
  end loop;
end $$;

-- ── Spot hype votes (the heart on a Home feed card) ────────────────────
-- Same pattern as post_likes: membership scoped to the owner, spots.worth_the_hype_votes
-- kept in sync via triggers so it stays accurate under concurrent votes.
create table if not exists spot_hype_votes (
  user_id text not null,
  spot_id text not null references spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

alter table spot_hype_votes enable row level security;

drop policy if exists "public read spot_hype_votes" on spot_hype_votes;
create policy "public read spot_hype_votes" on spot_hype_votes for select using (true);

drop policy if exists "own spot_hype_votes" on spot_hype_votes;
create policy "own spot_hype_votes" on spot_hype_votes for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create or replace function increment_spot_hype_votes() returns trigger as $$
begin
  update spots set worth_the_hype_votes = worth_the_hype_votes + 1 where id = new.spot_id;
  perform recompute_tea_score(new.spot_id);
  return new;
end;
$$ language plpgsql security definer;

create or replace function decrement_spot_hype_votes() returns trigger as $$
begin
  update spots set worth_the_hype_votes = greatest(worth_the_hype_votes - 1, 0) where id = old.spot_id;
  perform recompute_tea_score(old.spot_id);
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_spot_hype_vote_insert on spot_hype_votes;
create trigger trg_spot_hype_vote_insert after insert on spot_hype_votes
  for each row execute function increment_spot_hype_votes();

drop trigger if exists trg_spot_hype_vote_delete on spot_hype_votes;
create trigger trg_spot_hype_vote_delete after delete on spot_hype_votes
  for each row execute function decrement_spot_hype_votes();

-- ── Review likes (the heart on a review card) ───────────────────────────
create table if not exists review_likes (
  user_id text not null,
  review_id text not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

alter table review_likes enable row level security;

drop policy if exists "public read review_likes" on review_likes;
create policy "public read review_likes" on review_likes for select using (true);

drop policy if exists "own review_likes" on review_likes;
create policy "own review_likes" on review_likes for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create or replace function increment_review_like_count() returns trigger as $$
begin
  update reviews set like_count = like_count + 1 where id = new.review_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function decrement_review_like_count() returns trigger as $$
begin
  update reviews set like_count = greatest(like_count - 1, 0) where id = old.review_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_review_like_insert on review_likes;
create trigger trg_review_like_insert after insert on review_likes
  for each row execute function increment_review_like_count();

drop trigger if exists trg_review_like_delete on review_likes;
create trigger trg_review_like_delete after delete on review_likes
  for each row execute function decrement_review_like_count();

-- ── Follows (the social graph behind Home's Following tab and the Reels
-- Follow button) ─────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id text not null,
  followed_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
alter table follows enable row level security;

drop policy if exists "public read follows" on follows;
create policy "public read follows" on follows for select using (true);

drop policy if exists "manage own follows" on follows;
create policy "manage own follows" on follows for all
  using (auth.uid()::text = follower_id) with check (auth.uid()::text = follower_id);

-- ── Saved posts (Reels bookmark) ───────────────────────────────────────
create table if not exists saved_posts (
  user_id text not null,
  post_id text not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table saved_posts enable row level security;

drop policy if exists "own saved_posts" on saved_posts;
create policy "own saved_posts" on saved_posts for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ── Post comments (Reels) ──────────────────────────────────────────────
-- Public read like reviews; posts.comment_count kept in sync via trigger.
create table if not exists post_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references posts(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  user_avatar text,
  body text not null,
  created_at timestamptz not null default now()
);

alter table post_comments enable row level security;

drop policy if exists "public read post_comments" on post_comments;
create policy "public read post_comments" on post_comments for select using (true);

drop policy if exists "insert own post_comments" on post_comments;
create policy "insert own post_comments" on post_comments for insert with check (auth.uid()::text = user_id);

drop policy if exists "delete own post_comments" on post_comments;
create policy "delete own post_comments" on post_comments for delete
  using (auth.uid()::text = user_id);

create or replace function increment_post_comment_count() returns trigger as $$
begin
  update posts set comment_count = comment_count + 1 where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_comment_insert on post_comments;
create trigger trg_post_comment_insert after insert on post_comments
  for each row execute function increment_post_comment_count();

create or replace function decrement_post_comment_count() returns trigger as $$
begin
  update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_comment_delete on post_comments;
create trigger trg_post_comment_delete after delete on post_comments
  for each row execute function decrement_post_comment_count();

-- ── Orders (preorder / pay-at-pickup) ──────────────────────────────────
-- No real payment processor is wired up yet (that needs Stripe Connect,
-- which requires each business owner's own account onboarding), so this
-- is order-ahead-and-pay-in-person, not a charged transaction.
create table if not exists orders (
  id text primary key default gen_random_uuid()::text,
  spot_id text not null references spots(id) on delete cascade,
  customer_user_id text not null,
  status text not null default 'pending' check (status in ('pending','accepted','ready','completed','declined','cancelled')),
  items jsonb not null default '[]',
  total numeric not null default 0,
  note text,
  pickup_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;

-- Customers can see their own orders, place new ones, and cancel them —
-- but never rewrite items/total/status-of-their-choosing once placed (the
-- app's own UI only ever lets a customer set status='cancelled'; every
-- other transition is the business owner's call). Owners can see/manage
-- orders placed against spots they own, including any status transition.
drop policy if exists "customer manage own order" on orders;

drop policy if exists "customer insert own order" on orders;
create policy "customer insert own order" on orders for insert
  with check (auth.uid()::text = customer_user_id);

drop policy if exists "customer read own order" on orders;
create policy "customer read own order" on orders for select
  using (auth.uid()::text = customer_user_id);

drop policy if exists "customer cancel own order" on orders;
create policy "customer cancel own order" on orders for update
  using (auth.uid()::text = customer_user_id)
  with check (auth.uid()::text = customer_user_id and status = 'cancelled');

drop policy if exists "owner manage orders for their spots" on orders;
create policy "owner manage orders for their spots" on orders for all
  using (exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = auth.uid()::text))
  with check (exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = auth.uid()::text));

create or replace function set_order_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_updated_at on orders;
create trigger trg_order_updated_at before update on orders
  for each row execute function set_order_updated_at();

-- items/total/spot_id/customer_user_id are set once at insert and never
-- change again — neither role's UI ever edits them after the order is
-- placed, only status (and note/pickup_time), so lock that in server-side
-- too rather than relying on the client to behave.
create or replace function protect_order_immutable_fields() returns trigger as $$
begin
  if new.items is distinct from old.items
    or new.total is distinct from old.total
    or new.spot_id is distinct from old.spot_id
    or new.customer_user_id is distinct from old.customer_user_id
  then
    raise exception 'items, total, spot_id, and customer_user_id cannot be changed after an order is placed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_protect_immutable on orders;
create trigger trg_order_protect_immutable before update on orders
  for each row execute function protect_order_immutable_fields();

-- ── Seed data ───────────────────────────────────────────────────────────
insert into spots (id, name, category, tags, is_home_based, lat, lng, address, service_area, price_range, description, photos, hours, menu, tea_score, worth_the_hype_votes, hidden_gem_votes) values
('spot-1', 'Matcha Moon', 'matcha', array['cute interior','good for photos','study-friendly'], false, 37.7699, -122.4469, '1234 Haight St, San Francisco, CA', null, '$$', 'Plant-filled matcha bar known for its strawberry matcha and quiet study corner.',
  array['https://picsum.photos/seed/matcha-moon/800/600','https://picsum.photos/seed/matcha-moon-2/800/600','https://picsum.photos/seed/matcha-moon-3/800/600'],
  '[{"day":"Mon","open":"8:00","close":"18:00"},{"day":"Tue","open":"8:00","close":"18:00"},{"day":"Wed","open":"8:00","close":"18:00"},{"day":"Thu","open":"8:00","close":"18:00"},{"day":"Fri","open":"8:00","close":"19:00"},{"day":"Sat","open":"9:00","close":"19:00"},{"day":"Sun","open":"9:00","close":"17:00"}]'::jsonb,
  '[{"id":"m1","name":"Strawberry Matcha","price":6.5,"isPopular":true,"photo":"https://picsum.photos/seed/matcha-moon-item-1/300/300"},{"id":"m2","name":"Iced Hojicha Latte","price":6,"isPopular":true,"photo":"https://picsum.photos/seed/matcha-moon-item-2/300/300"},{"id":"m3","name":"Matcha Soft Serve","price":7,"photo":"https://picsum.photos/seed/matcha-moon-item-3/300/300"}]'::jsonb,
  91, 128, 12),

('spot-2', 'Nena''s Home Bakes', 'home_based', array['home-based','preorder only','cute packaging'], true, 37.8044, -122.2712, null, 'Oakland, Fruitvale area', '$', 'Home baker taking weekly preorders for tres leches and Mexican pan dulce.',
  array['https://picsum.photos/seed/nenas-bakes/800/600','https://picsum.photos/seed/nenas-bakes-2/800/600'],
  '[{"day":"Fri","open":"10:00","close":"14:00"}]'::jsonb,
  '[{"id":"m1","name":"Tres Leches Cup","price":5,"isPopular":true,"photo":"https://picsum.photos/seed/nenas-item-1/300/300"},{"id":"m2","name":"Conchas (box of 4)","price":10,"isPopular":true,"photo":"https://picsum.photos/seed/nenas-item-2/300/300"}]'::jsonb,
  88, 64, 51),

('spot-3', 'Fog City Coffee Co.', 'coffee', array['outdoor seating','parking available','wifi'], false, 37.7614, -122.435, '890 Valencia St, San Francisco, CA', null, '$$', 'Neighborhood coffee shop with a sunny patio and a rotating single-origin pour-over.',
  array['https://picsum.photos/seed/fog-city/800/600','https://picsum.photos/seed/fog-city-2/800/600','https://picsum.photos/seed/fog-city-3/800/600'],
  '[{"day":"Mon","open":"7:00","close":"17:00"},{"day":"Tue","open":"7:00","close":"17:00"},{"day":"Wed","open":"7:00","close":"17:00"},{"day":"Thu","open":"7:00","close":"17:00"},{"day":"Fri","open":"7:00","close":"18:00"},{"day":"Sat","open":"8:00","close":"18:00"},{"day":"Sun","open":"8:00","close":"16:00"}]'::jsonb,
  '[{"id":"m1","name":"Brown Sugar Oat Latte","price":5.75,"isPopular":true,"photo":"https://picsum.photos/seed/fog-city-item-1/300/300"},{"id":"m2","name":"Cold Brew","price":5,"photo":"https://picsum.photos/seed/fog-city-item-2/300/300"}]'::jsonb,
  82, 40, 8),

('spot-4', 'Little Cloud Desserts', 'dessert', array['cute interior','good for photos','instagram-worthy'], false, 37.7952, -122.4028, '55 Grant Ave, San Francisco, CA', null, '$$', 'Soft serve and cloud-shaped desserts built for the photo before the first bite.',
  array['https://picsum.photos/seed/little-cloud/800/600','https://picsum.photos/seed/little-cloud-2/800/600','https://picsum.photos/seed/little-cloud-3/800/600'],
  '[{"day":"Wed","open":"11:00","close":"20:00"},{"day":"Thu","open":"11:00","close":"20:00"},{"day":"Fri","open":"11:00","close":"21:00"},{"day":"Sat","open":"11:00","close":"21:00"},{"day":"Sun","open":"11:00","close":"19:00"}]'::jsonb,
  '[{"id":"m1","name":"Soft Serve Cloud Cup","price":7,"isPopular":true,"photo":"https://picsum.photos/seed/little-cloud-item-1/300/300"},{"id":"m2","name":"Matcha Cloud Cake","price":8.5,"photo":"https://picsum.photos/seed/little-cloud-item-2/300/300"}]'::jsonb,
  95, 210, 6),

('spot-5', 'Richmond Dumpling Cart', 'food_truck', array['cheap eats','late night','cash only'], false, 37.7799, -122.4839, 'Clement St & 6th Ave, San Francisco, CA', null, '$', 'Late-night dumpling cart slinging pork and chive dumplings ten at a time.',
  array['https://picsum.photos/seed/richmond-dumpling/800/600','https://picsum.photos/seed/richmond-dumpling-2/800/600'],
  '[{"day":"Thu","open":"17:00","close":"23:00"},{"day":"Fri","open":"17:00","close":"23:00"},{"day":"Sat","open":"17:00","close":"23:00"}]'::jsonb,
  '[{"id":"m1","name":"Pork & Chive Dumplings (10)","price":8,"isPopular":true,"photo":"https://picsum.photos/seed/richmond-item-1/300/300"}]'::jsonb,
  89, 77, 63),

('spot-6', 'Auntie Lin''s Popups', 'pop_up', array['weekend only','farmers market','limited drops'], true, 37.8716, -122.2727, null, 'Berkeley Farmers Market', '$', 'Weekend farmers-market stall for fresh scallion pancakes made to order.',
  array['https://picsum.photos/seed/auntie-lin/800/600','https://picsum.photos/seed/auntie-lin-2/800/600'],
  '[{"day":"Sat","open":"10:00","close":"13:00"}]'::jsonb,
  '[{"id":"m1","name":"Scallion Pancake","price":4.5,"isPopular":true,"photo":"https://picsum.photos/seed/auntie-lin-item-1/300/300"}]'::jsonb,
  93, 55, 70)
on conflict (id) do nothing;

insert into reviews (id, spot_id, user_id, user_name, user_avatar, rating_overall, rating_taste, rating_value, rating_vibe, vibe_tag, body, photo, like_count, created_at) values
('rev-1', 'spot-1', 'user-2', 'jules.eats', 'https://i.pravatar.cc/150?img=32', 5, 5, 4, 5, 'worth_the_hype', 'The strawberry matcha actually looks like the photos. Great study spot too.', 'https://picsum.photos/seed/rev1/600/600', 12, '2026-07-10'),
('rev-2', 'spot-1', 'user-3', 'oaklandfoodie', 'https://i.pravatar.cc/150?img=15', 4, 4, 3, 5, 'worth_the_hype', 'A little pricey but the vibe makes up for it. Get there early on weekends.', null, 7, '2026-07-14'),
('rev-3', 'spot-1', 'user-5', 'sarahfong', 'https://i.pravatar.cc/150?img=9', 3, 3, 3, 4, 'overpriced', 'Cute place but gets really crowded on weekends and seating runs out fast.', null, 5, '2026-07-16'),
('rev-4', 'spot-2', 'user-2', 'jules.eats', 'https://i.pravatar.cc/150?img=32', 5, 5, 5, 4, 'hidden_gem', 'DM her on IG to order, tres leches sold out in an hour last time.', null, 18, '2026-07-01'),
('rev-5', 'spot-5', 'user-4', 'lateNightSF', 'https://i.pravatar.cc/150?img=5', 5, 5, 5, 4, 'hidden_gem', 'Best $8 you will spend in the Richmond. Cash only, bring exact change.', null, 22, '2026-06-28'),
('rev-6', 'spot-4', 'user-3', 'oaklandfoodie', 'https://i.pravatar.cc/150?img=15', 5, 5, 4, 5, 'worth_the_hype', 'The cloud soft serve is unreal and it genuinely tastes as good as it looks.', null, 31, '2026-07-18')
on conflict (id) do nothing;

insert into posts (id, spot_id, author_type, author_name, author_avatar, media_url, is_video, caption, sound_label, explore_tags, like_count, comment_count, share_count, created_at) values
('post-1', 'spot-1', 'owner', 'matcha.moon', 'https://i.pravatar.cc/150?img=48', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', true, 'the coziest cafe with the best strawberry matcha ♥', 'Sunflower – Rex Orange County', array['cafes','aesthetic','study_spots'], 2400, 45, 312, '2026-07-20'),
('post-2', 'spot-4', 'customer', 'jules.eats', 'https://i.pravatar.cc/150?img=32', 'https://picsum.photos/seed/reel-2/900/1600', false, 'this cloud soft serve is worth every minute of the line', null, array['desserts','aesthetic'], 856, 21, 44, '2026-07-19'),
('post-3', 'spot-5', 'customer', 'lateNightSF', 'https://i.pravatar.cc/150?img=5', 'https://picsum.photos/seed/reel-3/900/1600', false, '$8 for 10 dumplings at midnight, cash only, worth it', null, array['hidden_gems','date_night'], 1240, 63, 98, '2026-07-18'),
('post-4', 'spot-2', 'owner', 'nenas.homebakes', 'https://i.pravatar.cc/150?img=44', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', true, 'fresh tres leches out of the fridge, preorders open now', 'Espresso – Sabrina Carpenter', array['hidden_gems','desserts'], 980, 38, 65, '2026-07-17'),
('post-5', 'spot-3', 'customer', 'oaklandfoodie', 'https://i.pravatar.cc/150?img=15', 'https://picsum.photos/seed/reel-5/900/1600', false, 'my new favorite spot to work from, plugs at every table', null, array['cafes','study_spots','pet_friendly'], 512, 14, 22, '2026-07-16'),
('post-6', 'spot-6', 'owner', 'auntielins.popups', 'https://i.pravatar.cc/150?img=51', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', true, 'scallion pancakes fresh off the pan at the Berkeley market', 'Taste – Sabrina Carpenter', array['hidden_gems','brunch'], 1780, 72, 140, '2026-07-15'),
('post-7', 'spot-4', 'customer', 'sarahfong', 'https://i.pravatar.cc/150?img=9', 'https://picsum.photos/seed/reel-7/900/1600', false, 'date night dessert run, so worth the wait', null, array['date_night','aesthetic','desserts'], 690, 19, 30, '2026-07-14'),
('post-8', 'spot-1', 'customer', 'coffee.with.kay', 'https://i.pravatar.cc/150?img=25', 'https://picsum.photos/seed/reel-8/900/1600', false, 'what''s your go-to matcha order? mine is the strawberry one', null, array['cafes','aesthetic'], 2010, 88, 210, '2026-07-13')
on conflict (id) do nothing;

insert into collections (id, user_id, name, description) values
('col-1', 'user-1', 'Best Matcha in the Bay', 'Spots worth the trip for a good matcha.'),
('col-2', 'user-1', 'Cheap Eats Under $10', 'Good food that will not break the bank.')
on conflict (id) do nothing;

insert into collection_spots (collection_id, spot_id) values
('col-1', 'spot-1'),
('col-2', 'spot-5'),
('col-2', 'spot-6')
on conflict do nothing;

insert into saved_spots (user_id, spot_id) values
('user-1', 'spot-1'),
('user-1', 'spot-4')
on conflict do nothing;

-- ── Storage: media bucket for review/post uploads ─────────────────────────
-- Public read (so anyone can view uploaded photos/videos), but you can only
-- upload/delete inside your own folder: media/<your-user-id>/<filename>.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "users upload own media" on storage.objects;
create policy "users upload own media" on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own media" on storage.objects;
create policy "users delete own media" on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Business verification ──────────────────────────────────────────────
-- Claiming an existing spot or creating a new business no longer grants
-- ownership instantly. Applicants submit an ID photo, a business/storefront
-- photo, contact info, and (optionally) a Google Maps listing link for a
-- human admin to review. Ownership is only ever granted by
-- apply_business_verification_approval() below, when an admin flips a
-- pending row's status to 'approved' — never directly by the client.

-- admins: the reviewer allowlist. Add your own user id here once via
-- Supabase Studio; there's no in-app signup path for this table.
create table if not exists admins (user_id text primary key);
alter table admins enable row level security;

drop policy if exists "self check admin" on admins;
-- Lets a client check only whether ITS OWN id is present (to conditionally
-- show the admin review screen) without leaking the full admin list.
create policy "self check admin" on admins for select using (auth.uid()::text = user_id);

create or replace function is_admin() returns boolean as $$
  select exists(select 1 from admins where user_id = auth.uid()::text);
$$ language sql stable;

create table if not exists business_verifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  claim_type text not null check (claim_type in ('claim_existing', 'create_new')),
  existing_spot_id text references spots(id),
  business_name text not null,
  category text,
  is_home_based boolean,
  lat double precision,
  lng double precision,
  address text,
  service_area text,
  price_range text,
  description text,
  photos text[],
  hours jsonb,
  menu jsonb,
  contact_email text not null,
  contact_phone text,
  google_maps_url text,
  id_photo_path text not null,
  business_photo_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint business_verifications_shape_check check (
    (claim_type = 'claim_existing' and existing_spot_id is not null and category is null)
    or
    (claim_type = 'create_new' and category is not null
      and lat is not null and lng is not null and price_range is not null)
  )
);
alter table business_verifications enable row level security;

-- Patch for installs where the table already existed with the earlier,
-- buggy version of this constraint (which also required existing_spot_id
-- is null for create_new — but apply_business_verification_approval()
-- below legitimately backfills existing_spot_id onto a create_new row once
-- it materializes the new spot, so that requirement blocked every approval).
alter table business_verifications drop constraint if exists business_verifications_shape_check;
alter table business_verifications add constraint business_verifications_shape_check check (
  (claim_type = 'claim_existing' and existing_spot_id is not null and category is null)
  or
  (claim_type = 'create_new' and category is not null
    and lat is not null and lng is not null and price_range is not null)
);

drop policy if exists "insert own verification" on business_verifications;
create policy "insert own verification" on business_verifications for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "read own or admin" on business_verifications;
create policy "read own or admin" on business_verifications for select
  using (auth.uid()::text = user_id or is_admin());

-- The admin can update any column here (status, reviewer_note) — the client
-- (reviewVerification) must only ever send { status, reviewer_note }, never
-- a full row, since RLS doesn't restrict which columns change.
drop policy if exists "admin update status" on business_verifications;
create policy "admin update status" on business_verifications for update
  using (is_admin()) with check (is_admin());

-- reviewed_at is set server-side so it's correct whether a status change
-- comes from the in-app admin screen or a direct edit in Supabase Studio.
create or replace function set_verification_reviewed_at() returns trigger as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_verification_reviewed_at on business_verifications;
create trigger trg_verification_reviewed_at before update on business_verifications
  for each row execute function set_verification_reviewed_at();

-- The only place spot ownership is ever granted. security definer so its
-- internal spots writes bypass spots' RLS (the admin invoking the UPDATE is
-- a normal authenticated role, not the table owner). Deliberately a
-- trigger, not a callable RPC: authorization lives once, in the
-- business_verifications update policy above — no separate is_admin() check
-- to remember inside a function body, no "revoke execute from public" to
-- remember either. Function owner (postgres, via the SQL Editor) has
-- BYPASSRLS — if this migration is ever run under a different, non-
-- bypassing role, this trigger will start failing with RLS-denied errors.
create or replace function apply_business_verification_approval() returns trigger as $$
declare
  new_id text;
begin
  if new.claim_type = 'claim_existing' then
    update spots set owner_user_id = new.user_id
      where id = new.existing_spot_id and owner_user_id is null;
    if not found then
      raise exception 'This spot was already claimed by someone else.';
    end if;
  else
    if exists (select 1 from spots where lower(name) = lower(new.business_name)) then
      raise exception 'A business named "%" already exists.', new.business_name;
    end if;
    insert into spots (
      name, category, is_home_based, lat, lng, address, service_area,
      price_range, description, photos, hours, menu, owner_user_id
    ) values (
      new.business_name, new.category, new.is_home_based, new.lat, new.lng,
      new.address, new.service_area, new.price_range, new.description,
      coalesce(new.photos, '{}'), coalesce(new.hours, '[]'), coalesce(new.menu, '[]'),
      new.user_id
    ) returning id into new_id;
    -- Doesn't change status, so the trigger's when-clause below correctly
    -- does not refire on this second update (no infinite loop).
    update business_verifications set existing_spot_id = new_id where id = new.id;
    perform recompute_tea_score(new_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_apply_business_verification_approval on business_verifications;
create trigger trg_apply_business_verification_approval
  after update on business_verifications
  for each row
  when (old.status is distinct from 'approved' and new.status = 'approved')
  execute function apply_business_verification_approval();

-- ── Storage: private bucket for ID / business verification photos ─────────
-- Unlike the public `media` bucket, these are never publicly readable —
-- only the uploader and admins can view them (via signed URLs). ID/business
-- photos are kept indefinitely for now (no auto-delete job); the delete
-- policy below at least makes a manual cleanup pass possible later.
insert into storage.buckets (id, name, public) values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists "own or admin read verification docs" on storage.objects;
create policy "own or admin read verification docs" on storage.objects for select
  using (bucket_id = 'verification-docs' and
    ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

drop policy if exists "users upload own verification docs" on storage.objects;
create policy "users upload own verification docs" on storage.objects for insert
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own or admin delete verification docs" on storage.objects;
create policy "own or admin delete verification docs" on storage.objects for delete
  using (bucket_id = 'verification-docs' and
    ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ── Reports & blocking ──────────────────────────────────────────────────
-- Minimum-viable content moderation: anyone can report a post/review/
-- comment, and block another user to stop seeing their content. Required
-- for App Store review (Guideline 1.2) — see the launch-roadmap plan.

create table if not exists blocked_users (
  blocker_user_id text not null,
  blocked_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id)
);
alter table blocked_users enable row level security;

drop policy if exists "own blocked_users" on blocked_users;
create policy "own blocked_users" on blocked_users for all
  using (auth.uid()::text = blocker_user_id) with check (auth.uid()::text = blocker_user_id);

create table if not exists reports (
  id text primary key default gen_random_uuid()::text,
  reporter_user_id text not null,
  target_type text not null check (target_type in ('post', 'review', 'comment', 'user')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table reports enable row level security;

drop policy if exists "insert own report" on reports;
create policy "insert own report" on reports for insert
  with check (auth.uid()::text = reporter_user_id);

drop policy if exists "read own or admin reports" on reports;
create policy "read own or admin reports" on reports for select
  using (auth.uid()::text = reporter_user_id or is_admin());

drop policy if exists "admin update report" on reports;
create policy "admin update report" on reports for update
  using (is_admin()) with check (is_admin());

-- Extend the existing public-read policies so a blocked author's posts,
-- reviews, and comments become invisible to whoever blocked them — not
-- just filtered client-side, so it can't be bypassed by inspecting
-- network traffic.
drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select using (
  user_id is null or not exists (
    select 1 from blocked_users b
    where b.blocker_user_id = auth.uid()::text and b.blocked_user_id = posts.user_id
  )
);

drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (
  not exists (
    select 1 from blocked_users b
    where b.blocker_user_id = auth.uid()::text and b.blocked_user_id = reviews.user_id
  )
);

drop policy if exists "public read post_comments" on post_comments;
create policy "public read post_comments" on post_comments for select using (
  not exists (
    select 1 from blocked_users b
    where b.blocker_user_id = auth.uid()::text and b.blocked_user_id = post_comments.user_id
  )
);

-- ── Account deletion ────────────────────────────────────────────────────
-- Required for App Store review (Guideline 5.1.1(v)). Deletes everything
-- the caller owns and their auth.users row — always operates on auth.uid()
-- alone (no parameter), so it can only ever delete the caller's own
-- account. security definer because deleting from auth.users needs
-- elevated privilege the client role doesn't have; auth.users' own
-- on-delete-cascade foreign keys clean up auth.identities/sessions/etc.
--
-- Deliberately NOT touched: `spots` a caller owns are un-claimed
-- (owner_user_id set to null) rather than deleted, and `orders` are left
-- as-is — both are the business's records, not solely the deleted user's.
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
  delete from auth.users where id = uid::uuid;
end;
$$ language plpgsql security definer set search_path = public;

-- ════════════════════════════════════════════════════════════════════════
-- Migration 002 (also standalone in migrations/002_*.sql for a database that
-- already has everything above): review/order/profile hardening on top of
-- PRs #3–#5.
-- ════════════════════════════════════════════════════════════════════════

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

-- ── 6. Profiles ─────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id text primary key,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$'),
  constraint profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://')
);
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
