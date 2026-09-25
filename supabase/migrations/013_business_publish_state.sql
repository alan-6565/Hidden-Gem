-- 013 — Draft/Live publishing for businesses. A newly created business
-- (create_new claim, approved) starts as a private Draft the owner can
-- preview and edit; it only becomes publicly visible once they explicitly
-- publish it. Safe to re-run.
--
-- Sequencing matters here: `add column ... default true` backfills every
-- EXISTING spot (including ones claimed via claim_existing, which were
-- already public and shouldn't suddenly disappear) to published = true,
-- and only afterwards do we flip the column default to false so *future*
-- inserts (new businesses created via apply_business_verification_approval)
-- start as drafts. Running this twice is harmless — the second run's
-- "add column if not exists" is a no-op, and "set default" is idempotent.
alter table spots add column if not exists published boolean not null default true;
alter table spots alter column published set default false;

-- Unclaimed community listings (owner_user_id is null) stay public
-- regardless of `published` — that flag only ever applies to a spot that
-- has an owner. An owner can always see their own spot, published or not,
-- so they can preview a draft before publishing it.
drop policy if exists "public read spots" on spots;
create policy "public read spots" on spots for select using (
  owner_user_id is null
  or published = true
  or owner_user_id = auth.uid()::text
);
