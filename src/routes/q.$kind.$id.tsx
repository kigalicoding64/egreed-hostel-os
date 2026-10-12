import { createFileRoute, Link } from "@tanstack/react-router";
import { Hotel, MessageCircle, ScanLine, UtensilsCrossed, Wrench, KeyRound, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { QR_KIND_LABEL, type QrKind } from "@/lib/qr";
import { staffDestination } from "@/lib/qr-resolve";

const KINDS: QrKind[] = ["room", "table", "asset", "booking", "key"];

export const Route = createFileRoute("/q/$kind/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome | EGREED Hospitality" },
      { name: "description", content: "You scanned an EGREED Hospitality QR code." },
      { property: "og:title", content: "Welcome | EGREED Hospitality" },
      { property: "og:description", content: "Concierge, menus and help — one scan away." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScanLanding,
});

const GUEST_TEXT: Record<QrKind, { icon: typeof Hotel; title: string; body: string; cta: string }> = {
  room: { icon: MessageCircle, title: "Welcome to your room", body: "Chat with our concierge, order room service, report a problem or see your bill.", cta: "Open my guest portal" },
  table: { icon: UtensilsCrossed, title: "Welcome to your table", body: "Sign in to see your orders and bill, or ask any of our team — a waiter will be right with you.", cta: "Open my guest portal" },
  asset: { icon: Wrench, title: "Hotel equipment", body: "This label is for our staff. If something looks wrong, please let reception know.", cta: "Contact reception" },
  booking: { icon: CalendarCheck, title: "Your booking", body: "Show this at reception for a quick check-in, or open your portal to see the details.", cta: "Open my guest portal" },
  key: { icon: KeyRound, title: "Room key", body: "Found this key? Please hand it to reception. Thank you!", cta: "Contact reception" },
};

function ScanLanding() {
  const { kind, id } = Route.useParams();
  const { user, roles, loading } = useAuth();
  const k = (KINDS.includes(kind as QrKind) ? kind : null) as QrKind | null;
  const isStaff = roles.some((r) => r !== "guest_portal");

  if (!k)
    return (
      <Shell>
        <p className="text-center text-muted-foreground">This code isn't recognised.</p>
      </Shell>
    );

  const g = GUEST_TEXT[k];
  const dest = staffDestination(k);

  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <g.icon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">{g.title}</h1>
        <p className="text-sm text-muted-foreground">{g.body}</p>
      </div>

      {!loading && user && isStaff ? (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">
            Staff view · {QR_KIND_LABEL[k]} <span className="font-mono text-xs text-muted-foreground">{id}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={dest.to}>{dest.label}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/scan"><ScanLine className="mr-1 h-3.5 w-3.5" /> Scan another</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Button asChild className="w-full">
          <Link to={user ? "/portal" : "/auth"}>{user ? g.cta : "Sign in"}</Link>
        </Button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Hotel className="h-4 w-4 text-primary" /> EGREED Hospitality
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
