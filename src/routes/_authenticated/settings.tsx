import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Moon, Sun, Monitor, ShieldCheck } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleBadge } from "@/components/common/RoleBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isManagement } from "@/lib/rbac";
import { GuestInfoCard } from "@/components/settings/GuestInfoCard";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | EGREED Hospitality" },
      { name: "description", content: "Appearance, access and guest information settings." },
      { property: "og:title", content: "Settings | EGREED Hospitality" },
      { property: "og:description", content: "Personalise your workspace and set what guests are told." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { roles, profile } = useAuth();
  const canEditGuestInfo = isManagement(roles);

  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Personalize your workspace." icon={<SettingsIcon className="h-5 w-5" />} />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Choose how EGREED looks to you.</p>
          <div className="flex flex-wrap gap-3">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setTheme(o.value)}
                className={cn(
                  "flex w-32 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
                  theme === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <o.icon className={cn("h-6 w-6", theme === o.value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Access & Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Signed in as</span>
            <span className="text-sm font-medium">{profile?.email}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground">Your roles</span>
            <div className="flex flex-wrap justify-end gap-1">
              {roles.length ? roles.map((r) => <RoleBadge key={r} role={r} />) : <span className="text-sm">None</span>}
            </div>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            Roles determine which modules you can access. Contact a General Manager or
            Super Administrator to change your permissions.
          </p>
        </CardContent>
      </Card>

      {canEditGuestInfo && <GuestInfoCard />}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>EGREED Hospitality Enterprise — Hotel Operating System</p>
          <p className="mt-1">Foundation release · Multi-property ready architecture</p>
        </CardContent>
      </Card>
    </div>
  );
}
