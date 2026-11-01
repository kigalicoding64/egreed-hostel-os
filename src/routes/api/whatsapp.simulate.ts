import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hasStaffAccess } from "@/lib/whatsapp-access";

const Body = z.object({ text: z.string().min(1).max(1000) });

/** In-app phone simulator: runs the exact WhatsApp engine for the signed-in user. */
export const Route = createFileRoute("/api/whatsapp/simulate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireUser } = await import("@/lib/ai-hotel.server");
        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { data: rows, error } = await auth.supabase.from("user_roles").select("role").eq("user_id", auth.userId);
        if (error) return new Response("Access check failed", { status: 500 });
        if (!hasStaffAccess((rows ?? []).map((row) => row.role))) return new Response("Staff access required", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid input", { status: 400 });
        const { handleStaffMessage } = await import("@/lib/whatsapp-engine.server");
        const phone = `sim-${auth.userId}`;
        const reply = await handleStaffMessage(auth.supabase, phone, parsed.data.text, { userId: auth.userId, email: auth.email });
        return Response.json({ reply });
      },
    },
  },
});
