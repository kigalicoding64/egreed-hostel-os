import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/guests")({
  component: GuestsPage,
});

interface Guest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  created_at: string;
}

function GuestsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id,full_name,email,phone,nationality,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Guest[];
    },
  });

  const filtered = data.filter((g) =>
    g.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guests"
        description="Guest directory and contact profiles."
        icon={<Users className="h-5 w-5" />}
      />
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search guests…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6"><EmptyState icon={Users} title="No guests found" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(g.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{g.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {g.email && (
                          <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{g.email}</p>
                        )}
                        {g.phone && (
                          <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{g.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{g.nationality ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(g.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
