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
import { ALL_NAV_ITEMS, canAccess, ROLE_LABELS, type AppRole } from "@/lib/rbac";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, ShieldCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { grantableRoles } from "@/lib/role-policy";
import { createStaffAccount, updateStaffRoles, listRoleAudit } from "@/lib/staff.functions";

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
  const { roles: myRoles, user } = useAuth();
  const allowed = grantableRoles(myRoles);
  const canManage = allowed.length > 0;
  const isExec = myRoles.some((r) => ["super_admin", "hotel_owner", "general_manager"].includes(r));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
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
        actions={canManage ? <Button onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />Add staff</Button> : undefined}
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
                  {canManage && <TableHead />}
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
                    {canManage && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={m.id === user?.id} onClick={() => setEditing(m)}>
                          {m.id === user?.id ? "You" : "Manage roles"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {isExec && <AuditCard staff={data} />}
      {adding && <StaffDialog allowed={allowed} onClose={() => setAdding(false)} />}
      {editing && <StaffDialog allowed={allowed} member={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PermissionPreview({ roles }: { roles: AppRole[] }) {
  const pages = ALL_NAV_ITEMS.filter((i) => roles.length > 0 && canAccess(i, roles));
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5" />Will have access to {pages.length} pages</p>
      <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
        {pages.length ? pages.map((p) => <Badge key={p.to} variant="secondary" className="text-[11px]">{p.title}</Badge>)
          : <span className="text-xs text-muted-foreground">Pick a role to preview access.</span>}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Deleting records stays restricted to management.</p>
    </div>
  );
}

function StaffDialog({ allowed, member, onClose }: { allowed: AppRole[]; member?: StaffMember; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createStaffAccount);
  const update = useServerFn(updateStaffRoles);
  const [roles, setRoles] = useState<AppRole[]>(member?.roles ?? []);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", jobTitle: "" });
  const [busy, setBusy] = useState(false);
  const toggle = (r: AppRole) => setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const submit = async () => {
    setBusy(true);
    try {
      if (member) await update({ data: { userId: member.id, roles } });
      else await create({ data: { ...form, jobTitle: form.jobTitle || undefined, roles } });
      toast.success(member ? "Roles updated" : "Staff account created");
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["role-audit"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };
  const valid = member ? true : form.email && form.password.length >= 8 && form.fullName && roles.length > 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{member ? `Roles for ${member.full_name || member.email}` : "Add staff member"}</DialogTitle></DialogHeader>
        {!member && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="sf-name">Full name</Label><Input id="sf-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="sf-email">Email</Label><Input id="sf-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="sf-pass">Password (min 8)</Label><Input id="sf-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="sf-job">Job title</Label><Input id="sf-job" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
          </div>
        )}
        <div>
          <Label>Roles you can assign</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {allowed.map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />{ROLE_LABELS[r]}
              </label>
            ))}
          </div>
          {member && member.roles.some((r) => !allowed.includes(r)) && (
            <p className="mt-2 text-xs text-muted-foreground">Some existing roles are above your level and can't be changed by you.</p>
          )}
        </div>
        <PermissionPreview roles={roles} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={submit}>{busy ? "Saving…" : member ? "Save roles" : "Create account"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditCard({ staff }: { staff: StaffMember[] }) {
  const fetchAudit = useServerFn(listRoleAudit);
  const { data = [] } = useQuery({ queryKey: ["role-audit"], queryFn: () => fetchAudit() });
  const name = (id: string | null) => staff.find((s) => s.id === id)?.full_name || staff.find((s) => s.id === id)?.email || "Someone";
  const list = (v: unknown) => (Array.isArray(v) ? v.map((r) => ROLE_LABELS[r as AppRole] ?? r).join(", ") : "");
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Access change history</p>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">No changes recorded yet.</p> : data.map((e) => (
          <div key={e.id} className="border-t pt-2 text-sm">
            <span className="font-medium">{name(e.user_id)}</span>{" "}
            {e.action === "staff_user_created"
              ? <>created {String(e.metadata.target_email ?? "")} as {list(e.metadata.granted_roles)}</>
              : <>changed {name(e.entity_id)}{list(e.metadata.granted) && <> · granted {list(e.metadata.granted)}</>}{list(e.metadata.revoked) && <> · removed {list(e.metadata.revoked)}</>}</>}
            <span className="ml-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
