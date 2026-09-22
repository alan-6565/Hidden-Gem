-- 004 — prep time (part of #1). Safe to re-run.
--
-- Requires PR #8's migration (003_business_profile_editing.sql) to already
-- be applied.
--
-- What this adds:
--   A free-text prep time field for spots (e.g. "15-20 min"), editable by
--   the owner under the existing "owner can update own spot" policy — this
--   just adds the column and exposes it in the app. Shown to customers under
--   the "Order ahead" button.

alter table spots add column if not exists prep_time text;
