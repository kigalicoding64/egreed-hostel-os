import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Route as RouteIcon,
  CheckCircle2,
  Siren,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHotelRef } from "@/hooks/use-hotel";
import { AccessGuard } from "@/components/common/AccessGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton, TableSkeleton } from "@/components/common/LoadingState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { ExportMenu } from "@/components/common/ExportMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SEVERITY_TONE,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TONE,
  PATROL_STATUSES,
  PATROL_STATUS_LABELS,
  PATROL_STATUS_TONE,
} from "@/lib/enterprise-constants";
import { MANAGEMENT_ROLES } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security Operations — EGREED Hospitality" },
      {
        name: "description",
        content:
          "Incident register, severity triage and patrol checkpoint logs for hotel security teams.",
      },
      { property: "og:title", content: "Security Operations — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Log incidents, escalate cases and track patrol checkpoints.",
      },
    ],
  }),
  component: SecurityPage,
});

interface Incident {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  category: string;
  severity: string;
  status: string;
  location: string | null;
  occurred_at: string;
  people_involved: string | null;
  witnesses: string | null;
  police_reference: string | null;
  action_taken: string | null;
  resolved_at: string | null;
}

interface Patrol {
  id: string;
  area: string;
  checkpoint: string;
  scheduled_at: string;
  completed_at: string | null;
  status: string;
  findings: string | null;
}

const EMPTY_INCIDENT = {
  title: "",
  description: "",
  category: "other",
  severity: "low",
  status: "reported",
  location: "",
  people_involved: "",
  witnesses: "",
  police_reference: "",
  action_taken: "",
  occurred_at: new Date().toISOString().slice(0, 16),
};

const EMPTY_PATROL = {
  area: "",
  checkpoint: "",
  scheduled_at: new Date().toISOString().slice(0, 16),
  findings: "",
};

