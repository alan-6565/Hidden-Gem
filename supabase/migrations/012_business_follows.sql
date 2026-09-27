-- 012 — business_follows: lets a user follow a business (separate from the
-- existing `follows` table, which is user-to-user). Backs the Follow button
-- on the redesigned public business profile. Safe to re-run.
create table if not exists business_follows (
  user_id text not null,
  spot_id text not null references spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

alter table business_follows enable row level security;

-- Follower counts are shown on the public business profile, so reads are
-- open — same as saved_spots/follows.
drop policy if exists "public read business_follows" on business_follows;
create policy "public read business_follows" on business_follows for select using (true);

drop policy if exists "own business_follows" on business_follows;
create policy "own business_follows" on business_follows for all
  using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
