import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { ALL_NAV_ITEMS, canAccess } from "@/lib/rbac";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/** Preferred tabs in priority order; the first 4 the user may access are shown. */
const PRIORITY = [
  "/dashboard",
  "/front-desk",
  "/rooms",
  "/housekeeping",
  "/restaurant/pos",
  "/restaurant/kitchen",
  "/maintenance",
  "/tasks",
  "/scan",
  "/mobile",
];

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = PRIORITY.map((to) => ALL_NAV_ITEMS.find((i) => i.to === to))
    .filter((i): i is NonNullable<typeof i> => !!i && canAccess(i, roles))
    .slice(0, 4);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="glass-strong grid grid-cols-5 gap-1 rounded-3xl border p-1.5 shadow-elegant">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition-all active:scale-95",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center">{item.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="col-start-5 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium text-muted-foreground transition-all active:scale-95"
        >
          <LayoutGrid className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
