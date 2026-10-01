-- 019 — Keep home sellers' exact location private (#37). Safe to re-run.
--
-- Every phone downloads spots.lat/lng, so for a home-based business the map
-- pin was the seller's house. Now:
--   * spots.lat/lng of a home-based spot is an approximate point (~0.5 mi
--     grid cell, plus a fixed per-spot nudge so neighbours don't stack).
--   * The exact point and the pickup address live in spot_private_locations,
--     readable only by the owner, admins, and customers whose order at that
--     spot has been accepted (accepted / ready).
-- A trigger does the swap on every insert/update, so it holds whether the
-- spot comes from an approved application, a claim, or Edit business.

create table if not exists spot_private_locations (
  -- Deferred so the BEFORE INSERT trigger on spots can write here first.
  spot_id text primary key references spots(id) on delete cascade deferrable initially deferred,
  lat double precision not null,
  lng double precision not null,
  pickup_address text,
  updated_at timestamptz not null default now()
);

alter table spot_private_locations enable row level security;

drop policy if exists "owner, admin or accepted customer read" on spot_private_locations;
create policy "owner, admin or accepted customer read" on spot_private_locations for select using (
  is_admin()
  or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = auth.uid()::text)
  or exists (
    select 1 from orders o
    where o.spot_id = spot_private_locations.spot_id
      and o.customer_user_id = auth.uid()::text
      and o.status in ('accepted', 'ready')
  )
);

-- Owners (and admins) can set the pickup address; the point itself is only
-- ever written by the trigger below.
drop policy if exists "owner or admin update pickup address" on spot_private_locations;
create policy "owner or admin update pickup address" on spot_private_locations for update
  using (is_admin() or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = auth.uid()::text))
  with check (is_admin() or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = auth.uid()::text));

create or replace function protect_private_location_point() returns trigger as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.lat is distinct from old.lat or new.lng is distinct from old.lng or new.spot_id is distinct from old.spot_id) then
    raise exception 'That field can''t be edited directly.';
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_private_location_point on spot_private_locations;
create trigger trg_protect_private_location_point before update on spot_private_locations
  for each row execute function protect_private_location_point();

-- Approximate point: centre of a ~0.5 mi grid cell, nudged by up to ±30%
-- of a cell based on the spot id (never on the real location).
create or replace function approximate_point(lat double precision, lng double precision, seed text)
returns table (approx_lat double precision, approx_lng double precision) as $$
declare
  cell_lat double precision := 0.0075;
  cell_lng double precision := 0.0075 / greatest(cos(radians(lat)), 0.2);
  h text := md5(seed);
  nudge_lat double precision := (('x' || substr(h, 1, 4))::bit(16)::int / 65535.0 - 0.5) * 0.6;
  nudge_lng double precision := (('x' || substr(h, 5, 4))::bit(16)::int / 65535.0 - 0.5) * 0.6;
begin
  approx_lat := (floor(lat / cell_lat) + 0.5 + nudge_lat) * cell_lat;
  approx_lng := (floor(lng / cell_lng) + 0.5 + nudge_lng) * cell_lng;
  return next;
end;
$$ language plpgsql immutable;

create or replace function hide_home_location() returns trigger as $$
declare
  exact_lat double precision;
  exact_lng double precision;
  moved boolean;
begin
  -- The backfill below moves points itself.
  if current_setting('kuppio.skip_home_location', true) = 'on' then
    return new;
  end if;
  moved := tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng;
  if new.is_home_based then
    if moved or not old.is_home_based then
      -- A new point (or a storefront switching to home-based): its
      -- lat/lng is exact, so store it privately and publish an approximation.
      exact_lat := new.lat;
      exact_lng := new.lng;
      insert into spot_private_locations (spot_id, lat, lng, pickup_address)
        values (new.id, exact_lat, exact_lng, coalesce(new.address, case when tg_op = 'UPDATE' then old.address end))
        on conflict (spot_id) do update set lat = excluded.lat, lng = excluded.lng,
          pickup_address = coalesce(excluded.pickup_address, spot_private_locations.pickup_address),
          updated_at = now();
      select approx_lat, approx_lng into new.lat, new.lng from approximate_point(exact_lat, exact_lng, new.id);
    end if;
    -- The street address is never public for a home business.
    new.address := null;
  elsif tg_op = 'UPDATE' and old.is_home_based and not moved then
    -- Back to a public storefront: restore the exact point.
    select lat, lng into exact_lat, exact_lng from spot_private_locations where spot_id = new.id;
    if found then
      new.lat := exact_lat;
      new.lng := exact_lng;
    end if;
    delete from spot_private_locations where spot_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_hide_home_location on spots;
create trigger trg_hide_home_location before insert or update on spots
  for each row execute function hide_home_location();

-- Backfill: home-based spots that already exist.
select set_config('kuppio.skip_home_location', 'on', false);
insert into spot_private_locations (spot_id, lat, lng)
  select id, lat, lng from spots where is_home_based
  on conflict (spot_id) do nothing;
update spots s set lat = a.approx_lat, lng = a.approx_lng
  from spot_private_locations p, approximate_point(p.lat, p.lng, p.spot_id) a
  where p.spot_id = s.id and s.is_home_based
    and (s.lat, s.lng) = (p.lat, p.lng);
select set_config('kuppio.skip_home_location', 'off', false);
