import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Package } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { SellModal } from "@/components/SellModal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/NumberInput";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  deleteInventory,
  inventoryQuery,
  salesQuery,
  settingsQuery,
  updateInventory,
} from "@/lib/queries";
import { num, shortDate, usd } from "@/lib/format";
import type { InventoryItem } from "@/types";

export const Route = createFileRoute("/_authenticated/inventory")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search["status"] as string) ?? "all",
  }),
  head: () => ({
    meta: [
      { title: "Inventory · Adopt Me Manager" },
      {
        name: "description",
        content: "Grouped pet stock by account with source, buy date and status.",
      },
      { property: "og:title", content: "Inventory · Adopt Me Manager" },
      { property: "og:description", content: "Every pet you own, grouped by account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { status: statusParam } = Route.useSearch();
  const qc = useQueryClient();
  const inventory = useQuery(inventoryQuery());
  const accounts = useQuery(accountsQuery());
  const sales = useQuery(salesQuery());
  const settings = useQuery(settingsQuery());

  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("all");
  const [source, setSource] = useState("all");
  const [buyDate, setBuyDate] = useState("");
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState("1");
  const [editUser, setEditUser] = useState("");
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (inventory.data ?? []).filter((i) => {
      if (statusParam !== "all" && i.status !== statusParam) return false;
      if (account !== "all" && i.username !== account) return false;
      if (source !== "all" && i.source_type !== source) return false;
      if (buyDate && i.purchase_date !== buyDate) return false;
      if (
        term &&
        !`${i.pet_name} ${i.username} ${i.notes ?? ""}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [inventory.data, statusParam, account, source, buyDate, search]);

  const totalStock = (inventory.data ?? [])
    .filter((i) => i.status === "available")
    .reduce((s, i) => s + i.quantity, 0);
  const types = new Set(
    (inventory.data ?? []).filter((i) => i.status === "available").map((i) => i.pet_name),
  ).size;

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editItem) return;
      const qty = Number(editQty);
      if (!(qty >= 0)) throw new Error("Quantity must be 0 or greater.");
      if (!editUser.trim()) throw new Error("Username cannot be empty.");
      await updateInventory(editItem.id, {
        quantity: qty,
        username: editUser.trim(),
        status: qty === 0 ? "sold" : "available",
      });
    },
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Inventory updated");
      setEditItem(null);
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async () => deleteInventory(deleteItem!.id),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Inventory row deleted", {
        description: "Sales history for this pet is kept.",
      });
      setDeleteItem(null);
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  return (
    <>
      <PageHeader title="Inventory" description="Identical pets are grouped per account." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total stock" value={`${num(totalStock)} pets`} icon={Package} />
        <StatCard label="Available types" value={num(types)} />
        <StatCard label="Rows" value={num(rows.length)} />
        <StatCard
          label="Accounts"
          value={num(new Set((inventory.data ?? []).map((i) => i.username)).size)}
        />
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-1.5 md:col-span-1">
            <Label className="text-xs">Search pet</Label>
            <Input
              placeholder="Search pet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Account</Label>
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
            <Label className="text-xs">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Buy date</Label>
            <Input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
          </div>
        </div>

        {inventory.isLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : inventory.error ? (
          <ErrorState message={(inventory.error as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No pets match these filters"
            description="Trade a purchase into pets, or clear the filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Buy date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.pet_name}</TableCell>
                    <TableCell className="num">{i.quantity}</TableCell>
                    <TableCell>{i.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {i.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.source_type === "trade" ? "-" : shortDate(i.purchase_date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          i.status === "available"
                            ? "border-success/40 text-success"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }
                      >
                        {i.status === "available" ? "Available" : `Sold ${shortDate(i.sold_date)}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewItem(i)}>View</DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={i.status !== "available"}
                            onClick={() => setSellItem(i)}
                          >
                            Sell
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditItem(i);
                              setEditQty(String(i.quantity));
                              setEditUser(i.username);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditItem(i);
                              setEditQty(String(i.quantity));
                              setEditUser("");
                            }}
                          >
                            Move account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteItem(i)}
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

      <SellModal
        item={sellItem}
        settings={settings.data}
        open={!!sellItem}
        onOpenChange={(v) => !v && setSellItem(null)}
      />

      <Dialog open={!!viewItem} onOpenChange={(v) => !v && setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewItem?.pet_name}</DialogTitle>
            <DialogDescription>Stock detail and sales history for this pet.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <Field label="Username" value={viewItem?.username ?? "-"} />
            <Field label="Stock" value={String(viewItem?.quantity ?? 0)} />
            <Field label="Source" value={viewItem?.source_type ?? "-"} />
            <Field
              label="Buy date"
              value={viewItem?.source_type === "trade" ? "-" : shortDate(viewItem?.purchase_date)}
            />
            <Field label="Status" value={viewItem?.status ?? "-"} />
            <Field label="Sold date" value={shortDate(viewItem?.sold_date)} />
          </div>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Sales history</p>
            {(sales.data ?? []).filter((s) => s.inventory_id === viewItem?.id).length === 0 ? (
              <p className="text-muted-foreground">No sales yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {(sales.data ?? [])
                  .filter((s) => s.inventory_id === viewItem?.id)
                  .map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>
                        {shortDate(s.sale_date)} · {s.quantity_sold} ×{" "}
                        {usd(s.sell_price_usd)}
                      </span>
                      <span className="num text-success">{usd(s.net_sell_usd)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editItem?.pet_name}</DialogTitle>
            <DialogDescription>Adjust the stock quantity or move it to another account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="e-qty">Quantity</Label>
              <NumberInput
                id="e-qty"
                min={0}
                value={editQty}
                onValueChange={setEditQty}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-user">Username</Label>
              <Input
                id="e-user"
                list="inv-accounts"
                value={editUser}
                onChange={(e) => setEditUser(e.target.value)}
              />
              <datalist id="inv-accounts">
                {(accounts.data ?? []).map((a) => (
                  <option key={a.id} value={a.username} />
                ))}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button disabled={saveEdit.isPending} onClick={() => saveEdit.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this inventory row?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem?.pet_name} in {deleteItem?.username} will be removed from stock. Sales
              history stays permanently stored.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
