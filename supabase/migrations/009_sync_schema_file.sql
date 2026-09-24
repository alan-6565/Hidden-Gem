-- 009 — sync schema.sql's fresh-install path with migrations 004–006.
-- Safe to re-run. A no-op on a database that already ran 004, 005 and 006 in
-- order (this project's live database has) — it exists so a BRAND NEW
-- install run from schema.sql alone doesn't silently miss those three.
--
-- What happened: PRs #6's migration 002 appended its changes as a new block
-- at the end of schema.sql, but PRs #9 (prep time), #12 (account-deletion
-- cleanup) and #13 (multi-location names) instead edited schema.sql's
-- original sections in place. That's the more readable end-state for a
-- fresh-install file, but the edit didn't quite happen for #12 and #13:
-- schema.sql still had the single-column name index and the deletion
-- function without the storage cleanup. #9's prep_time column was missing
-- from schema.sql entirely.

-- ── #9: prep time ─────────────────────────────────────────────────────────
alter table spots add column if not exists prep_time text;

-- ── #12: account deletion also removes uploaded files and order PII ─────
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

  update orders set note = null, pickup_time = null where customer_user_id = uid;

  delete from storage.objects
    where bucket_id in ('media', 'verification-docs')
      and (storage.foldername(name))[1] = uid;

  delete from profiles where user_id = uid;
  delete from auth.users where id = uid::uuid;
end;
$$ language plpgsql security definer set search_path = public;

-- ── #13: allow multiple locations of one brand ───────────────────────────
drop index if exists spots_name_unique_idx;

create unique index if not exists spots_name_location_unique_idx on spots (
  lower(name),
  lower(coalesce(address, '')),
  lower(coalesce(service_area, ''))
);

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
    if exists (
      select 1 from spots
      where lower(name) = lower(new.business_name)
        and lower(coalesce(address, '')) = lower(coalesce(new.address, ''))
        and lower(coalesce(service_area, '')) = lower(coalesce(new.service_area, ''))
    ) then
      raise exception 'A business named "%" already exists at this location.', new.business_name;
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
    update business_verifications set existing_spot_id = new_id where id = new.id;
    perform recompute_tea_score(new_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
