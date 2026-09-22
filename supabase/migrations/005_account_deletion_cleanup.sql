-- 005 — account deletion cleanup (part of #1). Safe to re-run.
--
-- What this adds:
--   delete_own_account() only ever deleted database rows — uploaded files
--   (ID photos, business verification photos, post/review media) live in
--   Storage and were never cleaned up, so a government ID photo could sit
--   in the verification-docs bucket forever after the account was gone.
--   This also clears the free-text note/pickup-time on the user's past
--   orders, since those can hold arbitrary personal text; orders aren't
--   deleted outright, since the business still has a legitimate record of
--   what was ordered and when.

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

  -- Uploaded files live in Storage, not the tables above, so the deletes
  -- there never touched them. Both buckets are foldered by uploader id
  -- (storage.foldername(name))[1] = user_id), same convention their RLS
  -- policies already use.
  delete from storage.objects
    where bucket_id in ('media', 'verification-docs')
      and (storage.foldername(name))[1] = uid;

  delete from profiles where user_id = uid;
  delete from auth.users where id = uid::uuid;
end;
$$ language plpgsql security definer set search_path = public;
