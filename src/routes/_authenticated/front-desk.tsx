import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConciergeBell, KeyRound, LogIn, LogOut, Pencil, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { AccessGuard } from "@/components/common/AccessGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReservationInvalidate } from "@/hooks/use-reservations";
import { todayISO } from "@/lib/booking";
import type { Tables } from "@/integrations/supabase/types";
import { QrButton } from "@/components/qr/QrCode";
import { qrLink } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk | EGREED Hospitality" },
      { name: "description", content: "Arrivals, in-house guests, departures, room keys and guest profiles in one place." },
      { property: "og:title", content: "Front Desk | EGREED Hospitality" },
      { property: "og:description", content: "Check guests in and out, issue room keys and manage guest profiles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FrontDeskPage,
});

type Guest = Tables<"guests">;
type Row = Tables<"reservations"> & {
  guests: Guest | null;
  rooms: { id: string; room_number: string; status: string } | null;
};
type KeyRow = Tables<"room_keys"> & {
  rooms: { room_number: string } | null;
  guests: { full_name: string } | null;
};

function newKeyCode() {
  return `K-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function FrontDeskPage() {
  const { roles, hasAnyRole, user } = useAuth();
  const canView = roles.includes("super_admin") || hasAnyRole(["hotel_owner", "general_manager", "receptionist", "security_officer"]);
  const canAct = roles.includes("super_admin") || hasAnyRole(["hotel_owner", "general_manager", "receptionist"]);
  const qc = useQueryClient();
  const invalidate = useReservationInvalidate();
  const today = todayISO();

  const [checkIn, setCheckIn] = useState<Row | null>(null);
  const [checkOut, setCheckOut] = useState<Row | null>(null);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [search, setSearch] = useState("");

  const resQ = useQuery({
    queryKey: ["front-desk", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, guests(*), rooms(id,room_number,status)")
        .in("status", ["pending", "confirmed", "checked_in"])
        .lte("check_in", today)
        .order("check_in");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const keysQ = useQuery({
    queryKey: ["room-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_keys")
        .select("*, rooms(room_number), guests(full_name)")
        .order("issued_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as KeyRow[];
    },
  });

  const guestsQ = useQuery({
    queryKey: ["front-desk-guests", search],
    queryFn: async () => {
      let q = supabase.from("guests").select("*").order("full_name").limit(50);
      if (search.trim()) q = q.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = resQ.data ?? [];
  const arrivals = rows.filter((r) => r.status !== "checked_in");
  const inHouse = rows.filter((r) => r.status === "checked_in");
  const departures = inHouse.filter((r) => r.check_out <= today);
  const activeKeys = (keysQ.data ?? []).filter((k) => k.status === "active");

  const refresh = () => {
    invalidate();
    void qc.invalidateQueries({ queryKey: ["front-desk"] });
    void qc.invalidateQueries({ queryKey: ["room-keys"] });
    void qc.invalidateQueries({ queryKey: ["front-desk-guests"] });
  };

  const keyStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "returned" | "lost" | "deactivated" }) => {
      const { error } = await supabase
        .from("room_keys")
        .update({ status, returned_at: status === "returned" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Key updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = (label: string, value: number) => (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );

  const resTable = (list: Row[], mode: "arrive" | "stay") => (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3">Guest</th>
            <th className="p-3">Reference</th>
            <th className="p-3">Room</th>
            <th className="p-3">Stay</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                Nothing here right now.
              </td>
            </tr>
          )}
          {list.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">
                <div className="font-medium">{r.guests?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.guests?.phone ?? r.guests?.email ?? ""}</div>
              </td>
              <td className="p-3 font-mono text-xs">{r.reference}</td>
              <td className="p-3">{r.rooms?.room_number ?? <span className="text-muted-foreground">Unassigned</span>}</td>
              <td className="p-3 text-xs">
                {r.check_in} → {r.check_out}
              </td>
              <td className="p-3">
                <Badge variant={r.status === "checked_in" ? "default" : "secondary"}>{r.status.replace("_", " ")}</Badge>
              </td>
              <td className="space-x-1 p-3 text-right">
                {r.guests && canAct && (
                  <Button size="sm" variant="ghost" onClick={() => setEditGuest(r.guests)} aria-label="Edit guest profile">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canAct && mode === "arrive" && (
                  <Button size="sm" onClick={() => setCheckIn(r)}>
                    <LogIn className="mr-1 h-3.5 w-3.5" /> Check in
                  </Button>
                )}
                {canAct && mode === "stay" && (
                  <Button size="sm" variant="outline" onClick={() => setCheckOut(r)}>
                    <LogOut className="mr-1 h-3.5 w-3.5" /> Check out
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AccessGuard allowed={canView} feature="the front desk">
      <div className="space-y-6">
        <PageHeader
          title="Front Desk"
          description="Check guests in and out, issue room keys and keep guest profiles up to date."
          icon={<ConciergeBell className="h-5 w-5" />}
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link to="/calendar">Open room calendar</Link>
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat("Arrivals due", arrivals.length)}
          {stat("In house", inHouse.length)}
          {stat("Departures due", departures.length)}
          {stat("Active keys", activeKeys.length)}
        </div>

        <Tabs defaultValue="arrivals">
          <TabsList className="flex-wrap">
            <TabsTrigger value="arrivals">Arrivals</TabsTrigger>
            <TabsTrigger value="inhouse">In house</TabsTrigger>
            <TabsTrigger value="departures">Departures</TabsTrigger>
            <TabsTrigger value="keys">Room keys</TabsTrigger>
            <TabsTrigger value="guests">Guest profiles</TabsTrigger>
          </TabsList>
          <TabsContent value="arrivals" className="mt-4">{resTable(arrivals, "arrive")}</TabsContent>
          <TabsContent value="inhouse" className="mt-4">{resTable(inHouse, "stay")}</TabsContent>
          <TabsContent value="departures" className="mt-4">{resTable(departures, "stay")}</TabsContent>
          <TabsContent value="keys" className="mt-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Key</th>
                    <th className="p-3">Room</th>
                    <th className="p-3">Guest</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Issued</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(keysQ.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">No keys issued yet.</td>
                    </tr>
                  )}
                  {(keysQ.data ?? []).map((k) => (
                    <tr key={k.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{k.key_code}</td>
                      <td className="p-3">{k.rooms?.room_number ?? "—"}</td>
                      <td className="p-3">{k.guests?.full_name ?? "—"}</td>
                      <td className="p-3 capitalize">{k.key_type}</td>
                      <td className="p-3 text-xs">{new Date(k.issued_at).toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={k.status === "active" ? "default" : k.status === "lost" ? "destructive" : "secondary"}>{k.status}</Badge>
                      </td>
                      <td className="space-x-1 p-3 text-right">
                        <QrButton card={{ value: qrLink("key", k.key_code), title: `Key ${k.key_code}`, subtitle: k.rooms?.room_number ? `Room ${k.rooms.room_number}` : undefined, callToAction: "Scan at reception to look up this key" }} />
                        {k.status === "active" && canAct && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => keyStatus.mutate({ id: k.id, status: "returned" })}>Returned</Button>
                            <Button size="sm" variant="ghost" onClick={() => keyStatus.mutate({ id: k.id, status: "lost" })}>Lost</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="guests" className="mt-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search guests" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(guestsQ.data ?? []).map((g) => (
                <Card key={g.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-full bg-muted p-2"><UserRound className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{g.full_name}</p>
                        {g.vip_status && <Badge>VIP</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{g.email ?? "No email"} · {g.phone ?? "No phone"}</p>
                      <p className="text-xs text-muted-foreground">{g.nationality ?? "—"} · {g.loyalty_points} pts</p>
                    </div>
                    {canAct && (
                      <Button size="sm" variant="ghost" onClick={() => setEditGuest(g)} aria-label={`Edit ${g.full_name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {checkIn && (
          <CheckInDialog row={checkIn} userId={user?.id ?? null} onClose={() => setCheckIn(null)} onDone={refresh} />
        )}
        {checkOut && (
          <CheckOutDialog
            row={checkOut}
            keys={activeKeys.filter((k) => k.reservation_id === checkOut.id)}
            onClose={() => setCheckOut(null)}
            onDone={refresh}
          />
        )}
        {editGuest && <GuestDialog guest={editGuest} onClose={() => setEditGuest(null)} onDone={refresh} />}
      </div>
    </AccessGuard>
  );
}

