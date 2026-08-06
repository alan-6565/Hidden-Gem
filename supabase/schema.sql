-- Where's the Tea? — schema + seed data
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).
--
-- NOTE ON SECURITY: this app doesn't have real user accounts yet (see project notes).
-- RLS is enabled with permissive policies so the anon client key can read/write freely.
-- Once real auth is added, these policies should be tightened to scope writes to auth.uid().

create extension if not exists pgcrypto;

-- ── Spots ───────────────────────────────────────────────────────────────
create table if not exists spots (
  id text primary key,
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
  spot_id text not null references spots(id) on delete cascade,
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
  created_at timestamptz not null default now()
);

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

drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
drop policy if exists "public write reviews" on reviews;
create policy "public write reviews" on reviews for insert with check (true);

drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select using (true);
drop policy if exists "public write posts" on posts;
create policy "public write posts" on posts for insert with check (true);

drop policy if exists "public read collections" on collections;
create policy "public read collections" on collections for select using (true);
drop policy if exists "public write collections" on collections;
create policy "public write collections" on collections for all using (true) with check (true);

drop policy if exists "public read collection_spots" on collection_spots;
create policy "public read collection_spots" on collection_spots for select using (true);
drop policy if exists "public write collection_spots" on collection_spots;
create policy "public write collection_spots" on collection_spots for all using (true) with check (true);

drop policy if exists "public read saved_spots" on saved_spots;
create policy "public read saved_spots" on saved_spots for select using (true);
drop policy if exists "public write saved_spots" on saved_spots;
create policy "public write saved_spots" on saved_spots for all using (true) with check (true);

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
