-- 018 — Admins can edit any business's page. Safe to re-run.
--
-- The app lets admins open the storefront editor and Edit business on any
-- shop (to help an owner, or to maintain the showcase shops), but RLS only
-- let the owner update a spot, so an admin's edits were silently rejected
-- ("Not saved"). The column protections from protect_spot_columns() still
-- apply: nobody can change the owner, score, votes or promotion through the
-- API, admin or not.
drop policy if exists "admin can update any spot" on spots;
create policy "admin can update any spot" on spots for update
  using (is_admin()) with check (is_admin());
