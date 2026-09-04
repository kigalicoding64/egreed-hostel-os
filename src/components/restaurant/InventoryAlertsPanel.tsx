import { useState } from "react";
import { AlertTriangle, BellRing, Settings2, Trash2, PackageX } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TonedBadge } from "@/components/common/TonedBadge";
import { useInventoryAlertConfig } from "@/hooks/use-inventory-alerts";
import type { InventoryAlert, InventoryAlertConfig } from "@/lib/inventory-alerts";

const KIND_ICON = {
  out_of_stock: PackageX,
  critical_stock: AlertTriangle,
  low_stock: AlertTriangle,
  waste: Trash2,
} as const;

export function InventoryAlertsPanel({
  alerts,
  canConfigure,
  hotelId,
}: {
  alerts: InventoryAlert[];
  canConfigure: boolean;
  hotelId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Stock & wastage alerts</h2>
          <TonedBadge tone={alerts.length ? "warning" : "success"}>
            {alerts.length ? `${alerts.length} active` : "All clear"}
          </TonedBadge>
        </div>
        {canConfigure && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Thresholds
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Every tracked item is above its reorder level and wastage is within the configured limits.
        </p>
      ) : (
        <ScrollArea className="max-h-64 pr-3">
          <ul className="space-y-2">
            {alerts.map((a) => {
              const Icon = KIND_ICON[a.kind];
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-2"
                >
                  <Icon
                    className={
                      a.severity === "destructive"
                        ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                        : "mt-0.5 h-4 w-4 shrink-0 text-warning"
                    }
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

      <ThresholdDialog open={open} onOpenChange={setOpen} hotelId={hotelId} />
    </Card>
  );
}

function ThresholdDialog({
  open,
  onOpenChange,
  hotelId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hotelId: string | null;
}) {
  const { config, save } = useInventoryAlertConfig();
  const [draft, setDraft] = useState<InventoryAlertConfig>(config);

  const field = (k: keyof InventoryAlertConfig, v: number) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(config);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alert thresholds</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="low">Low-stock factor (× reorder)</Label>
            <Input
              id="low"
              type="number"
              step="0.1"
              value={draft.lowStockFactor}
              onChange={(e) => field("lowStockFactor", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crit">Critical factor (× reorder)</Label>
            <Input
              id="crit"
              type="number"
              step="0.1"
              value={draft.criticalFactor}
              onChange={(e) => field("criticalFactor", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="win">Waste window (days)</Label>
            <Input
              id="win"
              type="number"
              value={draft.wasteWindowDays}
              onChange={(e) => field("wasteWindowDays", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wval">Waste value limit</Label>
            <Input
              id="wval"
              type="number"
              value={draft.wasteValueThreshold}
              onChange={(e) => field("wasteValueThreshold", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wpct">Waste share limit (%)</Label>
            <Input
              id="wpct"
              type="number"
              value={draft.wastePercentThreshold}
              onChange={(e) => field("wastePercentThreshold", Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:col-span-2">
            <Label htmlFor="notify">Send to notification centre</Label>
            <Switch
              id="notify"
              checked={draft.notify}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, notify: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { config: draft, hotelId },
                {
                  onSuccess: () => {
                    toast.success("Alert thresholds saved");
                    onOpenChange(false);
                  },
                  onError: (e: Error) => toast.error(e.message),
                },
              )
            }
          >
            Save thresholds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
