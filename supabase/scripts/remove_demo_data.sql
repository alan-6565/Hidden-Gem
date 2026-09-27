-- Removes the seed/demo content before launch. NOT a migration — run it
-- once, by hand, in the Supabase SQL Editor.
--
-- Step 1: run only the PREVIEW block and check every row it lists is fake.
-- Step 2: run the DELETE block. It's one transaction, so it either all
--         happens or none of it does.
--
-- What counts as demo data (matches what was in the database 2026-09-26):
--   * spots whose first photo is a picsum.photos stock image
--   * posts with no author account (user_id is null) — every seed post
--   * reviews from the fake seed users 'user-1' … 'user-N'
-- Plus anything hanging off those rows (orders, saves, likes, comments,
-- follows, votes cascade automatically; verifications and reports don't).
--
-- Test ACCOUNTS (kuppio_tester, testcustomer, …) and anything they made,
-- like the "Randy" test business, are left alone — delete those from the
-- app (Settings → Delete account) so storage files get cleaned up too.

-- ── PREVIEW ────────────────────────────────────────────────────────────
select 'spot' as kind, id, name as label from spots
  where photos[1] like '%picsum.photos%'
union all
select 'post', id, author_name || ': ' || left(coalesce(caption, ''), 40) from posts
  where user_id is null
union all
select 'review', id, user_name || ': ' || left(body, 40) from reviews
  where user_id ~ '^user-[0-9]+$'
order by kind, label;

-- ── DELETE ─────────────────────────────────────────────────────────────
begin;

create temp table demo_spots on commit drop as
  select id from spots where photos[1] like '%picsum.photos%';

-- Seed posts/reviews first (some point at real spots' ids too).
delete from posts where user_id is null;
delete from reviews where user_id ~ '^user-[0-9]+$';

-- business_verifications.existing_spot_id has no cascade.
delete from business_verifications where existing_spot_id in (select id from demo_spots);
delete from spots where id in (select id from demo_spots);

-- Reports pointing at content that no longer exists.
delete from reports r where
  (r.target_type = 'post' and not exists (select 1 from posts p where p.id = r.target_id))
  or (r.target_type = 'review' and not exists (select 1 from reviews v where v.id = r.target_id))
  or (r.target_type = 'comment' and not exists (select 1 from post_comments c where c.id = r.target_id))
  or (r.target_type = 'spot' and not exists (select 1 from spots s where s.id = r.target_id));

commit;
