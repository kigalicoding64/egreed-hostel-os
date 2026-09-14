/** Shared booking helpers: date maths, availability and rate calculation. */

export const BLOCKING_STATUSES = ["pending", "confirmed", "checked_in"] as const;

export interface StayWindow {
  check_in: string;
  check_out: string;
}

export function toISODate(d: Date): string {
  const copy = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** List of ISO dates starting at `startISO`, `count` long. */
export function rangeDays(startISO: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(startISO, i));
}

/** Half-open overlap test: [aIn, aOut) vs [bIn, bOut). */
export function overlaps(a: StayWindow, b: StayWindow): boolean {
  return a.check_in < b.check_out && a.check_out > b.check_in;
}

export function blocks(status: string): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status);
}

export interface ConflictCandidate extends StayWindow {
  id: string;
  room_id: string | null;
  status: string;
  reference?: string | null;
}

/** Returns the first reservation blocking this room/date range, if any. */
export function findConflict(
  candidates: ConflictCandidate[],
  roomId: string,
  window: StayWindow,
  ignoreId?: string,
): ConflictCandidate | null {
  return (
    candidates.find(
      (c) =>
        c.room_id === roomId &&
        c.id !== ignoreId &&
        blocks(c.status) &&
        overlaps(c, window),
    ) ?? null
  );
}

export interface RatePlanLike {
  adjustment_type: string;
  adjustment_value: number;
}

/** Applies a rate plan adjustment to a nightly base rate. */
export function applyRatePlan(baseRate: number, plan?: RatePlanLike | null): number {
  if (!plan) return baseRate;
  const value = Number(plan.adjustment_value ?? 0);
  if (plan.adjustment_type === "percent" || plan.adjustment_type === "percentage") {
    return Math.max(0, baseRate + (baseRate * value) / 100);
  }
  return Math.max(0, baseRate + value);
}

export interface QuoteInput {
  nightlyRate: number;
  nights: number;
  discount?: number;
  taxRate?: number;
}

export interface Quote {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function quoteStay({
  nightlyRate,
  nights,
  discount = 0,
  taxRate = 0,
}: QuoteInput): Quote {
  const subtotal = Math.max(0, nightlyRate) * Math.max(1, nights);
  const disc = Math.min(Math.max(0, discount), subtotal);
  const tax = ((subtotal - disc) * Math.max(0, taxRate)) / 100;
  return {
    subtotal,
    discount: disc,
    tax,
    total: subtotal - disc + tax,
  };
}

export function shortDay(iso: string): { day: string; label: string; weekend: boolean } {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay();
  return {
    day: String(d.getDate()),
    label: d.toLocaleDateString("en", { weekday: "short" }),
    weekend: dow === 0 || dow === 6,
  };
}
