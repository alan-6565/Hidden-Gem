-- 020 — Security and performance cleanup from the Supabase advisors. Safe to re-run.
--
-- No data changes and no change to who can see or do what in the app:
--   * Trigger functions can no longer be called directly through the API
--     (triggers still fire — Postgres doesn't check EXECUTE when a trigger runs).
--   * Signed-in-only functions can no longer be called while signed out.
--     is_admin() and is_username_available() stay open: RLS policies and the
--     sign-up screen need them before there's a session.
--   * Every function pins its search_path.
--   * RLS policies use (select auth.uid()) so it's evaluated once per query,
--     not once per row.
--   * "own X" FOR ALL policies on publicly readable tables become
--     insert/update/delete only — the public read policy already covers select.
--   * Indexes for the 12 unindexed foreign keys; the duplicate profiles index
--     and two orphaned trigger functions (attached to no table) are dropped.

-- ── Orphaned functions ──────────────────────────────────────────────────
-- Hand-made in the SQL Editor at some point and never attached to a trigger.
drop function if exists set_post_author_type();
drop function if exists set_user_identity_fields();

-- ── Pin search_path ─────────────────────────────────────────────────────
alter function apply_comment_defaults() set search_path = public;
alter function apply_review_defaults() set search_path = public;
alter function approximate_point(double precision, double precision, text) set search_path = public;
alter function decrement_post_comment_count() set search_path = public;
alter function decrement_post_like_count() set search_path = public;
alter function decrement_review_like_count() set search_path = public;
alter function decrement_spot_hype_votes() set search_path = public;
alter function guard_order_status_change() set search_path = public;
alter function increment_post_comment_count() set search_path = public;
alter function increment_post_like_count() set search_path = public;
alter function increment_review_like_count() set search_path = public;
alter function increment_spot_hype_votes() set search_path = public;
alter function is_admin() set search_path = public;
alter function price_order() set search_path = public;
alter function protect_notification_fields() set search_path = public;
alter function protect_order_immutable_fields() set search_path = public;
alter function protect_private_location_point() set search_path = public;
alter function protect_review_identity_fields() set search_path = public;
alter function protect_review_reply_fields() set search_path = public;
alter function protect_spot_columns() set search_path = public;
alter function set_order_updated_at() set search_path = public;
alter function set_verification_reviewed_at() set search_path = public;
alter function trg_recompute_tea_score_from_review() set search_path = public;

-- ── Trigger functions: not callable through the API ─────────────────────
revoke execute on function
  apply_business_verification_approval(),
  apply_comment_defaults(),
  apply_review_defaults(),
  decrement_post_comment_count(),
  decrement_post_like_count(),
  decrement_review_like_count(),
  decrement_spot_hype_votes(),
  guard_order_status_change(),
  handle_new_user(),
  hide_home_location(),
  increment_post_comment_count(),
  increment_post_like_count(),
  increment_review_like_count(),
  increment_spot_hype_votes(),
  notify_new_follower(),
  notify_new_order(),
  notify_order_status_change(),
  notify_review_reply(),
  notify_verification_decision(),
  price_order(),
  propagate_profile_changes(),
  protect_notification_fields(),
  protect_order_immutable_fields(),
  protect_private_location_point(),
  protect_review_identity_fields(),
  protect_review_reply_fields(),
  protect_spot_columns(),
  send_push_for_notification(),
  set_order_updated_at(),
  set_post_trusted_fields(),
  set_verification_reviewed_at(),
  trg_recompute_tea_score_from_review()
from public, anon, authenticated;

-- ── Signed-in-only functions ────────────────────────────────────────────
revoke execute on function
  admin_resolve_report(text, text),
  admin_set_spot_removed(text, boolean),
  delete_own_account(),
  ensure_my_profile(),
  register_push_token(text, text),
  unregister_push_token(text)
from public, anon;

grant execute on function
  admin_resolve_report(text, text),
  admin_set_spot_removed(text, boolean),
  delete_own_account(),
  ensure_my_profile(),
  register_push_token(text, text),
  unregister_push_token(text)
to authenticated;

-- ── RLS policies: (select auth.uid()) ───────────────────────────────────
drop policy if exists "self check admin" on admins;
create policy "self check admin" on admins for select
  using ((select auth.uid())::text = user_id);

drop policy if exists "own blocked_users" on blocked_users;
create policy "own blocked_users" on blocked_users for all
  using ((select auth.uid())::text = blocker_user_id)
  with check ((select auth.uid())::text = blocker_user_id);

drop policy if exists "own collections" on collections;
create policy "own collections" on collections for all
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

drop policy if exists "own collection_spots" on collection_spots;
create policy "own collection_spots" on collection_spots for all
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = (select auth.uid())::text))
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = (select auth.uid())::text));

