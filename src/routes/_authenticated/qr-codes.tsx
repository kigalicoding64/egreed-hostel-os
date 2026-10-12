import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, QrCode, Wifi } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AccessGuard } from "@/components/common/AccessGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrDownloadButtons, QrImage } from "@/components/qr/QrCode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MANAGEMENT_ROLES, type AppRole } from "@/lib/rbac";
import { printQrCards, qrLink, wifiPayload, type QrCard } from "@/lib/qr";
import { GUEST_INFO_KEY, parseGuestInfo } from "@/lib/guest-info";

const VIEW: AppRole[] = [...MANAGEMENT_ROLES, "receptionist", "restaurant_manager", "maintenance_manager", "housekeeping_manager"];
const HOTEL = "EGREED Hospitality";

export const Route = createFileRoute("/_authenticated/qr-codes")({
  head: () => ({
    meta: [
      { title: "QR Codes | EGREED Hospitality" },
      { name: "description", content: "Create, download and print QR codes for rooms, tables, equipment and Wi-Fi." },
      { property: "og:title", content: "QR Codes | EGREED Hospitality" },
      { property: "og:description", content: "Branded, printable QR codes for every part of the hotel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QrCodesPage,
});

function useQrData() {
  return useQuery({
    queryKey: ["qr-center"],
    queryFn: async () => {
      const [rooms, tables, assets, info] = await Promise.all([
        supabase.from("rooms").select("id,room_number,room_types(name)").order("room_number"),
        supabase.from("restaurant_tables").select("id,name,seats,outlets(name)").order("name"),
        supabase.from("assets").select("id,code,name,location").order("code"),
        supabase.from("settings").select("value").eq("key", GUEST_INFO_KEY).limit(1),
      ]);
      const roomCards: QrCard[] = (rooms.data ?? []).map((r: any) => ({
        value: qrLink("room", r.id),
        title: `Room ${r.room_number}`,
        subtitle: r.room_types?.name ?? undefined,
        callToAction: "Scan for concierge, room service & help",
      }));
      const tableCards: QrCard[] = (tables.data ?? []).map((t: any) => ({
        value: qrLink("table", t.id),
        title: `Table ${t.name}`,
        subtitle: [t.outlets?.name, `${t.seats} seats`].filter(Boolean).join(" · "),
        callToAction: "Scan to see the menu or call a waiter",
      }));
      const assetCards: QrCard[] = (assets.data ?? []).map((a: any) => ({
        value: qrLink("asset", a.id),
        title: a.name,
        subtitle: [a.code, a.location].filter(Boolean).join(" · "),
        callToAction: "Staff: scan to log maintenance",
      }));
      return { roomCards, tableCards, assetCards, guestInfo: parseGuestInfo(info.data?.[0]?.value) };
    },
  });
}

function QrCodesPage() {
  const { roles } = useAuth();
  const allowed = roles.some((r) => VIEW.includes(r));
  const q = useQrData();
  const g = q.data?.guestInfo;
  const wifiCard: QrCard | null = g?.wifiNetwork
    ? {
        value: wifiPayload(g.wifiNetwork, g.wifiPassword),
        title: "Free Wi-Fi",
        subtitle: `Network: ${g.wifiNetwork}`,
        callToAction: "Point your camera here to join automatically",
      }
    : null;

  return (
    <AccessGuard allowed={allowed} feature="QR codes">
      <div className="space-y-6">
        <PageHeader
          title="QR Codes"
          description="Download or print branded codes for rooms, tables, equipment and Wi-Fi."
          icon={<QrCode className="h-5 w-5" />}
        />
        <Tabs defaultValue="rooms">
          <TabsList>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="assets">Equipment</TabsTrigger>
            <TabsTrigger value="wifi">Wi-Fi</TabsTrigger>
          </TabsList>
          <TabsContent value="rooms" className="mt-4">
            <CardGrid cards={q.data?.roomCards ?? []} loading={q.isLoading} name="room-qr-cards" />
          </TabsContent>
          <TabsContent value="tables" className="mt-4">
            <CardGrid cards={q.data?.tableCards ?? []} loading={q.isLoading} name="table-qr-cards" />
          </TabsContent>
          <TabsContent value="assets" className="mt-4">
            <CardGrid cards={q.data?.assetCards ?? []} loading={q.isLoading} name="equipment-qr-labels" />
          </TabsContent>
          <TabsContent value="wifi" className="mt-4">
            {wifiCard ? (
              <Card className="max-w-sm shadow-card">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <QrImage value={wifiCard.value} size={200} />
                  <p className="font-semibold">{wifiCard.subtitle}</p>
                  <QrDownloadButtons card={wifiCard} hotelName={HOTEL} />
                  <Button variant="secondary" size="sm" onClick={() => void printQrCards(Array(6).fill(wifiCard), HOTEL, "wifi-cards")}>
                    <Printer className="mr-1 h-3.5 w-3.5" /> Print 6 table tents
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <Wifi className="h-5 w-5" /> Add your Wi-Fi network in Settings → Guest information to create a join code.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AccessGuard>
  );
}

function CardGrid({ cards, loading, name }: { cards: QrCard[]; loading: boolean; name: string }) {
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const shown = useMemo(
    () => cards.filter((c) => `${c.title} ${c.subtitle ?? ""}`.toLowerCase().includes(filter.toLowerCase())),
    [cards, filter],
  );
  const toPrint = picked.size ? shown.filter((c) => picked.has(c.value)) : shown;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!cards.length) return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        <Button onClick={() => void printQrCards(toPrint, HOTEL, name)} disabled={!toPrint.length}>
          <Printer className="mr-1 h-4 w-4" /> Print {picked.size ? `${toPrint.length} selected` : `all ${shown.length}`}
        </Button>
        {picked.size > 0 && (
          <Button variant="ghost" onClick={() => setPicked(new Set())}>Clear selection</Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((c) => (
          <Card key={c.value} className="shadow-card">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <label className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={picked.has(c.value)}
                  onCheckedChange={(v) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      v ? n.add(c.value) : n.delete(c.value);
                      return n;
                    })
                  }
                />
                Select for printing
              </label>
              <QrImage value={c.value} size={140} />
              <p className="text-center font-semibold">{c.title}</p>
              {c.subtitle && <p className="text-center text-xs text-muted-foreground">{c.subtitle}</p>}
              <QrDownloadButtons card={c} hotelName={HOTEL} compact />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
