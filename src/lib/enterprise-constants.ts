/** Shared constants for Support, Security and Marketing modules. */

/* ---------------------------------- SUPPORT --------------------------------- */

export const SUPPORT_STATUSES = [
  "open",
  "in_progress",
  "waiting_guest",
  "resolved",
  "closed",
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_guest: "Waiting on Guest",
  resolved: "Resolved",
  closed: "Closed",
};
export const SUPPORT_STATUS_TONE: Record<string, string> = {
  open: "warning",
  in_progress: "info",
  waiting_guest: "primary",
  resolved: "success",
  closed: "neutral",
};

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const SUPPORT_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
export const SUPPORT_PRIORITY_TONE: Record<string, string> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "destructive",
};

export const SUPPORT_CATEGORIES = [
  "general",
  "housekeeping",
  "maintenance",
  "food_beverage",
  "billing",
  "reservation",
  "complaint",
  "amenity_request",
] as const;
export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  food_beverage: "Food & Beverage",
  billing: "Billing",
  reservation: "Reservation",
  complaint: "Complaint",
  amenity_request: "Amenity Request",
};

export const SUPPORT_CHANNELS = [
  "front_desk",
  "phone",
  "email",
  "whatsapp",
  "in_room",
  "website",
  "walk_in",
] as const;
export const SUPPORT_CHANNEL_LABELS: Record<string, string> = {
  front_desk: "Front Desk",
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  in_room: "In-Room",
  website: "Website",
  walk_in: "Walk-in",
};

/** Target first-response / resolution time in hours per priority. */
export const SUPPORT_SLA_HOURS: Record<string, number> = {
  urgent: 1,
  high: 4,
  normal: 12,
  low: 24,
};

/* --------------------------------- SECURITY --------------------------------- */

export const INCIDENT_STATUSES = [
  "reported",
  "investigating",
  "escalated",
  "resolved",
  "closed",
] as const;
export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  investigating: "Investigating",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};
export const INCIDENT_STATUS_TONE: Record<string, string> = {
  reported: "warning",
  investigating: "info",
  escalated: "destructive",
  resolved: "success",
  closed: "neutral",
};

export const INCIDENT_SEVERITIES = ["low", "moderate", "high", "critical"] as const;
export const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};
export const INCIDENT_SEVERITY_TONE: Record<string, string> = {
  low: "neutral",
  moderate: "info",
  high: "warning",
  critical: "destructive",
};

export const INCIDENT_CATEGORIES = [
  "theft",
  "trespass",
  "altercation",
  "medical",
  "fire_safety",
  "property_damage",
  "noise",
  "suspicious_activity",
  "access_control",
  "other",
] as const;
export const INCIDENT_CATEGORY_LABELS: Record<string, string> = {
  theft: "Theft",
  trespass: "Trespass",
  altercation: "Altercation",
  medical: "Medical",
  fire_safety: "Fire & Safety",
  property_damage: "Property Damage",
  noise: "Noise Disturbance",
  suspicious_activity: "Suspicious Activity",
  access_control: "Access Control",
  other: "Other",
};

export const PATROL_STATUSES = ["scheduled", "completed", "missed"] as const;
export const PATROL_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
};
export const PATROL_STATUS_TONE: Record<string, string> = {
  scheduled: "info",
  completed: "success",
  missed: "destructive",
};

/* -------------------------------- MARKETING --------------------------------- */

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const CAMPAIGN_STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "primary",
  cancelled: "destructive",
};

export const CAMPAIGN_CHANNELS = [
  "email",
  "sms",
  "whatsapp",
  "social",
  "google_ads",
  "ota",
  "print",
  "referral",
] as const;
export const CAMPAIGN_CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  social: "Social Media",
  google_ads: "Google Ads",
  ota: "OTA / Channel",
  print: "Print",
  referral: "Referral",
};

export const CAMPAIGN_OBJECTIVES = [
  "bookings",
  "occupancy",
  "loyalty",
  "awareness",
  "events",
  "restaurant",
] as const;
export const CAMPAIGN_OBJECTIVE_LABELS: Record<string, string> = {
  bookings: "Direct Bookings",
  occupancy: "Occupancy Fill",
  loyalty: "Loyalty & Retention",
  awareness: "Brand Awareness",
  events: "Events & Banquets",
  restaurant: "Restaurant Covers",
};

export interface CampaignMetrics {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  roi: number;
  costPerConversion: number;
}

/** Pure campaign performance maths, shared by the table, cards and exports. */
export function campaignMetrics(c: {
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  revenue: number;
  spend: number;
}): CampaignMetrics {
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  return {
    openRate: pct(c.opened_count, c.sent_count),
    clickRate: pct(c.clicked_count, c.sent_count),
    conversionRate: pct(c.converted_count, c.sent_count),
    roi: c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : 0,
    costPerConversion: c.converted_count > 0 ? c.spend / c.converted_count : 0,
  };
}
