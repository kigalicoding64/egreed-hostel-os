import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Relay for an external WhatsApp AI server that owns the Meta number.
 * The caller must send X-Relay-Secret (shared secret). Returns
 * { handled: true, reply } for staff (active session or LOGIN), otherwise
 * { handled: false } so the caller's own AI answers. Deletes are never possible.
 */
const Body = z.object({
  phone: z.string().trim().min(6).max(20).regex(/^\+?\d+$/),
  text: z.string().trim().min(1).max(2000),
});

const STAFF_START = /^(login|logout)\b/i;
const DESTRUCTIVE = /^(delete|del|remove|rm|drop|purge|erase|destroy)\b/i;

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/whatsapp/relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EGREED_RELAY_SECRET"];
        if (!secret) return Response.json({ handled: false, error: "relay not configured" }, { status: 503 });
        const given = request.headers.get("x-relay-secret") ?? "";
        if (!safeEqual(given, secret)) return Response.json({ handled: false, error: "unauthorized" }, { status: 401 });

        let parsed;
        try {
          parsed = Body.safeParse(await request.json());
        } catch {
          return Response.json({ handled: false, error: "invalid json" }, { status: 400 });
        }
        if (!parsed.success) return Response.json({ handled: false, error: "invalid input" }, { status: 400 });
        const phone = parsed.data.phone.replace(/\D/g, "");
        const text = parsed.data.text;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { handleStaffMessage } = await import("@/lib/whatsapp-engine.server");

        const { data: sess } = await supabaseAdmin
          .from("whatsapp_sessions")
          .select("user_id,expires_at")
          .eq("phone", phone)
          .maybeSingle();
        const active = !!(sess?.user_id && sess.expires_at && new Date(sess.expires_at) > new Date());

        // Logged-out / new users go to the caller's AI (only LOGIN starts staff mode).
        if (!active && !/^login\b/i.test(text)) return Response.json({ handled: false });
        if (!active && !STAFF_START.test(text)) return Response.json({ handled: false });

        const reply = DESTRUCTIVE.test(text)
          ? "⛔ Deleting is not allowed on WhatsApp. Please use the EGREED dashboard."
          : await handleStaffMessage(supabaseAdmin, phone, text);

        const safe = /^login\s/i.test(text) ? "LOGIN ••••" : text;
        await supabaseAdmin.from("whatsapp_messages").insert([
          { direction: "in", phone, body: safe, status: "received", user_id: sess?.user_id ?? null },
          { direction: "out", phone, body: reply, status: "relayed", user_id: sess?.user_id ?? null },
        ]);

        return Response.json({ handled: true, reply });
      },
    },
  },
});
