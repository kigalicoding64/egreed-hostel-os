import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_INVENTORY_ALERT_CONFIG,
  INVENTORY_ALERT_SETTINGS_KEY,
  evaluateInventoryAlerts,
  parseAlertConfig,
  summariseAlerts,
  type AlertMovement,
  type AlertStockItem,
  type InventoryAlertConfig,
} from "@/lib/inventory-alerts";

const SEEN_KEY = "egreed.rms.inventory-alerts.seen";

function seen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function markSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const next = { ...seen() };
  for (const id of ids) next[id] = today;
  localStorage.setItem(SEEN_KEY, JSON.stringify(next));
}

/** Alert thresholds, persisted per hotel in `settings`. Falls back to defaults. */
export function useInventoryAlertConfig() {
  const query = useQuery({
    queryKey: ["rms-inventory-alert-config"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<InventoryAlertConfig> => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", INVENTORY_ALERT_SETTINGS_KEY)
        .maybeSingle();
      return parseAlertConfig(data?.value);
    },
  });

  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (input: { config: InventoryAlertConfig; hotelId: string | null }) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", INVENTORY_ALERT_SETTINGS_KEY)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("settings")
          .update({ value: input.config as never, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert({
          key: INVENTORY_ALERT_SETTINGS_KEY,
          hotel_id: input.hotelId,
          value: input.config as never,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms-inventory-alert-config"] }),
  });

  return {
    config: query.data ?? DEFAULT_INVENTORY_ALERT_CONFIG,
    isLoading: query.isLoading,
    save,
  };
}

/**
 * Evaluates low-stock / wastage alerts and (once per day per alert) pushes them
 * into the notification centre for the signed-in manager.
 */
export function useInventoryAlerts(opts: { notify?: boolean } = {}) {
  const { user } = useAuth();
  const { config } = useInventoryAlertConfig();

  const items = useQuery({
    queryKey: ["rms-inventory"],
    queryFn: async (): Promise<AlertStockItem[]> => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as AlertStockItem[];
    },
  });

  const movements = useQuery({
    queryKey: ["rms-inventory-movements", config.wasteWindowDays],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AlertMovement[]> => {
      const since = new Date(Date.now() - config.wasteWindowDays * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("inventory_item_id,type,quantity,unit_cost,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as AlertMovement[];
    },
  });

  const alerts = useMemo(
    () => evaluateInventoryAlerts(items.data ?? [], movements.data ?? [], config),
    [items.data, movements.data, config],
  );

  const qc = useQueryClient();
  const pushed = useRef(false);

  useEffect(() => {
    if (!opts.notify || !config.notify || !user?.id || pushed.current) return;
    if (!alerts.length) return;
    pushed.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const store = seen();
    const fresh = alerts.filter((a) => store[a.id] !== today).slice(0, 10);
    if (!fresh.length) return;
    void (async () => {
      const { error } = await supabase.from("notifications").insert(
        fresh.map((a) => ({
          user_id: user.id,
          title: a.title,
          message: a.detail,
          type: a.severity === "destructive" ? "warning" : "info",
          link: "/restaurant/inventory",
        })),
      );
      if (!error) {
        markSeen(fresh.map((a) => a.id));
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    })();
  }, [alerts, config.notify, opts.notify, user?.id, qc]);

  return {
    alerts,
    summary: summariseAlerts(alerts),
    config,
    isLoading: items.isLoading || movements.isLoading,
  };
}
