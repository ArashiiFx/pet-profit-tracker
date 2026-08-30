import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TradeModal } from "@/components/TradeModal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  deleteTrade,
  inventoryQuery,
  purchasesQuery,
  tradesQuery,
} from "@/lib/queries";
import { num, ref, shortDate } from "@/lib/format";
import type { Trade } from "@/types";

export const Route = createFileRoute("/_authenticated/trades")({
  head: () => ({
    meta: [
      { title: "Trades · Adopt Me Manager" },
      {
        name: "description",
        content: "Trade purchased items into pets; received pets flow straight into stock.",
      },
      { property: "og:title", content: "Trades · Adopt Me Manager" },
      { property: "og:description", content: "Every trade and the pets it produced." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TradesPage,
});

function TradesPage() {
  const qc = useQueryClient();
  const trades = useQuery(tradesQuery());
  const purchases = useQuery(purchasesQuery());
  const inventory = useQuery(inventoryQuery());
  const accounts = useQuery(accountsQuery());

  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Trade | null>(null);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return trades.data ?? [];
    return (trades.data ?? []).filter((t) =>
      `${ref("TRADE", t.seq)} ${t.traded_item} ${t.notes ?? ""}`.toLowerCase().includes(term),
    );
  }, [trades.data, search]);

  const petsFor = (tradeId: string) =>
    (inventory.data ?? []).filter((i) => i.trade_id === tradeId);

  const remove = useMutation({
    mutationFn: async () => deleteTrade(toDelete!.id),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Trade deleted");
      setToDelete(null);
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const receivedTotal = (inventory.data ?? [])
    .filter((i) => i.source_type === "trade")
    .reduce((s, i) => s + i.quantity, 0);
  const availableInventory = (inventory.data ?? []).filter((item) => item.status === "available");

  return (
    <>
      <PageHeader
        title="Trades"
        description="A purchase can be traded into many pets."
        actions={
          <Button onClick={() => setOpen(true)} disabled={availableInventory.length === 0}>
            <Plus className="size-4" /> New trade
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total trades" value={num((trades.data ?? []).length)} icon={Repeat} />
        <StatCard label="Pets in stock from trades" value={num(receivedTotal)} />
        <StatCard label="Purchases available" value={num((purchases.data ?? []).length)} />
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-1.5 md:max-w-sm">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Trade ID, item or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {trades.isLoading ? (
          <Skeleton className="h-56 rounded-lg" />
        ) : trades.error ? (
          <ErrorState message={(trades.error as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No trades yet"
            description="Select a purchase and record the pets you received."
            action={
                <Button onClick={() => setOpen(true)} disabled={availableInventory.length === 0}>
                New trade
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((t) => {
              const source = (purchases.data ?? []).find((p) => p.id === t.purchase_id);
              return (
                <Card key={t.id} className="gap-3 p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold">
                        {ref("TRADE", t.seq)} · {t.traded_item}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shortDate(t.trade_date)} · from{" "}
                        {source ? ref("BUY", source.seq) : "unknown purchase"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(t)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {petsFor(t.id).length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Received pets are sold out.
                      </span>
                    ) : (
                      petsFor(t.id).map((i) => (
                        <Badge key={i.id} variant="secondary">
                          {i.pet_name} × {i.quantity}
                        </Badge>
                      ))
                    )}
                  </div>
                  {t.notes ? <p className="text-xs text-muted-foreground">{t.notes}</p> : null}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <TradeModal
        open={open}
        onOpenChange={setOpen}
        inventory={(inventory.data ?? []).filter((item) => item.status === "available")}
        accounts={accounts.data ?? []}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
            <AlertDialogDescription>
              Inventory rows created by it stay in stock but lose the trade link.
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
