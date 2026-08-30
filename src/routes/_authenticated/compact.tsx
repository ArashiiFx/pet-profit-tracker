import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inventoryQuery, purchasesQuery, salesQuery, tradesQuery } from "@/lib/queries";
import { idr, money, shortDate, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compact")({
  head: () => ({
    meta: [
      { title: "Compact Table · Adopt Me Manager" },
      {
        name: "description",
        content: "Spreadsheet-style summary of buy price, sell price, fee, net sell and status.",
      },
      { property: "og:title", content: "Compact Table · Adopt Me Manager" },
      { property: "og:description", content: "One-line-per-pet business summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompactPage,
});

function CompactPage() {
  const inventory = useQuery(inventoryQuery());
  const purchases = useQuery(purchasesQuery());
  const trades = useQuery(tradesQuery());
  const sales = useQuery(salesQuery());
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const purchaseById = new Map((purchases.data ?? []).map((p) => [p.id, p]));
    const tradeById = new Map((trades.data ?? []).map((t) => [t.id, t]));

    return (inventory.data ?? []).map((i) => {
      const related = (sales.data ?? []).filter((s) => s.inventory_id === i.id);
      const units = related.reduce((s, x) => s + x.quantity_sold, 0);
      const grossUsd = related.reduce((s, x) => s + Number(x.sell_price_usd) * x.quantity_sold, 0);
      const feeUsd = related.reduce((s, x) => s + Number(x.fee_usd), 0);
      const netUsd = related.reduce((s, x) => s + Number(x.net_sell_usd), 0);
      const netIdr = related.reduce((s, x) => s + Number(x.net_sell_idr), 0);

      const purchase =
        (i.purchase_id ? purchaseById.get(i.purchase_id) : undefined) ??
        (i.trade_id ? purchaseById.get(tradeById.get(i.trade_id)?.purchase_id ?? "") : undefined);

      return {
        id: i.id,
        game: purchase?.game ?? "-",
        buyItem: i.source_type === "purchase" ? i.pet_name : (purchase?.buy_item ?? "-"),
        pet: i.pet_name,
        buyPrice:
          i.source_type === "purchase" && purchase
            ? money(Number(purchase.buy_price), purchase.currency)
            : "-",
        sell: units > 0 ? usd(grossUsd) : "-",
        fee: units > 0 ? usd(feeUsd) : "-",
        netSell: units > 0 ? usd(netUsd) : "-",
        netIdr: units > 0 ? idr(netIdr) : "-",
        status: i.status,
        keterangan:
          i.source_type === "trade"
            ? "Hasil trade — no individual cost basis"
            : (i.notes ?? "Direct purchase"),
        tglBuy: i.source_type === "purchase" ? shortDate(i.purchase_date) : "-",
        tglSold: i.status === "sold" ? shortDate(i.sold_date) : "-",
        stock: i.quantity,
        username: i.username,
      };
    });
  }, [inventory.data, purchases.data, trades.data, sales.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.pet} ${r.username} ${r.buyItem} ${r.game} ${r.keterangan}`.toLowerCase().includes(term),
    );
  }, [rows, search]);

  return (
    <>
      <PageHeader
        title="Compact table"
        description="Spreadsheet-style summary. All data comes from the live database."
      />

      <Card className="gap-4 p-4">
        <div className="grid gap-1.5 md:max-w-sm">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Pet, item, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {inventory.isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : inventory.error ? (
          <ErrorState message={(inventory.error as Error).message} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing to summarise yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Buy item</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Buy price</TableHead>
                  <TableHead>Sell</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net sell</TableHead>
                  <TableHead>Net IDR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Tgl buy</TableHead>
                  <TableHead>Tgl sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.game}</TableCell>
                    <TableCell>{r.buyItem}</TableCell>
                    <TableCell className="font-medium">{r.pet}</TableCell>
                    <TableCell className="num">{r.stock}</TableCell>
                    <TableCell className="num">{r.buyPrice}</TableCell>
                    <TableCell className="num">{r.sell}</TableCell>
                    <TableCell className="num text-destructive">{r.fee}</TableCell>
                    <TableCell className="num text-success">{r.netSell}</TableCell>
                    <TableCell className="num">{r.netIdr}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "available"
                            ? "border-success/40 text-success"
                            : "text-muted-foreground"
                        }
                      >
                        {r.status === "available" ? "Available" : "Sold"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {r.keterangan}
                    </TableCell>
                    <TableCell>{r.tglBuy}</TableCell>
                    <TableCell>{r.tglSold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
