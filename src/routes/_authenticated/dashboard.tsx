import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Boxes,
  Coins,
  Package,
  Receipt,
  Repeat,
  ShoppingCart,
  Tags,
  Wallet,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  accountsQuery,
  inventoryQuery,
  purchasesQuery,
  salesQuery,
  tradesQuery,
} from "@/lib/queries";
import { idr, num, ref, shortDate, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Adopt Me Manager" },
      {
        name: "description",
        content: "Capital, sales, fees, net sales and stock overview for your Adopt Me business.",
      },
      { property: "og:title", content: "Dashboard · Adopt Me Manager" },
      { property: "og:description", content: "Live overview of your pet trading business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Dashboard() {
  const purchases = useQuery(purchasesQuery());
  const trades = useQuery(tradesQuery());
  const inventory = useQuery(inventoryQuery());
  const sales = useQuery(salesQuery());
  const accounts = useQuery(accountsQuery());

  const loading =
    purchases.isLoading || trades.isLoading || inventory.isLoading || sales.isLoading;

  const totalCapital = (purchases.data ?? []).reduce(
    (sum, p) => sum + (p.currency === "IDR" ? Number(p.buy_price) : 0),
    0,
  );
  const grossSales = (sales.data ?? []).reduce(
    (s, x) => s + Number(x.sell_price_usd) * x.quantity_sold,
    0,
  );
  const totalFees = (sales.data ?? []).reduce((s, x) => s + Number(x.fee_usd), 0);
  const netUsd = (sales.data ?? []).reduce((s, x) => s + Number(x.net_sell_usd), 0);
  const netIdr = (sales.data ?? []).reduce((s, x) => s + Number(x.net_sell_idr), 0);
  const availableStock = (inventory.data ?? [])
    .filter((i) => i.status === "available")
    .reduce((s, i) => s + i.quantity, 0);
  const soldItems = (sales.data ?? []).reduce((s, x) => s + x.quantity_sold, 0);

  const salesByDate = Object.values(
    (sales.data ?? []).reduce<Record<string, { date: string; net: number; gross: number }>>(
      (acc, s) => {
        const key = s.sale_date;
        const entry = (acc[key] ??= { date: key, net: 0, gross: 0 });
        entry.net += Number(s.net_sell_usd);
        entry.gross += Number(s.sell_price_usd) * s.quantity_sold;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => a.date.localeCompare(b.date));

  const stockByAccount = Object.values(
    (inventory.data ?? [])
      .filter((i) => i.status === "available")
      .reduce<Record<string, { name: string; value: number }>>((acc, i) => {
        const entry = (acc[i.username] ??= { name: i.username, value: 0 });
        entry.value += i.quantity;
        return acc;
      }, {}),
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const isEmpty = (purchases.data ?? []).length === 0 && (sales.data ?? []).length === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Buy → Trade → Stock → Sell → Profit at a glance."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/purchases">New purchase</Link>
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          title="No data yet"
          description="Record your first purchase, or load the demo dataset from Settings to explore the workflow."
          action={
            <Button asChild size="sm">
              <Link to="/settings">Open settings</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total capital" value={idr(totalCapital)} icon={Wallet} href="/purchases" />
        <StatCard label="Total sales" value={usd(grossSales)} icon={Receipt} href="/sales" />
        <StatCard label="Total fees" value={usd(totalFees)} icon={Coins} tone="destructive" href="/sales" />
        <StatCard
          label="Net sales"
          value={usd(netUsd)}
          hint={idr(netIdr)}
          icon={Coins}
          tone="success"
          href="/sales"
        />
        <StatCard label="Available stock" value={`${num(availableStock)} pets`} icon={Package} href="/inventory" />
        <StatCard label="Sold items" value={`${num(soldItems)} pets`} icon={Tags} href="/sales" />
        <StatCard
          label="Purchases"
          value={num((purchases.data ?? []).length)}
          icon={ShoppingCart}
          href="/purchases"
        />
        <StatCard label="Trades" value={num((trades.data ?? []).length)} icon={Repeat} href="/trades" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="font-display text-sm font-semibold">Net sales overview (USD)</h2>
          <div className="mt-4 h-64">
            {salesByDate.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gross"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No sales recorded yet" />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold">Stock by account</h2>
          <div className="mt-4 h-64">
            {stockByAccount.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockByAccount}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stockByAccount.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No stock yet" />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-sm font-semibold">Sales volume by pet</h2>
        <div className="mt-4 h-64">
          {sales.data?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.values(
                  sales.data.reduce<Record<string, { pet: string; qty: number }>>((acc, s) => {
                    const entry = (acc[s.pet_name] ??= { pet: s.pet_name, qty: 0 });
                    entry.qty += s.quantity_sold;
                    return acc;
                  }, {}),
                )}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="pet" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar dataKey="qty" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales recorded yet" />
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold">Recent purchases</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(purchases.data ?? []).slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <Badge variant="outline" className="mr-2">
                    {ref("BUY", p.seq)}
                  </Badge>
                  {p.buy_item}
                </span>
                <span className="num shrink-0 text-muted-foreground">{idr(p.buy_price)}</span>
              </li>
            ))}
            {(purchases.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No purchases yet.</li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold">Recent trades</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(trades.data ?? []).slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <Badge variant="outline" className="mr-2">
                    {ref("TRADE", t.seq)}
                  </Badge>
                  {t.traded_item}
                </span>
                <span className="shrink-0 text-muted-foreground">{shortDate(t.trade_date)}</span>
              </li>
            ))}
            {(trades.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No trades yet.</li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold">Recent sales</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(sales.data ?? []).slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {s.pet_name} × {s.quantity_sold}
                </span>
                <span className="num shrink-0 text-success">{usd(s.net_sell_usd)}</span>
              </li>
            ))}
            {(sales.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No sales yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Boxes className="size-3.5" />
        {(accounts.data ?? []).length} account(s) tracked
      </p>
    </>
  );
}