drop policy if exists "own saved_posts" on saved_posts;
create policy "own saved_posts" on saved_posts for all
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

drop policy if exists "own saved_spots" on saved_spots;
create policy "own saved_spots" on saved_spots for all
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

drop policy if exists "read own or admin" on business_verifications;
create policy "read own or admin" on business_verifications for select
  using ((select auth.uid())::text = user_id or is_admin());
drop policy if exists "insert own verification" on business_verifications;
create policy "insert own verification" on business_verifications for insert
  with check ((select auth.uid())::text = user_id);

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select
  using ((select auth.uid())::text = recipient_user_id);
drop policy if exists "mark own notifications read" on notifications;
create policy "mark own notifications read" on notifications for update
  using ((select auth.uid())::text = recipient_user_id)
  with check ((select auth.uid())::text = recipient_user_id);

drop policy if exists "customer insert own order" on orders;
create policy "customer insert own order" on orders for insert
  with check ((select auth.uid())::text = customer_user_id);
drop policy if exists "customer read own order" on orders;
create policy "customer read own order" on orders for select
  using ((select auth.uid())::text = customer_user_id);
drop policy if exists "owner read shop orders" on orders;
create policy "owner read shop orders" on orders for select
  using (exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = (select auth.uid())::text));
drop policy if exists "customer cancel own order" on orders;
create policy "customer cancel own order" on orders for update
  using ((select auth.uid())::text = customer_user_id)
  with check ((select auth.uid())::text = customer_user_id and status = 'cancelled');
drop policy if exists "owner update shop orders" on orders;
create policy "owner update shop orders" on orders for update
  using (exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = (select auth.uid())::text))
  with check (exists (select 1 from spots where spots.id = orders.spot_id and spots.owner_user_id = (select auth.uid())::text));

drop policy if exists "public read post_comments" on post_comments;
create policy "public read post_comments" on post_comments for select
  using (not exists (select 1 from blocked_users b where b.blocker_user_id = (select auth.uid())::text and b.blocked_user_id = post_comments.user_id));
drop policy if exists "insert own post_comments" on post_comments;
create policy "insert own post_comments" on post_comments for insert
  with check ((select auth.uid())::text = user_id);
drop policy if exists "delete own post_comments" on post_comments;
create policy "delete own post_comments" on post_comments for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select
  using (user_id is null or not exists (select 1 from blocked_users b where b.blocker_user_id = (select auth.uid())::text and b.blocked_user_id = posts.user_id));
drop policy if exists "insert own posts" on posts;
create policy "insert own posts" on posts for insert
  with check ((select auth.uid())::text = user_id);
drop policy if exists "delete own posts" on posts;
create policy "delete own posts" on posts for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "insert own profile" on profiles;
create policy "insert own profile" on profiles for insert
  with check ((select auth.uid())::text = user_id);
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

drop policy if exists "read own push_tokens" on push_tokens;
create policy "read own push_tokens" on push_tokens for select
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own report" on reports;
create policy "insert own report" on reports for insert
  with check ((select auth.uid())::text = reporter_user_id);
drop policy if exists "read own or admin reports" on reports;
create policy "read own or admin reports" on reports for select
  using ((select auth.uid())::text = reporter_user_id or is_admin());

drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select
  using (not exists (select 1 from blocked_users b where b.blocker_user_id = (select auth.uid())::text and b.blocked_user_id = reviews.user_id));
drop policy if exists "insert own reviews" on reviews;
create policy "insert own reviews" on reviews for insert
  with check (
    (select auth.uid())::text = user_id
    and not exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = (select auth.uid())::text)
  );
drop policy if exists "update own reviews" on reviews;
create policy "update own reviews" on reviews for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
drop policy if exists "owner reply to review" on reviews;
create policy "owner reply to review" on reviews for update
  using (exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = (select auth.uid())::text))
  with check (exists (select 1 from spots where spots.id = reviews.spot_id and spots.owner_user_id = (select auth.uid())::text));
drop policy if exists "delete own reviews" on reviews;
create policy "delete own reviews" on reviews for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "owner, admin or accepted customer read" on spot_private_locations;
create policy "owner, admin or accepted customer read" on spot_private_locations for select using (
  is_admin()
  or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = (select auth.uid())::text)
  or exists (
    select 1 from orders o
    where o.spot_id = spot_private_locations.spot_id
      and o.customer_user_id = (select auth.uid())::text
      and o.status in ('accepted', 'ready')
  )
);
drop policy if exists "owner or admin update pickup address" on spot_private_locations;
create policy "owner or admin update pickup address" on spot_private_locations for update
  using (is_admin() or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = (select auth.uid())::text))
  with check (is_admin() or exists (select 1 from spots s where s.id = spot_id and s.owner_user_id = (select auth.uid())::text));

