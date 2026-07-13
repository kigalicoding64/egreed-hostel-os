import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/properties")({
  component: PropertiesPage,
});

function PropertiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const [{ data: hotels }, { data: types }, { data: rooms }] = await Promise.all([
        supabase.from("hotels").select("*"),
        supabase.from("room_types").select("*"),
        supabase.from("rooms").select("id,hotel_id"),
      ]);
      return { hotels: hotels ?? [], types: types ?? [], rooms: rooms ?? [] };
    },
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Hotels, room types and rate plans. Ready for multi-property scale."
        icon={<Building2 className="h-5 w-5" />}
      />

      {data.hotels.length === 0 ? (
        <EmptyState icon={Building2} title="No properties configured" />
      ) : (
        data.hotels.map((h) => {
          const roomCount = data.rooms.filter((r) => r.hotel_id === h.id).length;
          const types = data.types.filter((t) => t.hotel_id === h.id);
          return (
            <Card key={h.id} className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">{h.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{h.city}, {h.country}</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{h.phone ?? "—"}</p>
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{h.email ?? "—"}</p>
                  <p className="flex items-center gap-2"><Building2 className="h-4 w-4" />{roomCount} rooms · {h.currency}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Room Types</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {types.map((t) => (
                      <div key={t.id} className="rounded-lg border border-border/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{t.name}</p>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(t.base_rate, h.currency)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Max {t.max_occupancy} guests</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
