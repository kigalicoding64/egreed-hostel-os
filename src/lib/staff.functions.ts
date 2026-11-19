import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALL_ROLES, type AppRole } from "./rbac";
import { checkRoleChange } from "./role-policy";

const roleEnum = z.enum(ALL_ROLES as [AppRole, ...AppRole[]]);

async function actorRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: AppRole }) => r.role);
}

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    fullName: z.string().trim().min(1).max(120),
    jobTitle: z.string().trim().max(120).optional(),
    roles: z.array(roleEnum).min(1).max(5),
  }))
  .handler(async ({ data, context }) => {
    const actor = await actorRoles(context.supabase, context.userId);
    const err = checkRoleChange(actor, context.userId, "new", [], data.roles);
    if (err) throw new Error(err);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id, full_name: data.fullName, email: data.email, job_title: data.jobTitle ?? null, is_active: true });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: id, role })));
    if (rErr) throw new Error(rErr.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "staff_user_created", entity: "user_roles", entity_id: id,
      metadata: { target_email: data.email, granted_roles: data.roles },
    });
    return { id };
  });

export const updateStaffRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), roles: z.array(roleEnum).max(5) }))
  .handler(async ({ data, context }) => {
    const actor = await actorRoles(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const current = (cur ?? []).map((r) => r.role as AppRole);
    const err = checkRoleChange(actor, context.userId, data.userId, current, data.roles);
    if (err) throw new Error(err);
    const added = data.roles.filter((r) => !current.includes(r));
    const removed = current.filter((r) => !data.roles.includes(r));
    if (removed.length) await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).in("role", removed);
    if (added.length) {
      const { error } = await supabaseAdmin.from("user_roles").insert(added.map((role) => ({ user_id: data.userId, role })));
      if (error) throw new Error(error.message);
    }
    if (added.length || removed.length) {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: context.userId, action: "roles_changed", entity: "user_roles", entity_id: data.userId,
        metadata: { previous_roles: current, granted: added, revoked: removed },
      });
    }
    return { added, removed };
  });

export const listRoleAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await actorRoles(context.supabase, context.userId);
    if (!actor.some((r) => ["super_admin", "hotel_owner", "general_manager"].includes(r))) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("audit_logs").select("id,action,user_id,entity_id,metadata,created_at")
      .eq("entity", "user_roles").order("created_at", { ascending: false }).limit(30);
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
    return (data ?? []).map((r) => {
      const m = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id, action: r.action, user_id: r.user_id, entity_id: r.entity_id, created_at: r.created_at,
        metadata: { target_email: String(m.target_email ?? ""), granted_roles: arr(m.granted_roles), granted: arr(m.granted), revoked: arr(m.revoked) },
      };
    });
  });