function CheckInDialog({ row, userId, onClose, onDone }: { row: Row; userId: string | null; onClose: () => void; onDone: () => void }) {
  const [roomId, setRoomId] = useState(row.room_id ?? "");
  const [issueKey, setIssueKey] = useState(true);
  const [keyCount, setKeyCount] = useState(1);
  const [keyType, setKeyType] = useState("card");
  const [idDoc, setIdDoc] = useState(row.guests?.passport ?? row.guests?.national_id ?? "");
  const [busy, setBusy] = useState(false);

  const roomsQ = useQuery({
    queryKey: ["checkin-rooms"],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id,room_number,status").order("room_number");
      return data ?? [];
    },
  });
  const rooms = useMemo(
    () => (roomsQ.data ?? []).filter((r) => r.id === row.room_id || ["available", "inspected", "reserved"].includes(r.status)),
    [roomsQ.data, row.room_id],
  );
  const selected = (roomsQ.data ?? []).find((r) => r.id === roomId);

  const submit = async () => {
    if (!roomId) return toast.error("Assign a room first");
    setBusy(true);
    try {
      if (row.guests && idDoc && idDoc !== (row.guests.passport ?? row.guests.national_id)) {
        await supabase.from("guests").update({ passport: idDoc }).eq("id", row.guests.id);
      }
      if (roomId !== row.room_id) {
        const { error } = await supabase.from("reservations").update({ room_id: roomId }).eq("id", row.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("reservations").update({ status: "checked_in" }).eq("id", row.id);
      if (error) throw error;
      if (issueKey) {
        const keys = Array.from({ length: keyCount }, () => ({
          hotel_id: row.hotel_id,
          reservation_id: row.id,
          room_id: roomId,
          guest_id: row.guest_id,
          key_code: newKeyCode(),
          key_type: keyType,
          issued_by: userId,
        }));
        const { error: kErr } = await supabase.from("room_keys").insert(keys);
        if (kErr) throw kErr;
      }
      toast.success(`${row.guests?.full_name ?? "Guest"} checked in to room ${selected?.room_number ?? ""}`);
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in · {row.guests?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ci-room">Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger id="ci-room"><SelectValue placeholder="Choose a room" /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>Room {r.room_number} · {r.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-id">Passport / ID number</Label>
            <Input id="ci-id" value={idDoc} onChange={(e) => setIdDoc(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4" /><Label htmlFor="ci-key">Issue room keys</Label></div>
            <Switch id="ci-key" checked={issueKey} onCheckedChange={setIssueKey} />
          </div>
          {issueKey && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ci-count">Number of keys</Label>
                <Input id="ci-count" type="number" min={1} max={4} value={keyCount} onChange={(e) => setKeyCount(Math.min(4, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ci-type">Key type</Label>
                <Select value={keyType} onValueChange={setKeyType}>
                  <SelectTrigger id="ci-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Key card</SelectItem>
                    <SelectItem value="mobile">Mobile key</SelectItem>
                    <SelectItem value="physical">Metal key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Checking in…" : "Confirm check-in"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckOutDialog({ row, keys, onClose, onDone }: { row: Row; keys: KeyRow[]; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (keys.length) {
        const { error: kErr } = await supabase
          .from("room_keys")
          .update({ status: "returned", returned_at: new Date().toISOString() })
          .in("id", keys.map((k) => k.id));
        if (kErr) throw kErr;
      }
      const { error } = await supabase.from("reservations").update({ status: "checked_out" }).eq("id", row.id);
      if (error) throw error;
      toast.success(`Checked out — room ${row.rooms?.room_number ?? ""} sent to housekeeping`);
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check out · {row.guests?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>Room <b>{row.rooms?.room_number ?? "—"}</b> · stay total <b>{Number(row.total_amount).toLocaleString()}</b></p>
          <p>{keys.length} active key(s) will be marked as returned.</p>
          <p className="text-muted-foreground">The room will be marked dirty and a priority cleaning job is created for housekeeping automatically.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Checking out…" : "Confirm check-out"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuestDialog({ guest, onClose, onDone }: { guest: Guest; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    full_name: guest.full_name,
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    nationality: guest.nationality ?? "",
    passport: guest.passport ?? "",
    national_id: guest.national_id ?? "",
    emergency_contact: guest.emergency_contact ?? "",
    preferences: guest.preferences ?? "",
    notes: guest.notes ?? "",
    vip_status: guest.vip_status,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    setBusy(true);
    const nul = (s: string) => (s.trim() ? s.trim() : null);
    const { error } = await supabase
      .from("guests")
      .update({
        full_name: form.full_name.trim(),
        email: nul(form.email),
        phone: nul(form.phone),
        nationality: nul(form.nationality),
        passport: nul(form.passport),
        national_id: nul(form.national_id),
        emergency_contact: nul(form.emergency_contact),
        preferences: nul(form.preferences),
        notes: nul(form.notes),
        vip_status: form.vip_status,
      })
      .eq("id", guest.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Guest profile saved");
    onDone();
    onClose();
  };

  const field = (k: keyof typeof form, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`g-${k}`}>{label}</Label>
      <Input id={`g-${k}`} value={String(form[k])} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Guest profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("full_name", "Full name")}
          {field("email", "Email")}
          {field("phone", "Phone")}
          {field("nationality", "Nationality")}
          {field("passport", "Passport")}
          {field("national_id", "National ID")}
          {field("emergency_contact", "Emergency contact")}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="g-vip">VIP guest</Label>
            <Switch id="g-vip" checked={form.vip_status} onCheckedChange={(v) => set("vip_status", v)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="g-pref">Preferences</Label>
            <Textarea id="g-pref" value={form.preferences} onChange={(e) => set("preferences", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="g-notes">Internal notes</Label>
            <Textarea id="g-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
