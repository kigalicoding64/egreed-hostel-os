import type { QrKind } from "@/lib/qr";

/** Where a scanned code takes signed-in staff. */
export function staffDestination(kind: QrKind): { to: string; label: string } {
  switch (kind) {
    case "room":
      return { to: "/rooms", label: "Open rooms" };
    case "table":
      return { to: "/restaurant/pos", label: "Open the POS" };
    case "asset":
      return { to: "/maintenance", label: "Log maintenance" };
    case "booking":
      return { to: "/front-desk", label: "Open the front desk" };
    case "key":
      return { to: "/front-desk", label: "Open room keys" };
  }
}
