-- Adds the social graph (follows) and 24h-expiring Stories, needed for the
-- Home "For you / Following" feed and the Stories row + Reels Follow button.
-- Run this once in the Supabase SQL Editor for the project in .env.

-- ── Follows ─────────────────────────────────────────────────────────────
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

-- ── Stories ─────────────────────────────────────────────────────────────
-- Stories reuse the posts table (same author/media/caption shape) rather
-- than a parallel table — a story is just a post with is_story = true.
-- "Disappearing after 24h" is enforced by the app's fetchStories() query
-- filtering on created_at, not by deleting rows (so likes/reports on a
-- story that already expired still resolve to a real row).
alter table posts add column if not exists is_story boolean not null default false;

create index if not exists posts_stories_idx on posts (is_story, created_at desc)
  where is_story = true;
