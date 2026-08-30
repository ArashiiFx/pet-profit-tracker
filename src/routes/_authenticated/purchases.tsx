import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Plus, ShoppingCart, Wallet } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PurchaseModal } from "@/components/PurchaseModal";
import { TradeModal } from "@/components/TradeModal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  INVALIDATE_ALL,
  accountsQuery,
  deletePurchase,
  inventoryQuery,
  purchasesQuery,
  salesQuery,
  tradesQuery,
} from "@/lib/queries";
import { idr, money, num, ref, shortDate } from "@/lib/format";
import type { Purchase } from "@/types";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases · Adopt Me Manager" },
      {
        name: "description",
        content: "Every capital item you bought, its cost and whether it has been traded.",
      },
      { property: "og:title", content: "Purchases · Adopt Me Manager" },
      { property: "og:description", content: "Track buy items, prices and trade status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const qc = useQueryClient();
  const purchases = useQuery(purchasesQuery());
  const trades = useQuery(tradesQuery());
  const inventory = useQuery(inventoryQuery());
  const accounts = useQuery(accountsQuery());
  const sales = useQuery(salesQuery());

  const [modalOpen, setModalOpen] = useState(false);
  const [tradeFor, setTradeFor] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("");
  const [date, setDate] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (purchases.data ?? []).filter((p) => {
      if (game && !p.game.toLowerCase().includes(game.toLowerCase())) return false;
      if (date && p.purchase_date !== date) return false;
      if (term && !`${ref("BUY", p.seq)} ${p.buy_item} ${p.notes ?? ""}`.toLowerCase().includes(term))
        return false;
      return true;
    });
  }, [purchases.data, search, game, date]);

  const thisMonth = (purchases.data ?? []).filter((p) =>
    p.purchase_date.startsWith(new Date().toISOString().slice(0, 7)),
  ).length;
  const totalCapital = (purchases.data ?? []).reduce(
    (s, p) => s + (p.currency === "IDR" ? Number(p.buy_price) : 0),
    0,
  );

  const remove = useMutation({
    mutationFn: async () => deletePurchase(toDelete!.id),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Purchase deleted");
      setToDelete(null);
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const availableInventory = (inventory.data ?? []).filter((item) => item.status === "available");
  const tradesFor = (id: string) => (trades.data ?? []).filter((t) => t.purchase_id === id);
  const petsFor = (tradeId: string) =>
    (inventory.data ?? []).filter((i) => i.trade_id === tradeId);
  const purchaseForInventory = (itemId: string, visited = new Set<string>()): string | null => {
    if (visited.has(itemId)) return null;
    visited.add(itemId);
    const item = (inventory.data ?? []).find((row) => row.id === itemId);
    if (!item) return null;
    if (item.purchase_id) return item.purchase_id;
    if (!item.trade_id) return null;
    const trade = (trades.data ?? []).find((row) => row.id === item.trade_id);
    if (!trade) return null;
    if (trade.purchase_id) return trade.purchase_id;
    return trade.source_inventory_id
      ? purchaseForInventory(trade.source_inventory_id, visited)
      : null;
  };
  const profitFor = (purchase: Purchase) => {
    if (purchase.currency !== "IDR") return null;
    const netSales = (sales.data ?? []).reduce((sum, sale) => {
      if (!sale.inventory_id) return sum;
      return purchaseForInventory(sale.inventory_id) === purchase.id
        ? sum + Number(sale.net_sell_idr)
        : sum;
    }, 0);
    return netSales - Number(purchase.buy_price);
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        description="The capital side of the business."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> New purchase
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total purchases"
          value={num((purchases.data ?? []).length)}
          icon={ShoppingCart}
        />
        <StatCard label="Total capital" value={idr(totalCapital)} icon={Wallet} />
        <StatCard label="Purchases this month" value={num(thisMonth)} />
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Item, ID or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Game</Label>
            <Input placeholder="ADM" value={game} onChange={(e) => setGame(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Buy date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {purchases.isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : purchases.error ? (
          <ErrorState message={(purchases.error as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            description="Record the item you bought to start the Buy → Trade → Sell flow."
            action={<Button onClick={() => setModalOpen(true)}>New purchase</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Buy item</TableHead>
                  <TableHead>Buy price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Buy date</TableHead>
                  <TableHead>Trade status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const traded = tradesFor(p.id).length > 0;
                  const profit = profitFor(p);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => setDetail(p)}
                    >
                      <TableCell className="num font-medium">{ref("BUY", p.seq)}</TableCell>
                      <TableCell>{p.game}</TableCell>
                      <TableCell>{p.buy_item}</TableCell>
                      <TableCell className="num">{money(Number(p.buy_price), p.currency)}</TableCell>
                      <TableCell>{p.currency}</TableCell>
                      <TableCell className={profit != null && profit >= 0 ? "num text-success" : "num text-destructive"}>
                        {profit == null ? "-" : idr(profit)}
                      </TableCell>
                      <TableCell>{shortDate(p.purchase_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            traded
                              ? "border-success/40 text-success"
                              : "border-warning/40 text-warning"
                          }
                        >
                          {traded ? "Traded" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetail(p)}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTradeFor(p.id)}>
                              New trade
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setToDelete(p)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <PurchaseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accounts={accounts.data ?? []}
      />
        <TradeModal
        open={!!tradeFor}
        onOpenChange={(v) => !v && setTradeFor(undefined)}
          inventory={availableInventory}
        accounts={accounts.data ?? []}
        defaultPurchaseId={tradeFor}
      />

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail ? ref("BUY", detail.seq) : ""} · {detail?.buy_item}</DialogTitle>
            <DialogDescription>Purchase information and trade history.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <Row label="Game" value={detail?.game ?? "-"} />
            <Row label="Buy item" value={detail?.buy_item ?? "-"} />
            <Row
              label="Buy price"
              value={detail ? money(Number(detail.buy_price), detail.currency) : "-"}
            />
            <Row
              label="Profit"
              value={detail ? (profitFor(detail) == null ? "-" : idr(profitFor(detail))) : "-"}
            />
            <Row label="Buy date" value={shortDate(detail?.purchase_date)} />
            {detail?.notes ? <Row label="Notes" value={detail.notes} /> : null}
          </div>

          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Trade history</p>
            {detail && tradesFor(detail.id).length === 0 ? (
              <p className="text-muted-foreground">Not traded yet.</p>
            ) : (
              detail &&
              tradesFor(detail.id).map((t) => (
                <div key={t.id} className="mb-3 last:mb-0">
                  <p className="font-medium">
                    {ref("TRADE", t.seq)} · {shortDate(t.trade_date)}
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                    {petsFor(t.id).map((i) => (
                      <li key={i.id}>
                        {i.pet_name} × {i.quantity} ({i.username})
                      </li>
                    ))}
                    {petsFor(t.id).length === 0 ? <li>Received pets already sold out.</li> : null}
                  </ul>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              Its trades will be removed too. Inventory rows stay but lose the purchase link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
