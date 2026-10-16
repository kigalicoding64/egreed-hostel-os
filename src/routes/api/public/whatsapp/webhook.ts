import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WHATSAPP_API_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const deliveryId = request.headers.get("x-lovable-delivery") ?? "";
        const event = request.headers.get("x-lovable-event") ?? "";
        let payload: unknown;
        try {
          ({ payload } = await verifyWebhookRequest({ req: request, secret, maxBodyBytes: 4 * 1024 * 1024 }));
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }
        if (!deliveryId || !event) return new Response("Missing headers", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runEvent, recoverPending } = await import("@/lib/whatsapp-webhook.server");

        const { data: existing } = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .select("id,event,payload,attempts,processed_at")
          .eq("delivery_id", deliveryId)
          .maybeSingle();
        let row = existing;
        if (!row) {
          const { data, error } = await supabaseAdmin
            .from("whatsapp_webhook_events")
            .insert({ delivery_id: deliveryId, event, payload: payload as never })
            .select("id,event,payload,attempts,processed_at")
            .single();
          if (error) return new Response("Storage failed", { status: 500 });
          row = data;
        }
        if (!row.processed_at) {
          const ok = await runEvent(supabaseAdmin, row);
          // Unmatched status callbacks stay stored and are retried by recovery.
          if (!ok && event !== "whatsapp.status") return new Response("Retry", { status: 500 });
        }
        await recoverPending(supabaseAdmin, row.id);
        return new Response("ok");
      },
    },
  },
});
