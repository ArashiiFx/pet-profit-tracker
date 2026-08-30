import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, MoreHorizontal, Receipt } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVALIDATE_ALL, accountsQuery, deleteSale, salesQuery } from "@/lib/queries";
import { idr, num, ref, shortDate, usd } from "@/lib/format";
import type { Sale } from "@/types";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales · Adopt Me Manager" },
      {
        name: "description",
        content: "Permanent sales history with gross, fee, net USD and net IDR per transaction.",
      },
      { property: "og:title", content: "Sales · Adopt Me Manager" },
      { property: "og:description", content: "Every pet sale you have recorded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const sales = useQuery(salesQuery());
  const accounts = useQuery(accountsQuery());

  const [pet, setPet] = useState("");
  const [account, setAccount] = useState("all");
  const [date, setDate] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);
  const [toDelete, setToDelete] = useState<Sale | null>(null);

  const rows = useMemo(() => {
    const term = pet.trim().toLowerCase();
    return (sales.data ?? []).filter((s) => {
      if (account !== "all" && s.username !== account) return false;
      if (date && s.sale_date !== date) return false;
      if (term && !`${s.pet_name} ${s.notes ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [sales.data, pet, account, date]);

  const gross = rows.reduce((s, x) => s + Number(x.sell_price_usd) * x.quantity_sold, 0);
  const fees = rows.reduce((s, x) => s + Number(x.fee_usd), 0);
  const net = rows.reduce((s, x) => s + Number(x.net_sell_usd), 0);

  const remove = useMutation({
    mutationFn: async () => deleteSale(toDelete!.id),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Sale record removed");
      setToDelete(null);
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  return (
    <>
      <PageHeader title="Sales" description="Sales history is stored permanently." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total sales" value={usd(gross)} icon={Receipt} />
        <StatCard label="Total fees" value={usd(fees)} icon={Coins} tone="destructive" />
        <StatCard label="Total net sales" value={usd(net)} tone="success" icon={Coins} />
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Pet</Label>
            <Input placeholder="Search pet..." value={pet} onChange={(e) => setPet(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Username</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {(accounts.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.username}>
                    {a.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Sale date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {sales.isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : sales.error ? (
          <ErrorState message={(sales.error as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No sales yet"
            description="Sell stock from the Inventory page to build your sales history."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Sell price</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Sale date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                    <TableCell className="font-medium">{s.pet_name}</TableCell>
                    <TableCell>{s.username}</TableCell>
                    <TableCell className="num">{s.quantity_sold}</TableCell>
                    <TableCell className="num">{usd(s.sell_price_usd)}</TableCell>
                    <TableCell className="num">
                      {usd(Number(s.sell_price_usd) * s.quantity_sold)}
                    </TableCell>
                    <TableCell className="num text-destructive">{usd(s.fee_usd)}</TableCell>
                    <TableCell className="num text-success">{usd(s.net_sell_usd)}</TableCell>
                    <TableCell className="num">{idr(s.exchange_rate)}</TableCell>
                    <TableCell>{shortDate(s.sale_date)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(s)}>View</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setToDelete(s)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {detail ? ref("SALE", detail.seq) : ""} · {detail?.pet_name}
            </DialogTitle>
            <DialogDescription>Full breakdown of this transaction.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <Row label="Username" value={detail?.username ?? "-"} />
            <Row label="Quantity sold" value={num(detail?.quantity_sold)} />
            <Row label="Sell price per pet" value={usd(detail?.sell_price_usd)} />
            <Row
              label="Gross sale"
              value={usd(detail ? Number(detail.sell_price_usd) * detail.quantity_sold : 0)}
            />
            <Row label={`Fee ${detail?.fee_percentage ?? 0}%`} value={`-${usd(detail?.fee_usd)}`} />
            <Row label="Net sale" value={usd(detail?.net_sell_usd)} />
            <Row label="Exchange rate" value={idr(detail?.exchange_rate)} />
            <Row label="Net sale IDR" value={idr(detail?.net_sell_idr)} />
            <Row label="Sale date" value={shortDate(detail?.sale_date)} />
            {detail?.notes ? <Row label="Notes" value={detail.notes} /> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Profit attribution unavailable at pet level — traded pets carry no individual cost
            basis. See Reports for purchase-level profit.
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this sale record?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the history entry; stock quantities are not restored.
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
      <span className="num font-medium">{value}</span>
    </div>
  );
}
