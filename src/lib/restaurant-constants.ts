/** Shared constants + money maths for the Restaurant / POS module. */

export const OUTLET_TYPES = [
  "restaurant",
  "bar",
  "coffee_shop",
  "room_service",
  "banquet",
  "conference",
  "pool_bar",
  "outdoor",
  "vip_lounge",
] as const;
export type OutletType = (typeof OUTLET_TYPES)[number];

export const OUTLET_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  coffee_shop: "Coffee Shop",
  room_service: "Room Service",
  banquet: "Banquet",
  conference: "Conference Catering",
  pool_bar: "Pool Bar",
  outdoor: "Outdoor Dining",
  vip_lounge: "VIP Lounge",
};

export const TABLE_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "cleaning",
  "out_of_service",
] as const;
export const TABLE_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  cleaning: "Cleaning",
  out_of_service: "Out of Service",
};
export const TABLE_STATUS_TONE: Record<string, string> = {
  available: "success",
  reserved: "info",
  occupied: "warning",
  cleaning: "primary",
  out_of_service: "destructive",
};

export const ORDER_TYPES = [
  "dine_in",
  "takeaway",
  "bar",
  "room_service",
  "banquet",
  "delivery",
] as const;
export const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  bar: "Bar",
  room_service: "Room Service",
  banquet: "Banquet",
  delivery: "Delivery",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  sent: "Sent to Kitchen",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Voided",
  refunded: "Refunded",
};
export const ORDER_STATUS_TONE: Record<string, string> = {
  open: "info",
  sent: "primary",
  partially_paid: "warning",
  paid: "success",
  void: "destructive",
  refunded: "destructive",
};

export const KITCHEN_STATUSES = ["new", "preparing", "ready", "served", "cancelled"] as const;
export type KitchenStatus = (typeof KITCHEN_STATUSES)[number];
export const KITCHEN_STATUS_LABELS: Record<string, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};
export const KITCHEN_STATUS_TONE: Record<string, string> = {
  new: "info",
  preparing: "warning",
  ready: "success",
  served: "neutral",
  cancelled: "destructive",
};

export const ORDER_PRIORITIES = ["normal", "vip", "urgent", "late"] as const;
export const ORDER_PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  vip: "VIP",
  urgent: "Urgent",
  late: "Late",
};
export const ORDER_PRIORITY_TONE: Record<string, string> = {
  normal: "neutral",
  vip: "primary",
  urgent: "destructive",
  late: "warning",
};

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "mtn_momo",
  "airtel_money",
  "bank_transfer",
  "mobile_money",
  "other",
] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Visa / Mastercard",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  other: "Other",
};

export const BANQUET_STATUSES = [
  "inquiry",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const BANQUET_STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const BANQUET_STATUS_TONE: Record<string, string> = {
  inquiry: "info",
  confirmed: "primary",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
};

export const BANQUET_EVENT_TYPES = [
  "conference",
  "wedding",
  "corporate",
  "birthday",
  "buffet",
  "other",
] as const;

export const STOCK_MOVE_TYPES = ["usage", "waste", "restock", "adjustment"] as const;
export const STOCK_MOVE_LABELS: Record<string, string> = {
  usage: "Usage",
  waste: "Waste",
  restock: "Restock",
  adjustment: "Adjustment",
};

/** Roles allowed to run the restaurant module, by capability. */
export const RMS_MANAGER_ROLES = [
  "hotel_owner",
  "general_manager",
  "restaurant_manager",
] as const;
export const RMS_SERVICE_ROLES = ["cashier", "waiter", "bar_staff", "receptionist"] as const;
export const RMS_KITCHEN_ROLES = ["chef", "kitchen_staff"] as const;

export interface OrderTotalsInput {
  lines: { quantity: number; unit_price: number; discount?: number; voided?: boolean }[];
  discount?: number;
  taxRate: number;
  serviceRate: number;
  tip?: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  tip: number;
  total: number;
}

/** Single source of truth for bill maths — used by POS, receipts and reports. */
export function computeOrderTotals({
  lines,
  discount = 0,
  taxRate,
  serviceRate,
  tip = 0,
}: OrderTotalsInput): OrderTotals {
  const subtotal = lines
    .filter((l) => !l.voided)
    .reduce((sum, l) => sum + l.quantity * l.unit_price - (l.discount ?? 0), 0);
  const net = Math.max(subtotal - discount, 0);
  const serviceCharge = round(net * (serviceRate / 100));
  const tax = round((net + serviceCharge) * (taxRate / 100));
  return {
    subtotal: round(subtotal),
    discount: round(discount),
    serviceCharge,
    tax,
    tip: round(tip),
    total: round(net + serviceCharge + tax + tip),
  };
}

function round(n: number) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function nextOrderNumber(prefix = "ORD"): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${stamp}-${rand}`;
}

/** Minutes elapsed since a timestamp — kitchen timers. */
export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}
