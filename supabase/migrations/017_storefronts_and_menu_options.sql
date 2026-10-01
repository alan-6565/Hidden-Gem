-- 017 — Custom storefronts and menu options. Safe to re-run.
--
-- Storefronts: each business can theme its page (colors, fonts, background,
-- hero, decorations). `storefront` is what customers see; the owner edits
-- `storefront_draft` and publishes by copying it over, so customers never
-- see a half-finished design. Both are free-form jsonb that the app fills
-- with defaults — see src/types/storefront.ts for the shape.
--
-- Menu v2: items can now carry a description, a section, option groups
-- (size, milk, add-ons — each choice adds to the price) and "sold out
-- today" (soldOutUntil). Sections live in `menu_sections` so their order is
-- the owner's, not alphabetical.

alter table spots add column if not exists storefront jsonb;
alter table spots add column if not exists storefront_draft jsonb;
alter table spots add column if not exists menu_sections jsonb not null default '[]';

-- Replaces 008's price_order(). Same checks (open for orders, no ordering
-- from your own business, valid quantity, item still on the menu, not sold
-- out) plus:
--   * "sold out today": soldOutUntil in the future counts as sold out
--   * options: every chosen option must exist on that item; required groups
--     need a choice; single-choice groups allow only one; each choice's
--     price is added server-side, so a client can't change what it costs
create or replace function price_order() returns trigger as $$
declare
  spot_menu jsonb;
  accepting boolean;
  owner_id text;
  line jsonb;
  menu_item jsonb;
  grp jsonb;
  chosen jsonb;
  choice jsonb;
  picked jsonb;
  picked_count int;
  unit numeric;
  priced_options jsonb;
  priced jsonb := '[]'::jsonb;
  running numeric := 0;
  qty int;
begin
  select menu, accepting_orders, owner_user_id into spot_menu, accepting, owner_id
    from spots where id = new.spot_id;
  if spot_menu is null then
    raise exception 'Unknown spot.';
  end if;
  if not accepting then
    raise exception 'This business isn''t accepting orders right now.';
  end if;
  if owner_id is not null and owner_id = new.customer_user_id then
    raise exception 'You can''t order from your own business.';
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
    if coalesce((menu_item->>'soldOut')::boolean, false)
       or (menu_item->>'soldOutUntil' is not null and (menu_item->>'soldOutUntil')::timestamptz > now()) then
      raise exception '% is sold out.', coalesce(menu_item->>'name', 'That item');
    end if;

    unit := (menu_item->>'price')::numeric;
    priced_options := '[]'::jsonb;
    chosen := coalesce(line->'options', '[]'::jsonb);

    -- Every chosen option must belong to this item.
    for picked in select * from jsonb_array_elements(chosen) loop
      select g into grp from jsonb_array_elements(coalesce(menu_item->'options', '[]'::jsonb)) g
        where g->>'id' = picked->>'groupId' limit 1;
      if grp is null then
        raise exception 'An option on % is no longer available.', menu_item->>'name';
      end if;
      select c into choice from jsonb_array_elements(grp->'choices') c
        where c->>'id' = picked->>'choiceId' limit 1;
      if choice is null then
        raise exception 'An option on % is no longer available.', menu_item->>'name';
      end if;
      unit := unit + coalesce((choice->>'price')::numeric, 0);
      priced_options := priced_options || jsonb_build_object(
        'groupId', grp->>'id',
        'choiceId', choice->>'id',
        'name', choice->>'name',
        'price', coalesce((choice->>'price')::numeric, 0)
      );
    end loop;

    -- Required groups need a choice; single-choice groups allow only one.
    for grp in select * from jsonb_array_elements(coalesce(menu_item->'options', '[]'::jsonb)) loop
      select count(*) into picked_count from jsonb_array_elements(chosen) p
        where p->>'groupId' = grp->>'id';
      if coalesce((grp->>'required')::boolean, false) and picked_count = 0 then
        raise exception 'Choose a % for %.', lower(grp->>'name'), menu_item->>'name';
      end if;
      if not coalesce((grp->>'multiple')::boolean, false) and picked_count > 1 then
        raise exception 'Choose only one % for %.', lower(grp->>'name'), menu_item->>'name';
      end if;
    end loop;

    priced := priced || jsonb_build_object(
      'menuItemId', menu_item->>'id',
      'name', menu_item->>'name',
      'price', unit,
      'quantity', qty,
      'options', priced_options
    );
    running := running + unit * qty;
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
