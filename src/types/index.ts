export type SourceType = "purchase" | "trade";
export type InventoryStatus = "available" | "sold";

export interface Account {
  id: string;
  username: string;
  notes: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  seq: number;
  game: string;
  buy_item: string;
  buy_price: number;
  currency: string;
  purchase_date: string;
  notes: string | null;
  created_at: string;
}

export interface Trade {
  id: string;
  seq: number;
  purchase_id: string | null;
  source_inventory_id?: string | null;
  traded_item: string;
  trade_date: string;
  notes: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  pet_name: string;
  username: string;
  quantity: number;
  source_type: SourceType;
  purchase_id: string | null;
  trade_id: string | null;
  purchase_date: string | null;
  status: InventoryStatus;
  sold_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  seq: number;
  inventory_id: string | null;
  pet_name: string;
  username: string;
  quantity_sold: number;
  sell_price_usd: number;
  exchange_rate: number;
  fee_percentage: number;
  fee_usd: number;
  net_sell_usd: number;
  net_sell_idr: number;
  profit_idr: number | null;
  sale_date: string;
  notes: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  usd_exchange_rate: number;
  default_fee_percentage: number;
  updated_at: string;
}

export interface ReceivedPetInput {
  pet_name: string;
  quantity: number;
  username: string;
}