function SecurityPage() {
  const qc = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const { data: hotel } = useHotelRef();

  const canView = hasAnyRole([...MANAGEMENT_ROLES, "security_officer"]);

  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [patrolOpen, setPatrolOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ ...EMPTY_INCIDENT });
  const [patrolForm, setPatrolForm] = useState({ ...EMPTY_PATROL });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["security-incidents"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_incidents")
        .select(
          "id,reference,title,description,category,severity,status,location,occurred_at,people_involved,witnesses,police_reference,action_taken,resolved_at",
        )
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Incident[];
    },
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["security-patrols"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_patrols")
        .select("id,area,checkpoint,scheduled_at,completed_at,status,findings")
        .order("scheduled_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as Patrol[];
    },
  });

  const saveIncident = useMutation({
    mutationFn: async () => {
      if (!incidentForm.title.trim()) throw new Error("Title is required");
      const { error } = await supabase.from("security_incidents").insert({
        hotel_id: hotel?.hotelId ?? null,
        title: incidentForm.title.trim(),
        description: incidentForm.description || null,
        category: incidentForm.category,
        severity: incidentForm.severity as "low" | "moderate" | "high" | "critical",
        status: incidentForm.status as Incident["status"],
        location: incidentForm.location || null,
        people_involved: incidentForm.people_involved || null,
        witnesses: incidentForm.witnesses || null,
        police_reference: incidentForm.police_reference || null,
        action_taken: incidentForm.action_taken || null,
        occurred_at: new Date(incidentForm.occurred_at).toISOString(),
        reported_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Incident recorded");
      setIncidentOpen(false);
      setIncidentForm({ ...EMPTY_INCIDENT });
      qc.invalidateQueries({ queryKey: ["security-incidents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateIncident = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("security_incidents").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-incidents"] });
      toast.success("Incident updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePatrol = useMutation({
    mutationFn: async () => {
      if (!patrolForm.area.trim() || !patrolForm.checkpoint.trim())
        throw new Error("Area and checkpoint are required");
      const { error } = await supabase.from("security_patrols").insert({
        hotel_id: hotel?.hotelId ?? null,
        area: patrolForm.area.trim(),
        checkpoint: patrolForm.checkpoint.trim(),
        scheduled_at: new Date(patrolForm.scheduled_at).toISOString(),
        findings: patrolForm.findings || null,
        officer_id: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Patrol scheduled");
      setPatrolOpen(false);
      setPatrolForm({ ...EMPTY_PATROL });
      qc.invalidateQueries({ queryKey: ["security-patrols"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completePatrol = useMutation({
    mutationFn: async (p: Patrol) => {
      const { error } = await supabase
        .from("security_patrols")
        .update({ status: "completed", completed_at: new Date().toISOString() } as never)
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-patrols"] });
      toast.success("Checkpoint signed off");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let rows = incidents;
    if (severity !== "all") rows = rows.filter((i) => i.severity === severity);
    if (status !== "all") rows = rows.filter((i) => i.status === status);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((i) =>
        [i.reference, i.title, i.location, i.description].some((v) => v?.toLowerCase().includes(term)),
      );
    }
    return rows;
  }, [incidents, severity, status, q]);

  const stats = useMemo(() => {
    const open = incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length;
    const critical = incidents.filter(
      (i) => (i.severity === "critical" || i.severity === "high") && !["resolved", "closed"].includes(i.status),
    ).length;
    const last7 = incidents.filter(
      (i) => Date.now() - new Date(i.occurred_at).getTime() < 7 * 86400_000,
    ).length;
    const patrolsDue = patrols.filter((p) => p.status === "scheduled").length;
    return { open, critical, last7, patrolsDue };
  }, [incidents, patrols]);

  return (
    <AccessGuard allowed={canView} feature="Security Operations">
      <div className="space-y-6">
        <PageHeader
          title="Security Operations"
          description="Incident register, escalation workflow and patrol checkpoint logs."
          icon={<ShieldCheck className="h-5 w-5" />}
          actions={
            <div className="flex items-center gap-2">
              <ExportMenu
                filename={`security-incidents-${new Date().toISOString().slice(0, 10)}`}
                title="Security Incident Register"
                rows={filtered}
                columns={[
                  { header: "Ref", value: (r) => r.reference },
                  { header: "Title", value: (r) => r.title },
                  { header: "Category", value: (r) => INCIDENT_CATEGORY_LABELS[r.category] ?? r.category },
                  { header: "Severity", value: (r) => INCIDENT_SEVERITY_LABELS[r.severity] ?? r.severity },
                  { header: "Status", value: (r) => INCIDENT_STATUS_LABELS[r.status] ?? r.status },
                  { header: "Location", value: (r) => r.location ?? "" },
                  { header: "Occurred", value: (r) => formatDateTime(r.occurred_at) },
                  { header: "Police Ref", value: (r) => r.police_reference ?? "" },
                ]}
              />
              <Button variant="outline" onClick={() => setPatrolOpen(true)}>
                <RouteIcon className="mr-2 h-4 w-4" /> Schedule Patrol
              </Button>
              <Button onClick={() => setIncidentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Report Incident
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open incidents" value={stats.open} icon={ShieldAlert} accent="warning" index={0} />
            <StatCard label="High / critical" value={stats.critical} icon={Siren} accent="destructive" index={1} />
            <StatCard label="Last 7 days" value={stats.last7} icon={ShieldCheck} accent="info" index={2} />
            <StatCard label="Patrols due" value={stats.patrolsDue} icon={RouteIcon} accent="primary" index={3} />
          </div>
        )}

        <Tabs defaultValue="incidents">
          <TabsList>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="patrols">Patrol Log</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-4">
            <Card className="shadow-card">
              <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search incidents…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    {INCIDENT_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{INCIDENT_SEVERITY_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {INCIDENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No incidents recorded"
                    description="A clean register. Report an incident as soon as it happens to keep the audit trail accurate."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Incident</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Occurred</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.reference}</TableCell>
                        <TableCell>
                          <p className="font-medium">{i.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {INCIDENT_CATEGORY_LABELS[i.category] ?? i.category}
                            {i.police_reference ? ` · Police ${i.police_reference}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <TonedBadge tone={INCIDENT_SEVERITY_TONE[i.severity]}>
                            {INCIDENT_SEVERITY_LABELS[i.severity]}
                          </TonedBadge>
                        </TableCell>
                        <TableCell className="text-sm">{i.location || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(i.occurred_at)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={i.status}
                            onValueChange={(v) =>
                              updateIncident.mutate({
                                id: i.id,
                                patch: {
                                  status: v,
                                  resolved_at:
                                    v === "resolved" || v === "closed" ? new Date().toISOString() : null,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-40">
                              <TonedBadge tone={INCIDENT_STATUS_TONE[i.status]}>
                                {INCIDENT_STATUS_LABELS[i.status]}
                              </TonedBadge>
                            </SelectTrigger>
                            <SelectContent>
                              {INCIDENT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="patrols" className="mt-4">
            <Card className="shadow-card">
              {patrols.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={RouteIcon}
                    title="No patrols scheduled"
                    description="Schedule checkpoint rounds so officers can sign off each pass."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>Checkpoint</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patrols.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.area}</TableCell>
                        <TableCell>
                          {p.checkpoint}
                          {p.findings && (
                            <span className="block text-xs text-muted-foreground">{p.findings}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(p.scheduled_at)}
                        </TableCell>
                        <TableCell>
                          <TonedBadge tone={PATROL_STATUS_TONE[p.status]}>
                            {PATROL_STATUS_LABELS[p.status] ?? p.status}
                          </TonedBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "scheduled" ? (
                            <Button size="sm" variant="outline" onClick={() => completePatrol.mutate(p)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Sign off
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {p.completed_at ? formatDateTime(p.completed_at) : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Incident dialog */}
        <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>Report incident</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>What happened</Label>
                <Textarea
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={incidentForm.category}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{INCIDENT_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={incidentForm.severity}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{INCIDENT_SEVERITY_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                />
              </div>
              <div>
                <Label>Occurred at</Label>
                <Input
                  type="datetime-local"
                  value={incidentForm.occurred_at}
                  onChange={(e) => setIncidentForm({ ...incidentForm, occurred_at: e.target.value })}
                />
              </div>
              <div>
                <Label>People involved</Label>
                <Input
                  value={incidentForm.people_involved}
                  onChange={(e) => setIncidentForm({ ...incidentForm, people_involved: e.target.value })}
                />
              </div>
              <div>
                <Label>Witnesses</Label>
                <Input
                  value={incidentForm.witnesses}
                  onChange={(e) => setIncidentForm({ ...incidentForm, witnesses: e.target.value })}
                />
              </div>
              <div>
                <Label>Police reference</Label>
                <Input
                  value={incidentForm.police_reference}
                  onChange={(e) => setIncidentForm({ ...incidentForm, police_reference: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Action taken</Label>
                <Textarea
                  rows={2}
                  value={incidentForm.action_taken}
                  onChange={(e) => setIncidentForm({ ...incidentForm, action_taken: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIncidentOpen(false)}>Cancel</Button>
              <Button onClick={() => saveIncident.mutate()} disabled={saveIncident.isPending}>
                Record incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Patrol dialog */}
        <Dialog open={patrolOpen} onOpenChange={setPatrolOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Schedule patrol checkpoint</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Area</Label>
                <Input
                  placeholder="e.g. Main Lobby"
                  value={patrolForm.area}
                  onChange={(e) => setPatrolForm({ ...patrolForm, area: e.target.value })}
                />
              </div>
              <div>
                <Label>Checkpoint</Label>
                <Input
                  placeholder="e.g. Rear fire exit"
                  value={patrolForm.checkpoint}
                  onChange={(e) => setPatrolForm({ ...patrolForm, checkpoint: e.target.value })}
                />
              </div>
              <div>
                <Label>Scheduled at</Label>
                <Input
                  type="datetime-local"
                  value={patrolForm.scheduled_at}
                  onChange={(e) => setPatrolForm({ ...patrolForm, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={patrolForm.findings}
                  onChange={(e) => setPatrolForm({ ...patrolForm, findings: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPatrolOpen(false)}>Cancel</Button>
              <Button onClick={() => savePatrol.mutate()} disabled={savePatrol.isPending}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccessGuard>
  );
}
