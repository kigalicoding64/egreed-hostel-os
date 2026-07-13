import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleBadge } from "@/components/common/RoleBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/format";
import type { AppRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: AppRole[];
}

function StaffPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,job_title,avatar_url,is_active"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        roleMap.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
      })) as StaffMember[];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Roles"
        description="Team directory with role-based access assignments."
        icon={<UserCog className="h-5 w-5" />}
      />
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : data.length === 0 ? (
            <div className="p-6"><EmptyState icon={UserCog} title="No staff members" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(m.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.roles.length ? (
                          m.roles.map((r) => <RoleBadge key={r} role={r} />)
                        ) : (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={m.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
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
