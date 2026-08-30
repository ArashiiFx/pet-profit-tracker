import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Account,
  InventoryItem,
  Purchase,
  ReceivedPetInput,
  Sale,
  Settings,
  Trade,
} from "@/types";

function orThrow<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const purchasesQuery = () =>
  queryOptions({
    queryKey: ["purchases"],
    queryFn: async (): Promise<Purchase[]> =>
      orThrow(
        await supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      ),
  });

export const tradesQuery = () =>
  queryOptions({
    queryKey: ["trades"],
    queryFn: async (): Promise<Trade[]> =>
      orThrow(await supabase.from("trades").select("*").order("created_at", { ascending: false })),
  });

export const inventoryQuery = () =>
  queryOptions({
    queryKey: ["inventory"],
    queryFn: async (): Promise<InventoryItem[]> =>
      orThrow(
        await supabase
          .from("inventory")
          .select("*")
          .order("status", { ascending: true })
          .order("pet_name", { ascending: true }),
      ) as unknown as InventoryItem[],
  });

export const salesQuery = () =>
  queryOptions({
    queryKey: ["sales"],
    queryFn: async (): Promise<Sale[]> =>
      orThrow(await supabase.from("sales").select("*").order("created_at", { ascending: false })),
  });

export const accountsQuery = () =>
  queryOptions({
    queryKey: ["accounts"],
    queryFn: async (): Promise<Account[]> =>
      orThrow(await supabase.from("accounts").select("*").order("username", { ascending: true })),
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings> => {
      const existing = await supabase.from("settings").select("*").maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data) return existing.data as Settings;

      const inserted = await supabase.from("settings").insert({}).select("*").single();
      return orThrow(inserted);
    },
  });

export const INVALIDATE_ALL = [
  ["purchases"],
  ["trades"],
  ["inventory"],
  ["sales"],
  ["accounts"],
  ["settings"],
];

export async function createPurchase(input: {
  game: string;
  buy_item: string;
  buy_price: number;
  currency: string;
  purchase_date: string;
  notes: string | null;
  stock_it: boolean;
  username: string | null;
}) {
  const purchase = orThrow<Purchase>(
    await supabase
      .from("purchases")
      .insert({
        game: input.game,
        buy_item: input.buy_item,
        buy_price: input.buy_price,
        currency: input.currency,
        purchase_date: input.purchase_date,
        notes: input.notes,
      })
      .select("*")
      .single(),
  );

  if (input.stock_it && input.username) {
    const { error } = await supabase.rpc("add_stock", {
      p_pet_name: input.buy_item,
      p_username: input.username,
      p_quantity: 1,
      p_source_type: "purchase",
      p_purchase_id: purchase.id,
      p_trade_id: null,
      p_purchase_date: input.purchase_date,
    });
    if (error) throw new Error(error.message);
  }

  return purchase;
}

export async function updatePurchase(
  id: string,
  patch: Partial<Omit<Purchase, "id" | "seq" | "created_at">>,
) {
  const { error } = await supabase.from("purchases").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePurchase(id: string) {
  const { error } = await supabase.from("purchases").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createTrade(input: {
  purchase_id: string | null;
  source_inventory_id?: string | null;
  source_quantity: number;
  traded_item: string;
  trade_date: string;
  notes: string | null;
  pets: ReceivedPetInput[];
}) {
  const { data, error } = await supabase.rpc("create_trade", {
    p_purchase_id: input.purchase_id,
    p_source_inventory_id: input.source_inventory_id ?? null,
    p_source_quantity: input.source_quantity,
    p_traded_item: input.traded_item,
    p_trade_date: input.trade_date,
    p_notes: input.notes,
    p_pets: input.pets.map((p) => ({
      pet_name: p.pet_name,
      quantity: p.quantity,
      username: p.username,
    })),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function sellStock(input: {
  inventory_id: string;
  quantity: number;
  price_usd: number;
  exchange_rate: number;
  fee_percentage: number;
  sale_date: string;
  notes: string | null;
}) {
  const { data, error } = await supabase.rpc("sell_stock", {
    p_inventory_id: input.inventory_id,
    p_quantity: input.quantity,
    p_price_usd: input.price_usd,
    p_exchange_rate: input.exchange_rate,
    p_fee_percentage: input.fee_percentage,
    p_sale_date: input.sale_date,
    p_notes: input.notes,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateInventory(
  id: string,
  patch: Partial<Omit<InventoryItem, "id" | "created_at" | "updated_at">>,
) {
  const { error } = await supabase.from("inventory").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInventory(id: string) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createAccount(input: { username: string; notes: string | null }) {
  const { error } = await supabase.from("accounts").insert({
    username: input.username,
    notes: input.notes,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Account already exists");
    throw new Error(error.message);
  }
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateSettings(
  id: string,
  patch: { usd_exchange_rate: number; default_fee_percentage: number },
) {
  const { error } = await supabase.from("settings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedDemoData() {
  const { error } = await supabase.rpc("seed_demo_data");
  if (error) throw new Error(error.message);
}

export async function deleteSale(id: string) {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
