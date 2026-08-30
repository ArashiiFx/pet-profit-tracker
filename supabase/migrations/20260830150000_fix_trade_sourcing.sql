-- The app lets a trade be sourced either from a purchase directly, or from an
-- existing inventory item (chained trades). The original schema only allowed
-- purchase_id, so bring the schema in line with real usage.

ALTER TABLE public.trades ALTER COLUMN purchase_id DROP NOT NULL;
ALTER TABLE public.trades ADD COLUMN source_inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;
ALTER TABLE public.trades ADD CONSTRAINT trades_source_required
  CHECK (purchase_id IS NOT NULL OR source_inventory_id IS NOT NULL);

CREATE INDEX idx_trades_source_inventory ON public.trades(source_inventory_id);

-- Replace create_trade: now optionally deducts from a source inventory item.
DROP FUNCTION IF EXISTS public.create_trade(UUID, TEXT, DATE, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_trade(
  p_purchase_id UUID, p_source_inventory_id UUID, p_source_quantity INTEGER,
  p_traded_item TEXT, p_trade_date DATE, p_notes TEXT, p_pets JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_trade UUID; v_pet JSONB; v_src public.inventory; v_remaining INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_source_inventory_id IS NOT NULL THEN
    SELECT * INTO v_src FROM public.inventory WHERE id = p_source_inventory_id AND user_id = v_uid FOR UPDATE;
    IF NOT FOUND OR v_src.status <> 'available' THEN
      RAISE EXCEPTION 'Source inventory item is not available';
    END IF;
    IF p_source_quantity IS NULL OR p_source_quantity <= 0 OR p_source_quantity > v_src.quantity THEN
      RAISE EXCEPTION 'You only have % of this pet available.', v_src.quantity;
    END IF;
  ELSIF p_purchase_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE id = p_purchase_id AND user_id = v_uid) THEN
      RAISE EXCEPTION 'Purchase not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Select a source item';
  END IF;

  IF jsonb_array_length(coalesce(p_pets,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Add at least one received pet';
  END IF;

  INSERT INTO public.trades(user_id, purchase_id, source_inventory_id, traded_item, trade_date, notes)
  VALUES (v_uid, p_purchase_id, p_source_inventory_id, trim(p_traded_item), p_trade_date, p_notes)
  RETURNING id INTO v_trade;

  IF p_source_inventory_id IS NOT NULL THEN
    v_remaining := v_src.quantity - p_source_quantity;
    IF v_remaining <= 0 THEN
      DELETE FROM public.inventory WHERE id = v_src.id;
    ELSE
      UPDATE public.inventory SET quantity = v_remaining WHERE id = v_src.id;
    END IF;
  END IF;

  FOR v_pet IN SELECT * FROM jsonb_array_elements(p_pets) LOOP
    PERFORM public.add_stock(
      v_pet->>'pet_name', v_pet->>'username', (v_pet->>'quantity')::int,
      'trade', NULL, v_trade, NULL);
  END LOOP;
  RETURN v_trade;
END; $$;

REVOKE ALL ON FUNCTION public.create_trade(UUID,UUID,INTEGER,TEXT,DATE,TEXT,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trade(UUID,UUID,INTEGER,TEXT,DATE,TEXT,JSONB) TO authenticated;

-- seed_demo_data must call the new create_trade signature
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_purchase UUID; v_trade UUID; v_inv UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Demo data can only be loaded into an empty workspace';
  END IF;

  INSERT INTO public.accounts(user_id, username, notes) VALUES (v_uid, 'Account123', 'Main trading account')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.purchases(user_id, game, buy_item, buy_price, currency, purchase_date)
  VALUES (v_uid, 'ADM', 'Owl', 815000, 'IDR', DATE '2026-08-25') RETURNING id INTO v_purchase;

  SELECT public.create_trade(v_purchase, NULL, NULL, 'Owl', DATE '2026-08-26', NULL, '[
    {"pet_name":"Toasty Red Panda","quantity":3,"username":"Account123"},
    {"pet_name":"Golden Mummy Cat","quantity":2,"username":"Account123"},
    {"pet_name":"Munchkin","quantity":1,"username":"Account123"},
    {"pet_name":"Polar Bear","quantity":1,"username":"Account123"},
    {"pet_name":"Cloud","quantity":2,"username":"Account123"}
  ]'::jsonb) INTO v_trade;

  SELECT id INTO v_inv FROM public.inventory
  WHERE user_id = v_uid AND pet_name = 'Toasty Red Panda' AND status = 'available' LIMIT 1;
  PERFORM public.sell_stock(v_inv, 2, 20, 16000, 15, DATE '2026-08-29', 'Demo sale');
END; $$;

REVOKE ALL ON FUNCTION public.seed_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;
