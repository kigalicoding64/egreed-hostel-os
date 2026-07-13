import { useState } from "react";
import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Hotel } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NAV_GROUPS, canAccess } from "@/lib/rbac";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNav(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile navigation */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">EGREED</p>
              <p className="text-[11px] text-sidebar-foreground/60">
                Hospitality Enterprise
              </p>
            </div>
          </div>
          <nav className="space-y-5 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((i) => canAccess(i, roles));
              if (!items.length) return null;
              return (
                <div key={group.label}>
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active =
                        pathname === item.to || pathname.startsWith(item.to + "/");
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileNav(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium",
                            active
                              ? "bg-sidebar-primary/15 text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent",
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
