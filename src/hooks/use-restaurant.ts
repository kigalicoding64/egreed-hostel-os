import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/rbac";
import {
  RMS_KITCHEN_ROLES,
  RMS_MANAGER_ROLES,
  RMS_SERVICE_ROLES,
} from "@/lib/restaurant-constants";

export interface Outlet {
  id: string;
  hotel_id: string;
  name: string;
  type: string;
  location: string | null;
  opens_at: string;
  closes_at: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  kind: string;
  outlet_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  hotel_id: string;
  outlet_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  cost_price: number;
  tax_category: string;
  ingredients: string[];
  allergens: string[];
  prep_minutes: number;
  calories: number | null;
  is_available: boolean;
  is_alcoholic: boolean;
  age_restricted: boolean;
  barcode: string | null;
  sku: string | null;
}

export interface RestaurantTable {
  id: string;
  hotel_id: string;
  outlet_id: string;
  name: string;
  seats: number;
  status: string;
  shape: string;
  pos_x: number;
  pos_y: number;
  merged_into: string | null;
  notes: string | null;
}

export interface OrderLine {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  line_total: number;
  modifiers: string[];
  notes: string | null;
  kitchen_status: string;
  voided: boolean;
  created_at: string;
}

export interface PosOrder {
  id: string;
  hotel_id: string;
  outlet_id: string;
  order_number: string;
  type: string;
  status: string;
  kitchen_status: string;
  priority: string;
  table_id: string | null;
  room_id: string | null;
  guest_id: string | null;
  waiter_id: string | null;
  covers: number;
  subtotal: number;
  discount: number;
  service_charge: number;
  tax: number;
  tip: number;
  total: number;
  paid_amount: number;
  charged_to_room: boolean;
  notes: string | null;
  special_requests: string | null;
  opened_at: string;
  closed_at: string | null;
  delivered_at: string | null;
  pos_order_items?: OrderLine[];
  restaurant_tables?: { name: string } | null;
  rooms?: { room_number: string } | null;
  outlets?: { name: string; type: string } | null;
}

const OUTLET_KEY = "egreed.rms.outlet";

/** Restaurant capability flags derived from the signed-in user's roles. */
export function useRmsAccess() {
  const { hasAnyRole, roles } = useAuth();
  const isManager = hasAnyRole([...RMS_MANAGER_ROLES] as AppRole[]);
  const isService = hasAnyRole([...RMS_SERVICE_ROLES] as AppRole[]);
  const isKitchen = hasAnyRole([...RMS_KITCHEN_ROLES] as AppRole[]);
  return {
    roles,
    isManager,
    canSell: isManager || isService,
    canCook: isManager || isKitchen,
    canVoid: isManager,
    canRefund: isManager,
    canDiscount: isManager || hasAnyRole(["cashier"]),
    canManageMenu: isManager || hasAnyRole(["chef"]),
    canManageInventory: isManager || hasAnyRole(["chef"]),
  };
}

/** Outlets + the currently selected outlet (persisted per browser). */
export function useOutlets() {
  const query = useQuery({
    queryKey: ["rms-outlets"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Outlet[]> => {
      const { data, error } = await supabase
        .from("outlets")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Outlet[];
    },
  });

  const [outletId, setOutletId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data?.length) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(OUTLET_KEY) : null;
    const valid = stored && query.data.some((o) => o.id === stored) ? stored : null;
    setOutletId((prev) => prev ?? valid ?? query.data[0]!.id);
  }, [query.data]);

  const select = useCallback((id: string) => {
    setOutletId(id);
    if (typeof window !== "undefined") localStorage.setItem(OUTLET_KEY, id);
  }, []);

  const outlet = query.data?.find((o) => o.id === outletId) ?? null;
  return { ...query, outlets: query.data ?? [], outlet, outletId, select };
}

export function useMenu(outletId: string | null) {
  return useQuery({
    queryKey: ["rms-menu", outletId],
    enabled: true,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [cats, items] = await Promise.all([
        supabase.from("menu_categories").select("*").order("sort_order"),
        supabase.from("menu_items").select("*").order("sort_order").order("name"),
      ]);
      if (cats.error) throw cats.error;
      if (items.error) throw items.error;
      return {
        categories: (cats.data ?? []) as unknown as MenuCategory[],
        items: (items.data ?? []) as unknown as MenuItem[],
      };
    },
  });
}

export function useTables(outletId: string | null) {
  return useQuery({
    queryKey: ["rms-tables", outletId],
    enabled: !!outletId,
    queryFn: async (): Promise<RestaurantTable[]> => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("outlet_id", outletId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as RestaurantTable[];
    },
  });
}

const ORDER_SELECT =
  "*,pos_order_items(*),restaurant_tables(name),rooms(room_number),outlets(name,type)";

export function useOrders(opts: {
  outletId?: string | null;
  statuses?: string[];
  kitchen?: boolean;
  refetchInterval?: number;
}) {
  const { outletId, statuses, kitchen, refetchInterval } = opts;
  return useQuery({
    queryKey: ["rms-orders", outletId ?? "all", statuses?.join(",") ?? "all", !!kitchen],
    refetchInterval: refetchInterval ?? false,
    queryFn: async (): Promise<PosOrder[]> => {
      let q = supabase.from("pos_orders").select(ORDER_SELECT);
      if (outletId) q = q.eq("outlet_id", outletId);
      if (statuses?.length) q = q.in("status", statuses as never[]);
      const { data, error } = await q.order("opened_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as PosOrder[];
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ["rms-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
