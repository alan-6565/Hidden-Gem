-- 006 — allow multiple locations of one brand (part of #1). Safe to re-run.
--
-- What this adds:
--   spots_name_unique_idx blocked ANY two spots from sharing a name, even
--   two real locations of the same brand at different addresses. Replaces
--   it with a composite index on (name, address, service_area) — the same
--   name is only rejected when the location also matches, so "Blue Bottle
--   Coffee" can exist on both Main St and Oak Ave, but not twice at the
--   same address.

drop index if exists spots_name_unique_idx;

create unique index if not exists spots_name_location_unique_idx on spots (
  lower(name),
  lower(coalesce(address, '')),
  lower(coalesce(service_area, ''))
);

-- Mirror the same (name, location) comparison in the friendly pre-check —
-- otherwise every second location of a brand would still fail here with a
-- raw "already exists" error before ever reaching the index above.
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
