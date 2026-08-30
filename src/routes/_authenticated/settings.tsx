import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, ErrorState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/NumberInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { INVALIDATE_ALL, seedDemoData, settingsQuery, updateSettings } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Adopt Me Manager" },
      {
        name: "description",
        content: "Set the USD exchange rate and default selling fee used for new sales.",
      },
      { property: "og:title", content: "Settings · Adopt Me Manager" },
      { property: "og:description", content: "Exchange rate and fee defaults." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery());
  const [rate, setRate] = useState("16000");
  const [fee, setFee] = useState("15");

  useEffect(() => {
    if (settings.data) {
      setRate(String(settings.data.usd_exchange_rate));
      setFee(String(settings.data.default_fee_percentage));
    }
  }, [settings.data]);

  let error: string | null = null;
  if (!(Number(rate) > 0)) error = "Exchange rate must be greater than 0.";
  else if (!(Number(fee) >= 0 && Number(fee) <= 100))
    error = "Fee percentage must be between 0 and 100.";

  const save = useMutation({
    mutationFn: async () =>
      updateSettings(settings.data!.id, {
        usd_exchange_rate: Number(rate),
        default_fee_percentage: Number(fee),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved", {
        description: "Existing sales keep the rate they were created with.",
      });
    },
    onError: (e: Error) => toast.error("Could not save settings", { description: e.message }),
  });

  const seed = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      INVALIDATE_ALL.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      toast.success("Demo data loaded");
    },
    onError: (e: Error) => toast.error("Could not load demo data", { description: e.message }),
  });

  return (
    <>
      <PageHeader title="Settings" description="Defaults applied when creating a new sale." />

      {settings.isLoading ? (
        <Skeleton className="h-56 rounded-xl" />
      ) : settings.error ? (
        <ErrorState message={(settings.error as Error).message} />
      ) : (
        <Card className="max-w-xl gap-5 p-6">
          <div className="grid gap-2">
            <Label htmlFor="s-rate">USD exchange rate (IDR per USD)</Label>
            <NumberInput
              id="s-rate"
              min={1}
              value={rate}
              onValueChange={setRate}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-fee">Default fee (%)</Label>
            <NumberInput
              id="s-fee"
              min={0}
              max={100}
              step="0.1"
              value={fee}
              onValueChange={setFee}
              decimals
            />
          </div>
          <div className="grid gap-2">
            <Label>Base currency</Label>
            <Input value="IDR" readOnly disabled />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Button disabled={!!error || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving..." : "Save settings"}
            </Button>
          </div>

          <Separator />

          <div className="grid gap-2">
            <p className="text-sm font-medium">Demo dataset</p>
            <p className="text-xs text-muted-foreground">
              Loads the Owl purchase, its trade into five pets and one example sale. Only works in
              an empty workspace.
            </p>
            <Button
              variant="outline"
              className="w-fit"
              disabled={seed.isPending}
              onClick={() => seed.mutate()}
            >
              {seed.isPending ? "Loading..." : "Load demo data"}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
