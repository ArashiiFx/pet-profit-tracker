import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVALIDATE_ALL, createTrade } from "@/lib/queries";
import { today } from "@/lib/format";
import type { Account, InventoryItem, ReceivedPetInput } from "@/types";

const emptyPet = (username: string): ReceivedPetInput => ({
  pet_name: "",
  quantity: 1,
  username,
});

export function TradeModal({
  open,
  onOpenChange,
  inventory,
  accounts,
  defaultPurchaseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inventory: InventoryItem[];
  accounts: Account[];
  defaultPurchaseId?: string | undefined;
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState("");
  const [sourceQuantity, setSourceQuantity] = useState("1");
  const [tradedItem, setTradedItem] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [pets, setPets] = useState<ReceivedPetInput[]>([emptyPet("")]);
  const selectedSource = inventory.find((item) => `inventory:${item.id}` === source);

  useEffect(() => {
    if (open) {
      const initial = defaultPurchaseId
        ? inventory.find((item) => item.purchase_id === defaultPurchaseId)
          ? `inventory:${inventory.find((item) => item.purchase_id === defaultPurchaseId)?.id}`
          : inventory[0]
            ? `inventory:${inventory[0].id}`
            : ""
        : inventory[0]
          ? `inventory:${inventory[0].id}`
          : "";
      setSource(initial);
      setSourceQuantity("1");
      setTradedItem(inventory.find((i) => `inventory:${i.id}` === initial)?.pet_name ?? "");
      setDate(today());
      setNotes("");
      setPets([emptyPet(accounts[0]?.username ?? "")]);
    }
  }, [open, defaultPurchaseId, inventory, accounts]);

  const setPet = (index: number, patch: Partial<ReceivedPetInput>) =>
    setPets((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  let error: string | null = null;
  if (!source) error = "Select the pet or purchase you traded away.";
  else if (!tradedItem.trim()) error = "Traded item is required.";
  else if (!(Number(sourceQuantity) > 0)) error = "Trade quantity must be greater than 0.";
  else if (selectedSource && Number(sourceQuantity) > selectedSource.quantity)
    error = `You only have ${selectedSource.quantity} of this pet available.`;
  else if (!date) error = "Trade date is required.";
  else if (pets.length === 0) error = "Add at least one received pet.";
  else if (pets.some((p) => !p.pet_name.trim())) error = "Pet name cannot be empty.";
  else if (pets.some((p) => !p.username.trim())) error = "Username cannot be empty.";
  else if (pets.some((p) => !(Number(p.quantity) > 0)))
    error = "Quantity must be greater than 0.";

  const mutation = useMutation({
    mutationFn: () =>
      createTrade({
        purchase_id: source.startsWith("purchase:") ? source.slice("purchase:".length) : (inventory.find((i) => `inventory:${i.id}` === source)?.purchase_id ?? null),
        source_inventory_id: source.startsWith("inventory:") ? source.slice("inventory:".length) : null,
        source_quantity: Number(sourceQuantity),
        traded_item: tradedItem.trim(),
        trade_date: date,
        notes: notes.trim() || null,
        pets: pets.map((p) => ({
          pet_name: p.pet_name.trim(),
          quantity: Number(p.quantity),
          username: p.username.trim(),
        })),
      }),
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Trade saved", { description: "Received pets were added to inventory." });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Could not save trade", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New trade</DialogTitle>
          <DialogDescription>
            Trade a purchased item into pets. Received pets go straight into inventory and identical
            pets in the same account are grouped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Source pet or purchase</Label>
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v);
                setSourceQuantity("1");
                setTradedItem(inventory.find((i) => `inventory:${i.id}` === v)?.pet_name ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a pet or purchase" />
              </SelectTrigger>
              <SelectContent>
                {inventory.length > 0 ? (
                  inventory.map((item) => (
                    <SelectItem key={`inventory:${item.id}`} value={`inventory:${item.id}`}>
                      {item.pet_name} · {item.quantity} · {item.username} · inventory
                    </SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="t-item">Traded item</Label>
            <Input
              id="t-item"
              value={tradedItem}
              onChange={(e) => setTradedItem(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="t-date">Trade date</Label>
            <Input
              id="t-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:max-w-[180px]">
          <Label htmlFor="t-source-qty">Quantity to trade</Label>
          <NumberInput
            id="t-source-qty"
            min={1}
            max={selectedSource?.quantity}
            value={sourceQuantity}
            onValueChange={setSourceQuantity}
          />
          {selectedSource ? (
            <p className="text-xs text-muted-foreground">{selectedSource.quantity} available</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>Received pets</Label>
          <div className="flex flex-col gap-2">
            {pets.map((pet, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_auto] gap-2">
                <Input
                  placeholder="Pet name"
                  value={pet.pet_name}
                  onChange={(e) => setPet(i, { pet_name: e.target.value })}
                />
                <NumberInput
                  min={1}
                  value={String(pet.quantity)}
                  onValueChange={(value) => setPet(i, { quantity: Number(value) || 0 })}
                />
                <Input
                  list="trade-account-options"
                  placeholder="Username"
                  value={pet.username}
                  onChange={(e) => setPet(i, { username: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPets((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={pets.length === 1}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <datalist id="trade-account-options">
              {accounts.map((a) => (
                <option key={a.id} value={a.username} />
              ))}
            </datalist>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              setPets((prev) => [
                ...prev,
                emptyPet(prev[prev.length - 1]?.username ?? accounts[0]?.username ?? ""),
              ])
            }
          >
            <Plus className="size-4" /> Add pet
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="t-notes">Notes (optional)</Label>
          <Textarea id="t-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!!error || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving..." : "Save trade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
