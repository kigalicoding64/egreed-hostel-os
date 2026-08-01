/**
 * Tiny offline-first queue for POS orders. When the browser is offline the
 * order payload is stored locally and flushed automatically on reconnect.
 */
export interface QueuedOrder {
  id: string;
  createdAt: string;
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
}

const KEY = "egreed.rms.queue";

function read(): QueuedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedOrder[];
  } catch {
    return [];
  }
}

function write(rows: QueuedOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function enqueueOrder(entry: Omit<QueuedOrder, "id" | "createdAt">): QueuedOrder {
  const row: QueuedOrder = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  write([...read(), row]);
  return row;
}

export function queuedOrders(): QueuedOrder[] {
  return read();
}

export function removeQueued(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function clearQueue() {
  write([]);
}
