import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/NumberInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVALIDATE_ALL, createPurchase } from "@/lib/queries";
import { today } from "@/lib/format";
import type { Account } from "@/types";

export function PurchaseModal({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
}) {
  const qc = useQueryClient();
  const [game, setGame] = useState("ADM");
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [stockIt, setStockIt] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (open) {
      setGame("ADM");
      setItem("");
      setPrice("");
      setCurrency("IDR");
      setDate(today());
      setNotes("");
      setStockIt(true);
      setUsername(accounts[0]?.username ?? "");
    }
  }, [open, accounts]);

  let error: string | null = null;
  if (!game.trim()) error = "Game is required.";
  else if (!item.trim()) error = "Buy item is required.";
  else if (!(Number(price) > 0)) error = "Buy price must be greater than 0.";
  else if (!date) error = "Buy date is required.";
  else if (stockIt && !username.trim()) error = "Username is required to add this item to stock.";

  const mutation = useMutation({
    mutationFn: () =>
      createPurchase({
        game: game.trim(),
        buy_item: item.trim(),
        buy_price: Number(price),
        currency,
        purchase_date: date,
        notes: notes.trim() || null,
        stock_it: stockIt,
        username: username.trim() || null,
      }),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Purchase saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not save purchase", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New purchase</DialogTitle>
          <DialogDescription>Record the capital item you bought.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="p-game">Game</Label>
            <Input id="p-game" value={game} onChange={(e) => setGame(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-item">Buy item</Label>
            <Input
              id="p-item"
              placeholder="Owl"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-price">Buy price</Label>
            <NumberInput
              id="p-price"
              min={0}
              placeholder="815000"
              value={price}
              onValueChange={setPrice}
              decimals={currency === "USD"}
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="p-date">Buy date</Label>
            <Input
              id="p-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="p-notes">Notes (optional)</Label>
            <Textarea
              id="p-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Add item to inventory</p>
              <p className="text-xs text-muted-foreground">
                Keeps the buy date as its stock date. Turn off if you will trade it away.
              </p>
            </div>
            <Switch checked={stockIt} onCheckedChange={setStockIt} />
          </div>

          {stockIt ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="p-user">Username / account</Label>
              <Select value={username} onValueChange={setUsername} disabled={accounts.length === 0}>
                <SelectTrigger id="p-user">
                  <SelectValue placeholder={accounts.length ? "Select an account" : "Add an account first"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.username}>
                      {a.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add an account from the Accounts page before stocking this purchase.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!!error || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving..." : "Save purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
