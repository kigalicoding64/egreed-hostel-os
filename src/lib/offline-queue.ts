/**
 * Offline-first queue for POS orders with reconciliation.
 *
 * When the browser is offline the order payload is stored locally with a stable
 * client reference. On reconnect each entry is replayed exactly once: totals are
 * recomputed from the stored lines and outlet tax/service rates, and the client
 * reference is used to detect an order that already reached the server.
 */
import { computeOrderTotals } from "@/lib/restaurant-constants";

export type QueueState = "pending" | "syncing" | "failed" | "synced";

export interface QueuedOrder {
  id: string;
  /** Stable idempotency key, mirrored into the order number / notes. */
  clientRef: string;
  createdAt: string;
  state: QueueState;
  attempts: number;
  lastError: string | null;
  /** Tax + service rates captured at capture-time so totals stay correct. */
  rates: { taxRate: number; serviceRate: number; discount: number; tip: number };
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
}

const KEY = "egreed.rms.queue";

function read(): QueuedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedOrder[];
    return Array.isArray(rows) ? rows.filter((r) => r && r.order) : [];
  } catch {
    return [];
  }
}

function write(rows: QueuedOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function enqueueOrder(entry: {
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
  rates: QueuedOrder["rates"];
}): QueuedOrder {
  const clientRef = crypto.randomUUID();
  const row: QueuedOrder = {
    id: clientRef,
    clientRef,
    createdAt: new Date().toISOString(),
    state: "pending",
    attempts: 0,
    lastError: null,
    rates: entry.rates,
    order: { ...entry.order, notes: withRef(entry.order.notes, clientRef) },
    items: entry.items,
  };
  write([...read(), row]);
  return row;
}

function withRef(notes: unknown, ref: string) {
  const base = typeof notes === "string" && notes.trim() ? `${notes.trim()}\n` : "";
  return `${base}[offline:${ref}]`;
}

export function queuedOrders(): QueuedOrder[] {
  return read().filter((r) => r.state !== "synced");
}

export function pendingCount(): number {
  return queuedOrders().length;
}

export function updateQueued(id: string, patch: Partial<QueuedOrder>) {
  write(read().map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function removeQueued(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function clearQueue() {
  write([]);
}

/**
 * Recomputes an entry's monetary fields from its stored lines so a queued order
 * never syncs with stale or partially written totals.
 */
export function reconcileQueuedOrder(entry: QueuedOrder): Record<string, unknown> {
  const lines = entry.items.map((i) => ({
    quantity: Number(i.quantity ?? 0),
    unit_price: Number(i.unit_price ?? 0),
    discount: Number(i.discount ?? 0),
    voided: Boolean(i.voided),
  }));
  const totals = computeOrderTotals({
    lines,
    discount: entry.rates.discount,
    taxRate: entry.rates.taxRate,
    serviceRate: entry.rates.serviceRate,
    tip: entry.rates.tip,
  });
  return {
    ...entry.order,
    subtotal: totals.subtotal,
    discount: totals.discount,
    service_charge: totals.serviceCharge,
    tax: totals.tax,
    tip: totals.tip,
    total: totals.total,
    // Offline orders always land as sent-to-kitchen and unpaid until settled.
    status: "sent",
    kitchen_status: "new",
    paid_amount: 0,
  };
}
