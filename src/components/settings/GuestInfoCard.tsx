import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConciergeBell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GUEST_INFO_KEY, parseGuestInfo, type GuestInfo } from "@/lib/guest-info";

export function GuestInfoCard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["guest-info"],
    queryFn: async () => {
      const [{ data: hotel }, { data: rows }] = await Promise.all([
        supabase.from("hotels").select("id").eq("is_active", true).limit(1).maybeSingle(),
        supabase.from("settings").select("id,value,hotel_id").eq("key", GUEST_INFO_KEY).limit(1),
      ]);
      const row = rows?.[0] ?? null;
      return { hotelId: row?.hotel_id ?? hotel?.id ?? null, rowId: row?.id ?? null, info: parseGuestInfo(row?.value) };
    },
  });
  const [form, setForm] = useState<GuestInfo | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data && !form) setForm(q.data.info);
  }, [q.data, form]);

  if (!form) return null;
  const set = <K extends keyof GuestInfo>(k: K, v: GuestInfo[K]) => setForm({ ...form, [k]: v });
  const text = (k: keyof GuestInfo, label: string, placeholder = "", type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`gi-${k}`}>{label}</Label>
      <Input id={`gi-${k}`} type={type} placeholder={placeholder} value={String(form[k])} onChange={(e) => set(k, e.target.value as never)} />
    </div>
  );

  const save = async () => {
    setBusy(true);
    const value = JSON.parse(JSON.stringify(form));
    const res = q.data?.rowId
      ? await supabase.from("settings").update({ value, updated_at: new Date().toISOString() }).eq("id", q.data.rowId)
      : await supabase.from("settings").insert({ key: GUEST_INFO_KEY, hotel_id: q.data?.hotelId ?? null, value });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Guest information saved — the concierge uses it right away");
    void qc.invalidateQueries({ queryKey: ["guest-info"] });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ConciergeBell className="h-5 w-5 text-primary" /> Guest information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">What the guest portal concierge tells guests.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {text("checkInTime", "Check-in from", "", "time")}
          {text("checkOutTime", "Check-out by", "", "time")}
          {text("lateCheckout", "Late check-out policy", "e.g. Until 13:00 for 10,000 RWF")}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {text("wifiNetwork", "Wi-Fi network name")}
          {text("wifiPassword", "Wi-Fi password")}
          {text("wifiNotes", "Wi-Fi notes", "e.g. Faster network in the lobby")}
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="gi-transfer">Airport transfers offered</Label>
            <Switch id="gi-transfer" checked={form.transferAvailable} onCheckedChange={(v) => set("transferAvailable", v)} />
          </div>
          {form.transferAvailable && (
            <div className="grid gap-3 sm:grid-cols-3">
              {text("transferPrice", "Price", "e.g. 30,000 RWF one way")}
              {text("transferNotice", "Booking notice", "e.g. 24 hours ahead via reception")}
              {text("transferHours", "Hours", "e.g. 24/7")}
              <div className="sm:col-span-3">{text("transferNotes", "Transfer notes", "e.g. Driver waits at arrivals with a sign")}</div>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gi-extra">Other things guests often ask</Label>
          <Textarea id="gi-extra" value={form.extra} onChange={(e) => set("extra", e.target.value)} placeholder="Breakfast hours, parking, pool, pets…" />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save guest information"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
