import type { AppRole } from "./rbac";

/** Lower number = more authority. */
export const ROLE_TIER: Record<AppRole, number> = {
  super_admin: 1,
  hotel_owner: 2,
  general_manager: 2,
  restaurant_manager: 3,
  housekeeping_manager: 3,
  maintenance_manager: 3,
  marketing_manager: 3,
  accountant: 4,
  receptionist: 4,
  cashier: 4,
  waiter: 4,
  chef: 4,
  bar_staff: 4,
  kitchen_staff: 4,
  housekeeping_staff: 4,
  maintenance_staff: 4,
  security_officer: 4,
  customer_support: 4,
  guest_portal: 5,
};

const DEPT_STAFF: Partial<Record<AppRole, AppRole[]>> = {
  restaurant_manager: ["waiter", "chef", "bar_staff", "kitchen_staff", "cashier"],
  housekeeping_manager: ["housekeeping_staff"],
  maintenance_manager: ["maintenance_staff"],
  marketing_manager: ["customer_support"],
};

/** Roles the actor is allowed to grant or revoke. */
export function grantableRoles(actor: AppRole[]): AppRole[] {
  if (actor.includes("super_admin")) return (Object.keys(ROLE_TIER) as AppRole[]);
  const out = new Set<AppRole>();
  if (actor.includes("hotel_owner") || actor.includes("general_manager")) {
    (Object.keys(ROLE_TIER) as AppRole[]).filter((r) => ROLE_TIER[r] >= 3).forEach((r) => out.add(r));
  }
  for (const r of actor) DEPT_STAFF[r]?.forEach((x) => out.add(x));
  return [...out];
}

export function canManageUsers(actor: AppRole[]): boolean {
  return grantableRoles(actor).length > 0;
}

/** Returns an error message, or null when the change is allowed. */
export function checkRoleChange(
  actor: AppRole[],
  actorId: string,
  targetId: string,
  targetCurrent: AppRole[],
  next: AppRole[],
): string | null {
  if (actorId === targetId) return "You cannot change your own roles.";
  const allowed = new Set(grantableRoles(actor));
  if (allowed.size === 0) return "You are not allowed to manage staff.";
  const changed = [
    ...next.filter((r) => !targetCurrent.includes(r)),
    ...targetCurrent.filter((r) => !next.includes(r)),
  ];
  const bad = changed.find((r) => !allowed.has(r));
  if (bad) return `You cannot grant or remove the ${bad} role.`;
  if (!actor.includes("super_admin")) {
    const best = Math.min(...actor.map((r) => ROLE_TIER[r]));
    if (targetCurrent.some((r) => ROLE_TIER[r] <= best)) return "You cannot change someone with equal or higher access.";
  }
  return null;
}
