import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, ErrorState } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inventoryQuery,
  purchasesQuery,
  salesQuery,
  tradesQuery,
} from "@/lib/queries";
import { idr, num, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Adopt Me Manager" },
      {
        name: "description",
        content: "Period reports for purchases, trades, sales, fees, net sales and inventory.",
      },
      { property: "og:title", content: "Reports · Adopt Me Manager" },
      { property: "og:description", content: "Best selling pets and most active accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const to = iso(now);
  if (preset === "today") return { from: to, to };
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: iso(d), to };
  }
  if (preset === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { from: iso(d), to };
  }
  if (preset === "month") {
    return { from: `${to.slice(0, 7)}-01`, to };
  }
  return { from: "", to: "" };
}

function ReportsPage() {
  const purchases = useQuery(purchasesQuery());
  const trades = useQuery(tradesQuery());
  const sales = useQuery(salesQuery());
  const inventory = useQuery(inventoryQuery());

  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(presetRange("30d"));

  const applyPreset = (p: string) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  };

  const inRange = (date: string) =>
    (!range.from || date >= range.from) && (!range.to || date <= range.to);

  const p = useMemo(
    () => (purchases.data ?? []).filter((x) => inRange(x.purchase_date)),
    [purchases.data, range],
  );
  const t = useMemo(
    () => (trades.data ?? []).filter((x) => inRange(x.trade_date)),
    [trades.data, range],
  );
  const s = useMemo(
    () => (sales.data ?? []).filter((x) => inRange(x.sale_date)),
    [sales.data, range],
  );

  const capital = p.reduce((sum, x) => sum + (x.currency === "IDR" ? Number(x.buy_price) : 0), 0);
  const gross = s.reduce((sum, x) => sum + Number(x.sell_price_usd) * x.quantity_sold, 0);
  const fees = s.reduce((sum, x) => sum + Number(x.fee_usd), 0);
  const netUsd = s.reduce((sum, x) => sum + Number(x.net_sell_usd), 0);
  const netIdr = s.reduce((sum, x) => sum + Number(x.net_sell_idr), 0);
  const stock = (inventory.data ?? [])
    .filter((i) => i.status === "available")
    .reduce((sum, i) => sum + i.quantity, 0);

  const byPet = Object.values(
    s.reduce<Record<string, { name: string; qty: number; net: number }>>((acc, x) => {
      const e = (acc[x.pet_name] ??= { name: x.pet_name, qty: 0, net: 0 });
      e.qty += x.quantity_sold;
      e.net += Number(x.net_sell_usd);
      return acc;
    }, {}),
  ).sort((a, b) => b.qty - a.qty);

  const byAccount = Object.values(
    s.reduce<Record<string, { name: string; qty: number; net: number }>>((acc, x) => {
      const e = (acc[x.username] ??= { name: x.username, qty: 0, net: 0 });
      e.qty += x.quantity_sold;
      e.net += Number(x.net_sell_usd);
      return acc;
    }, {}),
  ).sort((a, b) => b.net - a.net);

  const loading = purchases.isLoading || sales.isLoading;

  return (
    <>
      <PageHeader title="Reports" description="Filter by period and review business performance." />

      <Card className="gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
            ["month", "This month"],
            ["custom", "Custom"],
          ].map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={preset === key ? "default" : "outline"}
              onClick={() => applyPreset(key as string)}
            >
              {label}
            </Button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2 md:max-w-md">
            <div className="grid gap-1.5">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {loading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : sales.error ? (
        <ErrorState message={(sales.error as Error).message} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Purchases" value={num(p.length)} hint={idr(capital)} />
            <StatCard label="Trades" value={num(t.length)} />
            <StatCard label="Gross sales" value={usd(gross)} />
            <StatCard label="Fees" value={usd(fees)} tone="destructive" />
            <StatCard label="Net sales" value={usd(netUsd)} hint={idr(netIdr)} tone="success" />
            <StatCard
              label="Net vs capital"
              value={idr(netIdr - capital)}
              tone={netIdr - capital >= 0 ? "success" : "destructive"}
              hint="Purchase-level accounting"
            />
            <StatCard label="Inventory count" value={`${num(stock)} pets`} />
            <StatCard label="Units sold" value={num(s.reduce((a, x) => a + x.quantity_sold, 0))} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold">Best selling pets</h2>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byPet.slice(0, 10).map((r) => (
                    <TableRow key={r.name}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="num">{r.qty}</TableCell>
                      <TableCell className="num text-right text-success">{usd(r.net)}</TableCell>
                    </TableRow>
                  ))}
                  {byPet.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold">Most active accounts</h2>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAccount.slice(0, 10).map((r) => (
                    <TableRow key={r.name}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="num">{r.qty}</TableCell>
                      <TableCell className="num text-right text-success">{usd(r.net)}</TableCell>
                    </TableRow>
                  ))}
                  {byAccount.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
