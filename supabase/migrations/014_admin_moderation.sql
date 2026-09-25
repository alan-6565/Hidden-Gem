-- 014 — Admin moderation: a working reports queue and listing removal.
-- Safe to re-run.
--
-- Reports could be filed since the first moderation pass, but nothing could
-- act on them except the SQL Editor. This adds:
--   * 'spot' as a reportable target (fake / closed / duplicate listings)
--   * who handled a report and what they did
--   * spots.removed_at — a soft delete for listings. A hard delete would
--     cascade away order history and trip business_verifications'
--     existing_spot_id foreign key, and a mistaken removal should be
--     reversible (set removed_at back to null).
--   * admin_resolve_report() / admin_set_spot_removed() — the only way to
--     act on reports, so no per-table admin delete policies are needed.

alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('post', 'review', 'comment', 'user', 'spot'));
alter table reports add column if not exists resolved_by text;
alter table reports add column if not exists action_taken text
  check (action_taken in ('removed', 'resolved', 'dismissed'));

create index if not exists reports_open_idx on reports (created_at desc) where status = 'open';

alter table spots add column if not exists removed_at timestamptz;

-- A removed listing disappears for everyone, owner included — only admins
-- can still load it (to review a report or restore it).
drop policy if exists "public read spots" on spots;
create policy "public read spots" on spots for select using (
  (removed_at is null and (
    owner_user_id is null
    or published = true
    or owner_user_id = auth.uid()::text
  ))
  or is_admin()
);

-- Deletes a public Storage file given its public URL, if it's one of ours.
-- Rows are deleted directly, same as delete_own_account() does. Best-effort:
-- newer Supabase projects can refuse direct storage.objects deletes, and an
-- orphaned file must never block taking content down.
create or replace function delete_media_by_url(url text) returns void as $$
declare
  object_name text;
begin
  if url is null then return; end if;
  object_name := substring(url from '/storage/v1/object/public/media/(.+)$');
  if object_name is null then return; end if;
  begin
    delete from storage.objects where bucket_id = 'media' and name = object_name;
  exception when others then
    raise notice 'Could not delete media %: %', object_name, sqlerrm;
  end;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function delete_media_by_url(text) from public, anon, authenticated;

create or replace function admin_set_spot_removed(spot_id_param text, removed boolean)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Only admins can remove listings';
  end if;
  update spots
    set removed_at = case when removed then now() else null end
    where id = spot_id_param;
  if not found then
    raise exception 'Listing not found';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- action: 'remove'  — delete the post/review/comment (or hide the listing)
--                     and mark the report resolved
--         'resolve' — handled some other way (e.g. contacted the user)
--         'dismiss' — nothing wrong with it
-- Every other open report on the same target is closed the same way, so
-- five people reporting one post doesn't mean five trips through the queue.
create or replace function admin_resolve_report(report_id_param text, action text)
returns void as $$
declare
  r reports%rowtype;
  media text;
  photo_url text;
begin
  if not is_admin() then
    raise exception 'Only admins can act on reports';
  end if;
  if action not in ('remove', 'resolve', 'dismiss') then
    raise exception 'Unknown action %', action;
  end if;

  select * into r from reports where id = report_id_param;
  if not found then
    raise exception 'Report not found';
  end if;

  if action = 'remove' then
    if r.target_type = 'post' then
      delete from posts where id = r.target_id returning media_url into media;
      perform delete_media_by_url(media);
    elsif r.target_type = 'review' then
      delete from reviews where id = r.target_id returning photo into photo_url;
      perform delete_media_by_url(photo_url);
    elsif r.target_type = 'comment' then
      delete from post_comments where id = r.target_id;
    elsif r.target_type = 'spot' then
      update spots set removed_at = now() where id = r.target_id;
    else
      raise exception 'There is no content to remove for a % report', r.target_type;
    end if;
  end if;

  update reports
    set status = case when action = 'dismiss' then 'dismissed' else 'resolved' end,
        action_taken = case action
          when 'remove' then 'removed'
          when 'resolve' then 'resolved'
          else 'dismissed'
        end,
        resolved_at = now(),
        resolved_by = auth.uid()::text
    where target_type = r.target_type
      and target_id = r.target_id
      and status = 'open';
end;
$$ language plpgsql security definer set search_path = public;
