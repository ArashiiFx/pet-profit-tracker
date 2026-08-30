-- ACCOUNTS
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  username TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, username)
);

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  game TEXT NOT NULL,
  buy_item TEXT NOT NULL,
  buy_price NUMERIC NOT NULL CHECK (buy_price >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TRADES
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  traded_item TEXT NOT NULL,
  trade_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INVENTORY
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  pet_name TEXT NOT NULL,
  username TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  source_type TEXT NOT NULL DEFAULT 'trade' CHECK (source_type IN ('purchase','trade')),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  purchase_date DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold')),
  sold_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  pet_name TEXT NOT NULL,
  username TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
  sell_price_usd NUMERIC NOT NULL CHECK (sell_price_usd > 0),
  exchange_rate NUMERIC NOT NULL CHECK (exchange_rate > 0),
  fee_percentage NUMERIC NOT NULL DEFAULT 15 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  fee_usd NUMERIC NOT NULL,
  net_sell_usd NUMERIC NOT NULL,
  net_sell_idr NUMERIC NOT NULL,
  profit_idr NUMERIC,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SETTINGS
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE DEFAULT auth.uid(),
  usd_exchange_rate NUMERIC NOT NULL DEFAULT 16000 CHECK (usd_exchange_rate > 0),
  default_fee_percentage NUMERIC NOT NULL DEFAULT 15 CHECK (default_fee_percentage >= 0 AND default_fee_percentage <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_purchases_user ON public.purchases(user_id, purchase_date DESC);
CREATE INDEX idx_trades_user ON public.trades(user_id, trade_date DESC);
CREATE INDEX idx_trades_purchase ON public.trades(purchase_id);
CREATE INDEX idx_inventory_user ON public.inventory(user_id, status);
CREATE INDEX idx_inventory_trade ON public.inventory(trade_id);
CREATE INDEX idx_inventory_purchase ON public.inventory(purchase_id);
CREATE UNIQUE INDEX idx_inventory_group ON public.inventory(user_id, pet_name, username, source_type)
  WHERE status = 'available';
CREATE INDEX idx_sales_user ON public.sales(user_id, sale_date DESC);
CREATE INDEX idx_sales_inventory ON public.sales(inventory_id);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.accounts, public.purchases, public.trades, public.inventory, public.sales, public.settings TO service_role;

-- RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own accounts" ON public.accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own purchases" ON public.purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades" ON public.trades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inventory" ON public.inventory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sales" ON public.sales FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own settings" ON public.settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add stock helper (groups identical pets)
CREATE OR REPLACE FUNCTION public.add_stock(
  p_pet_name TEXT, p_username TEXT, p_quantity INTEGER,
  p_source_type TEXT, p_purchase_id UUID, p_trade_id UUID, p_purchase_date DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(trim(p_pet_name),'') = '' THEN RAISE EXCEPTION 'Pet name is required'; END IF;
  IF coalesce(trim(p_username),'') = '' THEN RAISE EXCEPTION 'Username is required'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than 0'; END IF;

  INSERT INTO public.accounts(user_id, username) VALUES (v_uid, trim(p_username))
  ON CONFLICT (user_id, username) DO NOTHING;

  SELECT id INTO v_id FROM public.inventory
  WHERE user_id = v_uid AND pet_name = trim(p_pet_name) AND username = trim(p_username)
    AND source_type = p_source_type AND status = 'available' LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.inventory SET quantity = quantity + p_quantity WHERE id = v_id;
  ELSE
    INSERT INTO public.inventory(user_id, pet_name, username, quantity, source_type, purchase_id, trade_id, purchase_date)
    VALUES (v_uid, trim(p_pet_name), trim(p_username), p_quantity, p_source_type, p_purchase_id, p_trade_id, p_purchase_date)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;

-- Create trade + received pets atomically
CREATE OR REPLACE FUNCTION public.create_trade(
  p_purchase_id UUID, p_traded_item TEXT, p_trade_date DATE, p_notes TEXT, p_pets JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_trade UUID; v_pet JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE id = p_purchase_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;
  IF jsonb_array_length(coalesce(p_pets,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Add at least one received pet'; END IF;

  INSERT INTO public.trades(user_id, purchase_id, traded_item, trade_date, notes)
  VALUES (v_uid, p_purchase_id, trim(p_traded_item), p_trade_date, p_notes)
  RETURNING id INTO v_trade;

  FOR v_pet IN SELECT * FROM jsonb_array_elements(p_pets) LOOP
    PERFORM public.add_stock(
      v_pet->>'pet_name', v_pet->>'username', (v_pet->>'quantity')::int,
      'trade', NULL, v_trade, NULL);
  END LOOP;
  RETURN v_trade;
END; $$;

-- Sell stock atomically
CREATE OR REPLACE FUNCTION public.sell_stock(
  p_inventory_id UUID, p_quantity INTEGER, p_price_usd NUMERIC,
  p_exchange_rate NUMERIC, p_fee_percentage NUMERIC, p_sale_date DATE, p_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_inv public.inventory; v_gross NUMERIC; v_fee NUMERIC;
        v_net NUMERIC; v_sale UUID; v_remaining INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_inv FROM public.inventory WHERE id = p_inventory_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than 0'; END IF;
  IF p_quantity > v_inv.quantity THEN
    RAISE EXCEPTION 'You only have % of this pet available.', v_inv.quantity;
  END IF;
  IF p_price_usd IS NULL OR p_price_usd <= 0 THEN RAISE EXCEPTION 'Sell price must be greater than 0'; END IF;
  IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN RAISE EXCEPTION 'Exchange rate must be greater than 0'; END IF;
  IF p_fee_percentage IS NULL OR p_fee_percentage < 0 OR p_fee_percentage > 100 THEN
    RAISE EXCEPTION 'Fee percentage must be between 0 and 100'; END IF;

  v_gross := p_price_usd * p_quantity;
  v_fee := v_gross * p_fee_percentage / 100.0;
  v_net := v_gross - v_fee;

  INSERT INTO public.sales(user_id, inventory_id, pet_name, username, quantity_sold, sell_price_usd,
    exchange_rate, fee_percentage, fee_usd, net_sell_usd, net_sell_idr, sale_date, notes)
  VALUES (v_uid, v_inv.id, v_inv.pet_name, v_inv.username, p_quantity, p_price_usd,
    p_exchange_rate, p_fee_percentage, v_fee, v_net, v_net * p_exchange_rate, p_sale_date, p_notes)
  RETURNING id INTO v_sale;

  v_remaining := v_inv.quantity - p_quantity;
  UPDATE public.inventory
  SET quantity = v_remaining,
      status = CASE WHEN v_remaining = 0 THEN 'sold' ELSE 'available' END,
      sold_date = CASE WHEN v_remaining = 0 THEN p_sale_date ELSE NULL END
  WHERE id = v_inv.id;

  RETURN v_sale;
END; $$;

-- Demo data loader
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  SELECT public.create_trade(v_purchase, 'Owl', DATE '2026-08-26', NULL, '[
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

GRANT EXECUTE ON FUNCTION public.add_stock(TEXT,TEXT,INTEGER,TEXT,UUID,UUID,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_trade(UUID,TEXT,DATE,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_stock(UUID,INTEGER,NUMERIC,NUMERIC,NUMERIC,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;