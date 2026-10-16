import { handleStaffMessage, sendWhatsAppText } from "./whatsapp-engine.server";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
const RANK: Record<string, number> = { accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5 };

interface WaValue {
  messages?: { id: string; from: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }[];
  statuses?: { id: string; status: string; timestamp?: string; errors?: unknown[] }[];
}

function valueOf(payload: unknown): WaValue {
  const p = payload as { entry?: { changes?: { value?: WaValue }[] }[] };
  return p?.entry?.[0]?.changes?.[0]?.value ?? {};
}

/** Processes one stored event. Returns true when complete; false = retry later. */
export async function processEvent(admin: Admin, ev: { id: string; event: string; payload: unknown }): Promise<boolean> {
  const value = valueOf(ev.payload);

  if (ev.event === "whatsapp.message") {
    for (const m of value.messages ?? []) {
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
      const { data: existing } = await admin.from("whatsapp_messages").select("id").eq("wa_message_id", m.id).maybeSingle();
      let inboundId = existing?.id;
      if (!inboundId) {
        // Never store LOGIN passwords.
        const safe = /^login\s/i.test(text) ? "LOGIN ••••" : text || `[${m.type}]`;
        const { data: ins, error } = await admin
          .from("whatsapp_messages")
          .insert({ direction: "in", phone: m.from, body: safe, wa_message_id: m.id, status: "received" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        inboundId = ins.id;
      }
      const { data: reply } = await admin.from("whatsapp_messages").select("id,status").eq("reply_to", m.id).maybeSingle();
      if (reply && reply.status !== "failed") continue; // already answered (or unresolved send)
      const answer = text ? await handleStaffMessage(admin, m.from, text) : "Please send a text message. Send *HELP* for options.";
      const { data: sess } = await admin.from("whatsapp_sessions").select("user_id").eq("phone", m.from).maybeSingle();
      if (sess?.user_id) await admin.from("whatsapp_messages").update({ user_id: sess.user_id }).eq("id", inboundId);
      const rowId =
        reply?.id ??
        (await admin
          .from("whatsapp_messages")
          .insert({ direction: "out", phone: m.from, body: answer, reply_to: m.id, status: "sending", user_id: sess?.user_id ?? null })
          .select("id")
          .single()).data?.id;
      const sent = await sendWhatsAppText(m.from, answer);
      await admin
        .from("whatsapp_messages")
        .update(sent.error ? { status: "failed", error: sent.error } : { status: "accepted", wa_message_id: sent.id ?? null, error: null, body: answer })
        .eq("id", rowId!);
      if (sent.error) return false;
    }
    return true;
  }

  if (ev.event === "whatsapp.status") {
    let allMatched = true;
    for (const s of value.statuses ?? []) {
      const { data: msg } = await admin.from("whatsapp_messages").select("id,status").eq("wa_message_id", s.id).maybeSingle();
      if (!msg) {
        allMatched = false;
        continue;
      }
      if ((RANK[s.status] ?? 0) >= (RANK[msg.status] ?? 0)) {
        await admin
          .from("whatsapp_messages")
          .update({
            status: s.status,
            status_at: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null,
            error: s.errors?.length ? JSON.stringify(s.errors).slice(0, 1000) : null,
          })
          .eq("id", msg.id);
      }
    }
    return allMatched;
  }

  return true; // unknown events are stored and acknowledged
}

export async function runEvent(admin: Admin, ev: { id: string; event: string; payload: unknown; attempts: number }) {
  try {
    const ok = await processEvent(admin, ev);
    await admin
      .from("whatsapp_webhook_events")
      .update(ok ? { processed_at: new Date().toISOString(), processing_error: null, attempts: ev.attempts + 1 } : { attempts: ev.attempts + 1, processing_error: "pending" })
      .eq("id", ev.id);
    return ok;
  } catch (e) {
    await admin.from("whatsapp_webhook_events").update({ attempts: ev.attempts + 1, processing_error: String(e).slice(0, 500) }).eq("id", ev.id);
    return false;
  }
}

/** Recovery: retries a few unfinished events, least-attempted first, giving up after 20 tries. */
export async function recoverPending(admin: Admin, skipId: string) {
  const { data } = await admin
    .from("whatsapp_webhook_events")
    .select("id,event,payload,attempts")
    .is("processed_at", null)
    .neq("id", skipId)
    .lt("attempts", 20)
    .order("attempts")
    .order("received_at")
    .limit(3);
  for (const ev of data ?? []) await runEvent(admin, ev);
}
