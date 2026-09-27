-- 016 — Pick your username at sign-up. Safe to re-run.
--
-- Profiles have always been created by a trigger on auth.users with a random
-- handle (kuppio_a1b2c3). The sign-up screen now asks for a username and
-- passes it as user metadata; the trigger uses it when it's valid and free,
-- and falls back to the random handle otherwise (e.g. someone took it in the
-- seconds between the availability check and the tap, or a social sign-in
-- that never had a username). A user can still change it later in Edit
-- Profile.

create or replace function handle_new_user() returns trigger as $$
declare
  requested text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
begin
  if requested ~ '^[a-z0-9_.]{3,20}$' then
    begin
      insert into profiles (user_id, username) values (new.id::text, requested);
    exception when unique_violation then
      null; -- taken; ensure_profile below assigns a random handle
    end;
  end if;
  perform ensure_profile(new.id::text);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- For the sign-up screen, before an account exists (so callable by anon).
-- Usernames are already public on every review and post, so this reveals
-- nothing new.
create or replace function is_username_available(username_param text) returns boolean as $$
  select lower(trim(username_param)) ~ '^[a-z0-9_.]{3,20}$'
    and not exists (select 1 from profiles where username = lower(trim(username_param)));
$$ language sql stable security definer set search_path = public;

grant execute on function is_username_available(text) to anon, authenticated;
