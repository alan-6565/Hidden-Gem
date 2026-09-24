-- 008 — block ordering from your own business (part of #1). Safe to re-run.
--
-- What this adds:
--   A business owner could place — and then approve — an order at their own
--   spot. The app already hides the "Order ahead" button on your own spot
--   page (the same pattern already used for "you can't review your own
--   spot"), but the client-side hide isn't enough on its own — this adds
--   the matching server-side check in price_order(), so a direct API call
--   can't do it either.

create or replace function price_order() returns trigger as $$
declare
  spot_menu jsonb;
  accepting boolean;
  owner_id text;
  line jsonb;
  menu_item jsonb;
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