drop policy if exists "public read spots" on spots;
create policy "public read spots" on spots for select using (
  (removed_at is null and (owner_user_id is null or published = true or owner_user_id = (select auth.uid())::text))
  or is_admin()
);
drop policy if exists "owner can update own spot" on spots;
create policy "owner can update own spot" on spots for update
  using ((select auth.uid())::text = owner_user_id)
  with check ((select auth.uid())::text = owner_user_id);

-- ── Publicly readable tables: split "own X" FOR ALL ─────────────────────
-- Each already has a "public read" policy, so the select half of FOR ALL
-- was a second policy Postgres had to check on every read.
drop policy if exists "own business_follows" on business_follows;
drop policy if exists "insert own business_follows" on business_follows;
drop policy if exists "update own business_follows" on business_follows;
drop policy if exists "delete own business_follows" on business_follows;
create policy "insert own business_follows" on business_follows for insert
  with check ((select auth.uid())::text = user_id);
create policy "update own business_follows" on business_follows for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
create policy "delete own business_follows" on business_follows for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "manage own follows" on follows;
drop policy if exists "insert own follows" on follows;
drop policy if exists "update own follows" on follows;
drop policy if exists "delete own follows" on follows;
create policy "insert own follows" on follows for insert
  with check ((select auth.uid())::text = follower_id);
create policy "update own follows" on follows for update
  using ((select auth.uid())::text = follower_id)
  with check ((select auth.uid())::text = follower_id);
create policy "delete own follows" on follows for delete
  using ((select auth.uid())::text = follower_id);

drop policy if exists "own post_likes" on post_likes;
drop policy if exists "insert own post_likes" on post_likes;
drop policy if exists "update own post_likes" on post_likes;
drop policy if exists "delete own post_likes" on post_likes;
create policy "insert own post_likes" on post_likes for insert
  with check ((select auth.uid())::text = user_id);
create policy "update own post_likes" on post_likes for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
create policy "delete own post_likes" on post_likes for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "own review_likes" on review_likes;
drop policy if exists "insert own review_likes" on review_likes;
drop policy if exists "update own review_likes" on review_likes;
drop policy if exists "delete own review_likes" on review_likes;
create policy "insert own review_likes" on review_likes for insert
  with check ((select auth.uid())::text = user_id);
create policy "update own review_likes" on review_likes for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
create policy "delete own review_likes" on review_likes for delete
  using ((select auth.uid())::text = user_id);

drop policy if exists "own spot_hype_votes" on spot_hype_votes;
drop policy if exists "insert own spot_hype_votes" on spot_hype_votes;
drop policy if exists "update own spot_hype_votes" on spot_hype_votes;
drop policy if exists "delete own spot_hype_votes" on spot_hype_votes;
create policy "insert own spot_hype_votes" on spot_hype_votes for insert
  with check ((select auth.uid())::text = user_id);
create policy "update own spot_hype_votes" on spot_hype_votes for update
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);
create policy "delete own spot_hype_votes" on spot_hype_votes for delete
  using ((select auth.uid())::text = user_id);

-- ── Foreign key indexes ─────────────────────────────────────────────────
create index if not exists business_follows_spot_id_idx on business_follows (spot_id);
create index if not exists business_verifications_existing_spot_id_idx on business_verifications (existing_spot_id);
create index if not exists collection_spots_spot_id_idx on collection_spots (spot_id);
create index if not exists orders_spot_id_idx on orders (spot_id);
create index if not exists post_comments_post_id_idx on post_comments (post_id);
create index if not exists post_likes_post_id_idx on post_likes (post_id);
create index if not exists posts_spot_id_idx on posts (spot_id);
create index if not exists review_likes_review_id_idx on review_likes (review_id);
create index if not exists reviews_spot_id_idx on reviews (spot_id);
create index if not exists saved_posts_post_id_idx on saved_posts (post_id);
create index if not exists saved_spots_spot_id_idx on saved_spots (spot_id);
create index if not exists spot_hype_votes_spot_id_idx on spot_hype_votes (spot_id);

-- ── Duplicate index ─────────────────────────────────────────────────────
-- Same column and uniqueness as profiles_pkey.
drop index if exists profiles_user_id_unique_idx;
