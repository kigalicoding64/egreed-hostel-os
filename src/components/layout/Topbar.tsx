import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { RoleBadge } from "@/components/common/RoleBadge";
import { initials } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

export function Topbar({
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global search */}
      <button
        onClick={onOpenSearch}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <NotificationCenterLazy />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted/60">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {initials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {profile?.full_name || "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              {roles[0] && (
                <div className="mt-2">
                  <RoleBadge role={roles[0]} />
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// Keep NotificationCenter isolated so it manages its own query.
import { NotificationCenter } from "./NotificationCenter";
function NotificationCenterLazy() {
  return <NotificationCenter />;
}
