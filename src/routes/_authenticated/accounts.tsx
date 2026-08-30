import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  createAccount,
  deleteAccount,
  inventoryQuery,
  salesQuery,
} from "@/lib/queries";
import { shortDate, usd } from "@/lib/format";
import type { Account } from "@/types";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts · Adopt Me Manager" },
      {
        name: "description",
        content: "Adopt Me usernames holding your pets, with stock counts and recent activity.",
      },
      { property: "og:title", content: "Accounts · Adopt Me Manager" },
      { property: "og:description", content: "Where each pet is currently stored." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const qc = useQueryClient();
  const accounts = useQuery(accountsQuery());
  const inventory = useQuery(inventoryQuery());
  const sales = useQuery(salesQuery());

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [notes, setNotes] = useState("");
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!username.trim()) throw new Error("Username cannot be empty.");
      return createAccount({ username: username.trim(), notes: notes.trim() || null });
    },
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Account added");
      setOpen(false);
      setUsername("");
      setNotes("");
    },
    onError: (e: Error) => toast.error("Could not add account", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async () => deleteAccount(toDelete!.id),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Account removed");
      setToDelete(null);
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        title="Accounts"
        description="One account can hold many pets."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add account
          </Button>
        }
      />

      {accounts.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : accounts.error ? (
        <ErrorState message={(accounts.error as Error).message} />
      ) : (accounts.data ?? []).length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Accounts are created automatically when you stock pets, or add one manually."
          action={<Button onClick={() => setOpen(true)}>Add account</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(accounts.data ?? []).map((a) => {
            const items = (inventory.data ?? []).filter((i) => i.username === a.username);
            const available = items
              .filter((i) => i.status === "available")
              .reduce((s, i) => s + i.quantity, 0);
            const soldRows = items.filter((i) => i.status === "sold").length;
            const recent = (sales.data ?? []).filter((s) => s.username === a.username).slice(0, 3);
            return (
              <Card key={a.id} className="gap-3 p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold">{a.username}</p>
                    <p className="text-xs text-muted-foreground">{available} pets in stock</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(a)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{items.length} rows</Badge>
                  <Badge variant="outline" className="border-success/40 text-success">
                    {available} available
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {soldRows} sold out
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Recent activity</p>
                  {recent.length === 0 ? (
                    <p>No sales yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {recent.map((s) => (
                        <li key={s.id}>
                          {shortDate(s.sale_date)} · {s.pet_name} × {s.quantity_sold} ·{" "}
                          {usd(s.net_sell_usd)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {a.notes ? <p className="text-xs text-muted-foreground">{a.notes}</p> : null}
              </Card>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="size-3.5" /> {(accounts.data ?? []).length} account(s)
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add account</DialogTitle>
            <DialogDescription>The Adopt Me username holding your pets.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="a-user">Username</Label>
              <Input
                id="a-user"
                placeholder="Account123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-notes">Notes (optional)</Label>
              <Textarea
                id="a-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Inventory rows and sales referencing this username are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
