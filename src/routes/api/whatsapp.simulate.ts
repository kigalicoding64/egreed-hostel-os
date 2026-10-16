import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/ai-hotel.server";

const Body = z.object({ text: z.string().min(1).max(1000) });

/** In-app phone simulator: runs the exact WhatsApp engine for the signed-in user. */
export const Route = createFileRoute("/api/whatsapp/simulate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid input", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { handleStaffMessage } = await import("@/lib/whatsapp-engine.server");
        const phone = `sim-${auth.userId}`;
        const reply = await handleStaffMessage(supabaseAdmin, phone, parsed.data.text);
        return Response.json({ reply });
      },
    },
  },
});
