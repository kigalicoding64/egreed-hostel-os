import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasStaffAccess } from "./whatsapp-access";

export const simulateWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    if (!hasStaffAccess((rows ?? []).map((row) => row.role))) throw new Error("Staff access required.");
    const { handleStaffMessage } = await import("./whatsapp-engine.server");
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    const reply = await handleStaffMessage(context.supabase, `sim-${context.userId}`, data.text, { userId: context.userId, email });
    return { reply };
  });