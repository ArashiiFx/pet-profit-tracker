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
import { Separator } from "@/components/ui/separator";
import { INVALIDATE_ALL, sellStock } from "@/lib/queries";
import { idr, today, usd } from "@/lib/format";
import type { InventoryItem, Settings } from "@/types";

export function SellModal({
  item,
  settings,
  open,
  onOpenChange,
}: {
  item: InventoryItem | null;
  settings: Settings | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [saleDate, setSaleDate] = useState(today());
  const [rate, setRate] = useState("16000");
  const [fee, setFee] = useState("15");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && item) {
      setQuantity("1");
      setPrice("");
      setSaleDate(today());
      setRate(String(settings?.usd_exchange_rate ?? 16000));
      setFee(String(settings?.default_fee_percentage ?? 15));
      setNotes("");
    }
  }, [open, item, settings]);

  const qty = Number(quantity) || 0;
  const priceNum = Number(price) || 0;
  const rateNum = Number(rate) || 0;
  const feeNum = Number(fee) || 0;
  const gross = priceNum * qty;
  const feeUsd = (gross * feeNum) / 100;
  const net = gross - feeUsd;
  const netIdr = net * rateNum;

  const available = item?.quantity ?? 0;
  let error: string | null = null;
  if (qty <= 0) error = "Quantity must be greater than 0.";
  else if (qty > available) error = `You only have ${available} of this pet available.`;
  else if (priceNum <= 0) error = "Sell price must be greater than 0.";
  else if (rateNum <= 0) error = "Exchange rate must be greater than 0.";
  else if (feeNum < 0 || feeNum > 100) error = "Fee percentage must be between 0 and 100.";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      return sellStock({
        inventory_id: item.id,
        quantity: qty,
        price_usd: priceNum,
        exchange_rate: rateNum,
        fee_percentage: feeNum,
        sale_date: saleDate,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Sale recorded", { description: `${qty} × ${item?.pet_name} sold.` });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not record the sale", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sell {item?.pet_name}</DialogTitle>
          <DialogDescription>
            {item?.username} · {available} available · selling price is entered manually per sale.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sell-qty">Quantity to sell</Label>
            <NumberInput
              id="sell-qty"
              min={1}
              max={available}
              value={quantity}
              onValueChange={setQuantity}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sell-price">Sell price per pet (USD)</Label>
            <NumberInput
              id="sell-price"
              min={0}
              step="0.01"
              placeholder="20.00"
              value={price}
              onValueChange={setPrice}
              decimals
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sell-date">Sell date</Label>
            <Input
              id="sell-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sell-rate">Exchange rate (IDR)</Label>
            <NumberInput
              id="sell-rate"
              min={1}
              value={rate}
              onValueChange={setRate}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sell-fee">Fee (%)</Label>
            <NumberInput
              id="sell-fee"
              min={0}
              max={100}
              step="0.1"
              value={fee}
              onValueChange={setFee}
              decimals
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="sell-notes">Notes (optional)</Label>
            <Textarea
              id="sell-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-1.5 rounded-lg border border-border bg-card p-4 text-sm">
          <Row label="Quantity" value={String(qty)} />
          <Row label="Price per pet" value={usd(priceNum)} />
          <Row label="Gross sale" value={usd(gross)} />
          <Row label={`Fee ${feeNum}%`} value={`-${usd(feeUsd)}`} tone="destructive" />
          <Row label="Net sale" value={usd(net)} tone="success" />
          <Row label="Exchange rate" value={idr(rateNum)} />
          <Row label="Net sale IDR" value={idr(netIdr)} tone="success" />
          <p className="mt-2 text-xs text-muted-foreground">
            Profit attribution unavailable — traded pets have no individual cost basis. Profit is
            tracked at purchase level in Reports.
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!!error || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving..." : "Confirm sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          "num font-medium " +
          (tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
