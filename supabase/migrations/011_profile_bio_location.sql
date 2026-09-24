-- 011 — bio and location on profiles (part of #1's profile redesign). Safe
-- to re-run.
--
-- What this adds:
--   The redesigned personal profile screen shows a short bio and a location
--   line under the username (like most social profiles), neither of which
--   existed on the profiles table. Both are optional and small — this isn't
--   free-text about a business (that's a spot's own description/address),
--   just a personal one-liner and a place name a user types themselves.

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists location text;

alter table profiles drop constraint if exists profiles_bio_length;
alter table profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 150);

alter table profiles drop constraint if exists profiles_location_length;
alter table profiles add constraint profiles_location_length check (location is null or char_length(location) <= 60);
