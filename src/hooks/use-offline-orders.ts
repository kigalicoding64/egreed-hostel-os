import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  queuedOrders,
  reconcileQueuedOrder,
  removeQueued,
  updateQueued,
  type QueuedOrder,
} from "@/lib/offline-queue";

/**
 * Tracks connectivity and reconciles offline POS orders back to the server:
 * duplicate-safe (client reference lookup), totals recomputed on replay and
 * per-entry failure state kept visible to the cashier.
 */
export function useOfflineOrders() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = useCallback(() => setQueue(queuedOrders()), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshQueue();
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [refreshQueue]);

  const sync = useCallback(
    async (silent = false) => {
      const pending = queuedOrders().filter((e) => e.state !== "syncing");
      if (!pending.length || !navigator.onLine) {
        if (!silent && !pending.length) toast.info("Nothing queued to sync");
        return;
      }
      setSyncing(true);
      let synced = 0;
      let failed = 0;

      for (const entry of pending) {
        updateQueued(entry.id, { state: "syncing" });
        try {
          // Idempotency: if this client reference already reached the server,
          // adopt that order instead of creating a duplicate.
          const { data: existing } = await supabase
            .from("pos_orders")
            .select("id")
            .ilike("notes", `%[offline:${entry.clientRef}]%`)
            .maybeSingle();

          let orderId = existing?.id ?? null;

          if (!orderId) {
            const payload = reconcileQueuedOrder(entry);
            const { data, error } = await supabase
              .from("pos_orders")
              .insert(payload as never)
              .select("id")
              .single();
            if (error) throw error;
            orderId = data.id;
          }

          const { count } = await supabase
            .from("pos_order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", orderId);

          if (!count) {
            const { error: itemsError } = await supabase
              .from("pos_order_items")
              .insert(entry.items.map((i) => ({ ...i, order_id: orderId })) as never);
            if (itemsError) throw itemsError;
          }

          const tableId = entry.order.table_id as string | null;
          if (tableId) {
            await supabase.from("restaurant_tables").update({ status: "occupied" }).eq("id", tableId);
          }

          removeQueued(entry.id);
          synced += 1;
        } catch (e) {
          failed += 1;
          updateQueued(entry.id, {
            state: "failed",
            attempts: entry.attempts + 1,
            lastError: e instanceof Error ? e.message : "Sync failed",
          });
        }
      }

      setSyncing(false);
      refreshQueue();
      qc.invalidateQueries({ queryKey: ["rms-orders"] });
      qc.invalidateQueries({ queryKey: ["rms-tables"] });
      if (synced) toast.success(`${synced} offline order(s) reconciled`);
      if (failed) toast.error(`${failed} order(s) failed to sync — will retry`);
    },
    [qc, refreshQueue],
  );

  // Auto-reconcile whenever connectivity returns.
  useEffect(() => {
    if (!online) return;
    if (!queuedOrders().length) return;
    void sync(true);
  }, [online, sync]);

  return { online, queue, pending: queue.length, syncing, sync, refreshQueue };
}
