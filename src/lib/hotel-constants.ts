/** Shared domain constants for the Reservation & Room Management modules. */

export const ROOM_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "dirty",
  "cleaning",
  "inspected",
  "maintenance",
  "out_of_order",
  "out_of_service",
  "blocked",
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  dirty: "Dirty",
  cleaning: "Cleaning",
  inspected: "Inspected",
  maintenance: "Maintenance",
  out_of_order: "Out of Order",
  out_of_service: "Out of Service",
  blocked: "Blocked",
};

export const CLEANING_STATUSES = ["clean", "dirty", "in_progress", "inspected"] as const;
export const CLEANING_STATUS_LABELS: Record<string, string> = {
  clean: "Clean",
  dirty: "Dirty",
  in_progress: "In Progress",
  inspected: "Inspected",
};

export const MAINTENANCE_STATUSES = ["ok", "reported", "in_progress", "resolved"] as const;
export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  reported: "Reported",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const BED_TYPES = [
  "Single",
  "Double",
  "Twin",
  "Queen",
  "King",
  "Sofa Bed",
  "Bunk",
] as const;

export const RESERVATION_STATUSES = [
  "draft",
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
  "waitlist",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_SOURCES = [
  "walk_in",
  "phone",
  "email",
  "website",
  "corporate",
  "group",
  "travel_agent",
  "ota",
] as const;
export const RESERVATION_SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  phone: "Phone",
  email: "Email",
  website: "Website",
  corporate: "Corporate",
  group: "Group",
  travel_agent: "Travel Agent",
  ota: "OTA",
};

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "mtn_momo",
  "airtel_money",
  "mobile_money",
  "other",
] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  mobile_money: "Mobile Money",
  other: "Other",
};

/** Number of nights between two ISO date strings (min 1). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/** Generates a human-friendly confirmation number. */
export function generateConfirmation(prefix = "EGD"): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}
