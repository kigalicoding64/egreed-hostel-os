/** Shared operations constants for Housekeeping, Maintenance, Laundry, Tasks. */

export const HK_STATUSES = [
  "pending",
  "in_progress",
  "waiting_inspection",
  "completed",
  "skipped",
] as const;
export type HkStatus = (typeof HK_STATUSES)[number];
export const HK_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  waiting_inspection: "Awaiting Inspection",
  completed: "Completed",
  skipped: "Skipped",
};
export const HK_STATUS_TONE: Record<string, string> = {
  pending: "warning",
  in_progress: "info",
  waiting_inspection: "primary",
  completed: "success",
  skipped: "neutral",
};

export const HK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const HK_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const HK_TASK_TYPES = [
  "standard",
  "checkout_clean",
  "stayover",
  "turndown",
  "deep_clean",
  "inspection",
] as const;
export const HK_TASK_TYPE_LABELS: Record<string, string> = {
  standard: "Standard Clean",
  checkout_clean: "Check-out Clean",
  stayover: "Stayover Service",
  turndown: "Turndown",
  deep_clean: "Deep Clean",
  inspection: "Inspection Only",
};

export const MAINT_CATEGORIES = [
  "electrical",
  "plumbing",
  "internet",
  "furniture",
  "doors",
  "windows",
  "hvac",
  "water",
  "lighting",
  "painting",
  "general",
] as const;
export const MAINT_CATEGORY_LABELS: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  internet: "Internet / TV",
  furniture: "Furniture",
  doors: "Doors / Locks",
  windows: "Windows",
  hvac: "HVAC / AC",
  water: "Water Systems",
  lighting: "Lighting",
  painting: "Painting",
  general: "General",
};

export const MAINT_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "cancelled",
] as const;
export type MaintStatus = (typeof MAINT_STATUSES)[number];
export const MAINT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};
export const MAINT_STATUS_TONE: Record<string, string> = {
  open: "warning",
  assigned: "info",
  in_progress: "primary",
  on_hold: "neutral",
  resolved: "success",
  closed: "neutral",
  cancelled: "destructive",
};

export const MAINT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export const MAINT_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

export const LAUNDRY_STATUSES = [
  "collected",
  "washing",
  "drying",
  "ironing",
  "delivered",
  "completed",
] as const;
export const LAUNDRY_STATUS_LABELS: Record<string, string> = {
  collected: "Collected",
  washing: "Washing",
  drying: "Drying",
  ironing: "Ironing",
  delivered: "Delivered",
  completed: "Completed",
};

export const LAUNDRY_KINDS = ["linen", "uniform", "guest"] as const;
export const LAUNDRY_KIND_LABELS: Record<string, string> = {
  linen: "Room Linen",
  uniform: "Staff Uniform",
  guest: "Guest Laundry",
};

export const LOST_FOUND_STATUSES = ["stored", "claimed", "returned", "disposed"] as const;
export const LOST_FOUND_STATUS_LABELS: Record<string, string> = {
  stored: "In Storage",
  claimed: "Claimed",
  returned: "Returned",
  disposed: "Disposed",
};

export const ASSET_CONDITIONS = [
  "excellent",
  "good",
  "fair",
  "poor",
  "out_of_service",
] as const;
export const ASSET_CONDITION_LABELS: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  out_of_service: "Out of Service",
};

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/** Consistent priority tone across ops modules. */
export const PRIORITY_TONE: Record<string, string> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "destructive",
  critical: "destructive",
};
