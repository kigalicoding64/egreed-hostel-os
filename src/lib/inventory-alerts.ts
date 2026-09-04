/**
 * Low-stock and waste alerting for the Restaurant (F&B) inventory.
 * Thresholds are configurable per hotel and persisted in the `settings` table
 * under the `rms.inventory_alerts` key.
 */

export const INVENTORY_ALERT_SETTINGS_KEY = "rms.inventory_alerts";

export interface InventoryAlertConfig {
  /** Alerts fire when stock <= reorder_level * lowStockFactor. */
  lowStockFactor: number;
  /** Stock <= reorder_level * criticalFactor is escalated to critical. */
  criticalFactor: number;
  /** Rolling window (days) used to evaluate waste. */
  wasteWindowDays: number;
  /** Waste value (per item, in outlet currency) that triggers an alert. */
  wasteValueThreshold: number;
  /** Waste as a % of the item's stock movement that triggers an alert. */
  wastePercentThreshold: number;
  /** Push alerts into the notification centre. */
  notify: boolean;
}

export const DEFAULT_INVENTORY_ALERT_CONFIG: InventoryAlertConfig = {
  lowStockFactor: 1,
  criticalFactor: 0.5,
  wasteWindowDays: 7,
  wasteValueThreshold: 25000,
  wastePercentThreshold: 10,
  notify: true,
};

export function parseAlertConfig(value: unknown): InventoryAlertConfig {
  if (!value || typeof value !== "object") return DEFAULT_INVENTORY_ALERT_CONFIG;
  const v = value as Partial<InventoryAlertConfig>;
  const num = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return {
    lowStockFactor: num(v.lowStockFactor, DEFAULT_INVENTORY_ALERT_CONFIG.lowStockFactor),
    criticalFactor: num(v.criticalFactor, DEFAULT_INVENTORY_ALERT_CONFIG.criticalFactor),
    wasteWindowDays: num(v.wasteWindowDays, DEFAULT_INVENTORY_ALERT_CONFIG.wasteWindowDays),
    wasteValueThreshold: num(
      v.wasteValueThreshold,
      DEFAULT_INVENTORY_ALERT_CONFIG.wasteValueThreshold,
    ),
    wastePercentThreshold: num(
      v.wastePercentThreshold,
      DEFAULT_INVENTORY_ALERT_CONFIG.wastePercentThreshold,
    ),
    notify: typeof v.notify === "boolean" ? v.notify : true,
  };
}

export type AlertKind = "out_of_stock" | "critical_stock" | "low_stock" | "waste";
export type AlertSeverity = "destructive" | "warning" | "info";

export interface InventoryAlert {
  id: string;
  itemId: string;
  item: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** Sort weight — higher is more urgent. */
  weight: number;
}

export interface AlertStockItem {
  id: string;
  name: string;
  unit: string;
  stock_on_hand: number;
  reorder_level: number;
  unit_cost: number;
  supplier?: string | null;
}

export interface AlertMovement {
  inventory_item_id: string;
  type: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

const KIND_WEIGHT: Record<AlertKind, number> = {
  out_of_stock: 40,
  critical_stock: 30,
  waste: 20,
  low_stock: 10,
};

/** Pure evaluation so the same rules can be reused by reports and future jobs. */
export function evaluateInventoryAlerts(
  items: AlertStockItem[],
  movements: AlertMovement[],
  config: InventoryAlertConfig,
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  const since = Date.now() - config.wasteWindowDays * 86_400_000;

  for (const item of items) {
    const stock = Number(item.stock_on_hand);
    const reorder = Number(item.reorder_level);
    const lowAt = reorder * config.lowStockFactor;
    const criticalAt = reorder * config.criticalFactor;

    if (stock <= 0) {
      alerts.push({
        id: `${item.id}:out_of_stock`,
        itemId: item.id,
        item: item.name,
        kind: "out_of_stock",
        severity: "destructive",
        title: `${item.name} is out of stock`,
        detail: `No ${item.unit} on hand. Reorder level is ${reorder} ${item.unit}.`,
        weight: KIND_WEIGHT.out_of_stock,
      });
    } else if (reorder > 0 && stock <= criticalAt) {
      alerts.push({
        id: `${item.id}:critical_stock`,
        itemId: item.id,
        item: item.name,
        kind: "critical_stock",
        severity: "destructive",
        title: `${item.name} critically low`,
        detail: `${stock} ${item.unit} left — below ${Math.round(
          config.criticalFactor * 100,
        )}% of the ${reorder} ${item.unit} reorder level.`,
        weight: KIND_WEIGHT.critical_stock,
      });
    } else if (reorder > 0 && stock <= lowAt) {
      alerts.push({
        id: `${item.id}:low_stock`,
        itemId: item.id,
        item: item.name,
        kind: "low_stock",
        severity: "warning",
        title: `${item.name} below reorder level`,
        detail: `${stock} ${item.unit} on hand against a ${reorder} ${item.unit} reorder level.`,
        weight: KIND_WEIGHT.low_stock,
      });
    }
  }

  // Waste analysis over the rolling window.
  const byItem = new Map<string, { waste: number; wasteValue: number; total: number }>();
  for (const m of movements) {
    if (new Date(m.created_at).getTime() < since) continue;
    const row = byItem.get(m.inventory_item_id) ?? { waste: 0, wasteValue: 0, total: 0 };
    const qty = Math.abs(Number(m.quantity));
    row.total += qty;
    if (m.type === "waste") {
      row.waste += qty;
      row.wasteValue += qty * Number(m.unit_cost);
    }
    byItem.set(m.inventory_item_id, row);
  }

  for (const item of items) {
    const row = byItem.get(item.id);
    if (!row || row.waste <= 0) continue;
    const pct = row.total > 0 ? (row.waste / row.total) * 100 : 0;
    const overValue = row.wasteValue >= config.wasteValueThreshold;
    const overPct = pct >= config.wastePercentThreshold;
    if (!overValue && !overPct) continue;
    alerts.push({
      id: `${item.id}:waste`,
      itemId: item.id,
      item: item.name,
      kind: "waste",
      severity: overValue ? "destructive" : "warning",
      title: `${item.name} wastage spike`,
      detail: `${row.waste.toFixed(2)} ${item.unit} wasted in the last ${
        config.wasteWindowDays
      } days (${pct.toFixed(0)}% of movement).`,
      weight: KIND_WEIGHT.waste,
    });
  }

  return alerts.sort((a, b) => b.weight - a.weight || a.item.localeCompare(b.item));
}

export function summariseAlerts(alerts: InventoryAlert[]) {
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "destructive").length,
    lowStock: alerts.filter((a) => a.kind !== "waste").length,
    waste: alerts.filter((a) => a.kind === "waste").length,
  };
}
