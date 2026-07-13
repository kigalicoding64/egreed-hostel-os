import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Hotel, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, canAccess } from "@/lib/rbac";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[70px]" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Hotel className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">EGREED</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              Hospitality Enterprise
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => canAccess(i, roles));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.to || pathname.startsWith(item.to + "/");
                  const link = (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary/15 text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <span className="relative">
                        {active && (
                          <motion.span
                            layoutId="active-dot"
                            className="absolute -left-2.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary"
                          />
                        )}
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            active
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
                          )}
                        />
                      </span>
                      {!collapsed && <span className="truncate">{item.title}</span>}
                      {!collapsed && item.soon && (
                        <Sparkles className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/40" />
                      )}
                    </Link>
                  );
                  return collapsed ? (
                    <Tooltip key={item.to} delayDuration={0}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
