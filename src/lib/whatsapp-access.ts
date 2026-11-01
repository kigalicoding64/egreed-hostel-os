import type { AppRole } from "./rbac";

export function hasStaffAccess(roles: AppRole[]): boolean {
  return roles.some((role) => role !== "guest_portal");
}

export function safeChatText(text: string): string {
  return /^\s*login\b/i.test(text) ? "LOGIN ••••" : text;
}