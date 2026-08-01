import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  UtensilsCrossed,
  LayoutGrid,
  ChefHat,
  Table2,
  BookOpen,
  Store,
  Boxes,
  PartyPopper,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/restaurant")({
  component: RestaurantLayout,
});

const TABS: { to: string; label: string; icon: typeof LayoutGrid; roles?: AppRole[] }[] = [
  { to: "/restaurant", label: "Overview", icon: LayoutGrid },
  {
    to: "/restaurant/pos",
    label: "POS",
    icon: UtensilsCrossed,
    roles: ["restaurant_manager", "cashier", "waiter", "bar_staff", "receptionist"],
  },
  {
    to: "/restaurant/kitchen",
    label: "Kitchen",
    icon: ChefHat,
    roles: ["restaurant_manager", "chef", "kitchen_staff", "waiter"],
  },
  {
    to: "/restaurant/tables",
    label: "Floor Plan",
    icon: Table2,
    roles: ["restaurant_manager", "cashier", "waiter", "bar_staff"],
  },
  { to: "/restaurant/menu", label: "Menu", icon: BookOpen, roles: ["restaurant_manager", "chef"] },
  { to: "/restaurant/outlets", label: "Outlets", icon: Store, roles: ["restaurant_manager"] },
  {
    to: "/restaurant/inventory",
    label: "Inventory",
    icon: Boxes,
    roles: ["restaurant_manager", "chef", "kitchen_staff"],
  },
  {
    to: "/restaurant/banquets",
    label: "Banquets",
    icon: PartyPopper,
    roles: ["restaurant_manager", "receptionist"],
  },
  {
    to: "/restaurant/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["restaurant_manager", "accountant"],
  },
];

function RestaurantLayout() {
  const { hasAnyRole } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const visible = TABS.filter(
    (t) => !t.roles || hasAnyRole([...t.roles, "hotel_owner", "general_manager"]),
  );

  return (
    <div className="space-y-6">
      <nav
        aria-label="Restaurant sections"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border bg-card/60 p-1"
      >
        {visible.map((t) => {
          const active = t.to === "/restaurant" ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
