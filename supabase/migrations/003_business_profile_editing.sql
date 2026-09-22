-- 003 — business profile editing (part of #1). Safe to re-run.
--
-- Requires PRs #3–#6 (in particular protect_spot_columns and price_order
-- from #6) to already be applied.
--
-- What this adds:
--   Name, category, address/service-area, phone, Instagram/TikTok links and
--   an accepting-orders toggle for spots (all already editable by the owner
--   under the existing "owner can update own spot" policy — this just adds
--   the columns and exposes them in the app). Per-item sold-out flag on the
--   menu (photo and popular flag already existed). The Call button now
--   works, and a paused shop or a sold-out item is rejected server-side too,
--   not just hidden in the UI.

-- ── Business profile editing (name/address/category/phone/socials/orders) ──
alter table spots add column if not exists phone text;
alter table spots add column if not exists instagram_url text;
alter table spots add column if not exists tiktok_url text;
alter table spots add column if not exists accepting_orders boolean not null default true;

alter table spots drop constraint if exists spots_social_https;
alter table spots add constraint spots_social_https check (
  (instagram_url is null or instagram_url ~ '^https://')
  and (tiktok_url is null or tiktok_url ~ '^https://')
);

-- A paused shop, or a sold-out item, should be rejected server-side too, not
-- just hidden in the UI — otherwise a stale screen or a direct API call can
-- still place an order that can never be fulfilled.
create or replace function price_order() returns trigger as $$
declare
  spot_menu jsonb;
  accepting boolean;
  line jsonb;
  menu_item jsonb;
  priced jsonb := '[]'::jsonb;
  running numeric := 0;
  qty int;
begin
  select menu, accepting_orders into spot_menu, accepting from spots where id = new.spot_id;
  if spot_menu is null then
    raise exception 'Unknown spot.';
  end if;
  if not accepting then
    raise exception 'This business isn''t accepting orders right now.';
  end if;

  for line in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    qty := coalesce((line->>'quantity')::int, 0);
    if qty < 1 or qty > 50 then
      raise exception 'Invalid quantity for %.', coalesce(line->>'name', 'an item');
    end if;
    select m into menu_item from jsonb_array_elements(spot_menu) m
      where m->>'id' = line->>'menuItemId' limit 1;
    if menu_item is null then
      raise exception '% is no longer on the menu.', coalesce(line->>'name', 'An item');
    end if;
    if coalesce((menu_item->>'soldOut')::boolean, false) then
      raise exception '% is sold out.', coalesce(menu_item->>'name', 'That item');
    end if;
    priced := priced || jsonb_build_object(
      'menuItemId', menu_item->>'id',
      'name', menu_item->>'name',
      'price', (menu_item->>'price')::numeric,
      'quantity', qty
    );
    running := running + (menu_item->>'price')::numeric * qty;
  end loop;

  if jsonb_array_length(priced) = 0 then
    raise exception 'Add at least one item to your order.';
  end if;

  new.items := priced;
  new.total := running;
  new.status := 'pending';
  return new;
end;
$$ language plpgsql;
