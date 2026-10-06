import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarRange,
  BedDouble,
  Users,
  Receipt,
  Wallet,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  ShieldCheck,
  Megaphone,
  Headphones,
  UserCog,
  Building2,
  ScrollText,
  Settings,
  Shirt,
  Search,
  ListTodo,
  Package,
  ChefHat,
  ConciergeBell,
  Bot,

} from "lucide-react";


/** All roles supported by EGREED Hospitality Enterprise. Mirrors the DB app_role enum. */
export type AppRole =
  | "super_admin"
  | "hotel_owner"
  | "general_manager"
  | "receptionist"
  | "accountant"
  | "housekeeping_manager"
  | "housekeeping_staff"
  | "restaurant_manager"
  | "cashier"
  | "waiter"
  | "chef"
  | "bar_staff"
  | "kitchen_staff"
  | "maintenance_manager"
  | "maintenance_staff"
  | "security_officer"
  | "marketing_manager"
  | "customer_support"
  | "guest_portal";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrator",
  hotel_owner: "Hotel Owner",
  general_manager: "General Manager",
  receptionist: "Receptionist",
  accountant: "Accountant",
  housekeeping_manager: "Housekeeping Manager",
  housekeeping_staff: "Housekeeping Staff",
  restaurant_manager: "Restaurant Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  chef: "Chef",
  bar_staff: "Bar Staff",
  kitchen_staff: "Kitchen Staff",
  maintenance_manager: "Maintenance Manager",
  maintenance_staff: "Maintenance Staff",
  security_officer: "Security Officer",
  marketing_manager: "Marketing Manager",
  customer_support: "Customer Support",
  guest_portal: "Guest Portal",
};


export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export const MANAGEMENT_ROLES: AppRole[] = [
  "super_admin",
  "hotel_owner",
  "general_manager",
];

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Undefined = every signed-in user. */
  roles?: AppRole[];
  /** Marks a module that is scaffolded but not yet fully built. */
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Central navigation + permission map. Adding a future module = add an entry here.
 * Role visibility is enforced both in the sidebar and via route-level checks.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      {
        title: "Room Calendar",
        to: "/calendar",
        icon: CalendarRange,
        roles: [
          ...MANAGEMENT_ROLES,
          "receptionist",
          "customer_support",
          "housekeeping_manager",
        ],
      },
      {
        title: "Front Desk",
        to: "/front-desk",
        icon: ConciergeBell,
        roles: [...MANAGEMENT_ROLES, "receptionist", "security_officer"],
      },
      {
        title: "AI Assistant",
        to: "/assistant",
        icon: Bot,
        roles: [
          ...MANAGEMENT_ROLES,
          "receptionist",
          "housekeeping_manager",
          "maintenance_manager",
          "marketing_manager",
          "restaurant_manager",
          "customer_support",
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Reservations",
        to: "/reservations",
        icon: CalendarCheck,
        roles: [...MANAGEMENT_ROLES, "receptionist", "customer_support"],
      },
      {
        title: "Rooms",
        to: "/rooms",
        icon: BedDouble,
        roles: [
          ...MANAGEMENT_ROLES,
          "receptionist",
          "housekeeping_manager",
          "housekeeping_staff",
        ],
      },
      {
        title: "Guests",
        to: "/guests",
        icon: Users,
        roles: [...MANAGEMENT_ROLES, "receptionist", "customer_support", "marketing_manager"],
      },
      {
        title: "Housekeeping",
        to: "/housekeeping",
        icon: Sparkles,
        roles: [...MANAGEMENT_ROLES, "housekeeping_manager", "housekeeping_staff", "receptionist"],
      },
      {
        title: "Laundry",
        to: "/laundry",
        icon: Shirt,
        roles: [...MANAGEMENT_ROLES, "housekeeping_manager", "housekeeping_staff", "receptionist"],
      },
      {
        title: "Lost & Found",
        to: "/lost-found",
        icon: Search,
        roles: [
          ...MANAGEMENT_ROLES,
          "housekeeping_manager",
          "housekeeping_staff",
          "receptionist",
          "security_officer",
          "customer_support",
        ],
      },
      {
        title: "Restaurant & POS",
        to: "/restaurant",
        icon: UtensilsCrossed,
        roles: [
          ...MANAGEMENT_ROLES,
          "restaurant_manager",
          "cashier",
          "waiter",
          "bar_staff",
          "chef",
          "kitchen_staff",
          "receptionist",
        ],
      },
      {
        title: "Kitchen Display",
        to: "/restaurant/kitchen",
        icon: ChefHat,
        roles: [...MANAGEMENT_ROLES, "restaurant_manager", "chef", "kitchen_staff", "waiter"],
      },

      {
        title: "Maintenance",
        to: "/maintenance",
        icon: Wrench,
        roles: [...MANAGEMENT_ROLES, "maintenance_manager", "maintenance_staff", "receptionist", "housekeeping_manager"],
      },
      {
        title: "Assets",
        to: "/assets",
        icon: Package,
        roles: [...MANAGEMENT_ROLES, "maintenance_manager"],
      },
      {
        title: "Tasks",
        to: "/tasks",
        icon: ListTodo,
      },
      {
        title: "Security",
        to: "/security",
        icon: ShieldCheck,
        roles: [...MANAGEMENT_ROLES, "security_officer"],
        soon: true,
      },
    ],
  },

  {
    label: "Finance",
    items: [
      {
        title: "Invoices",
        to: "/invoices",
        icon: Receipt,
        roles: [...MANAGEMENT_ROLES, "accountant", "receptionist", "cashier"],
      },
      {
        title: "Payments",
        to: "/payments",
        icon: Wallet,
        roles: [...MANAGEMENT_ROLES, "accountant", "cashier"],
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        title: "Staff",
        to: "/staff",
        icon: UserCog,
        roles: MANAGEMENT_ROLES,
      },
      {
        title: "Marketing",
        to: "/marketing",
        icon: Megaphone,
        roles: [...MANAGEMENT_ROLES, "marketing_manager"],
        soon: true,
      },
      {
        title: "Support",
        to: "/support",
        icon: Headphones,
        roles: [...MANAGEMENT_ROLES, "customer_support"],
        soon: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Properties",
        to: "/properties",
        icon: Building2,
        roles: MANAGEMENT_ROLES,
      },
      {
        title: "Activity Logs",
        to: "/activity",
        icon: ScrollText,
        roles: MANAGEMENT_ROLES,
      },
      { title: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

/** Returns true when the user's roles grant access to a nav item. */
export function canAccess(item: NavItem, roles: AppRole[]): boolean {
  if (roles.includes("super_admin")) return true;
  if (!item.roles) return true;
  return item.roles.some((r) => roles.includes(r));
}

export function isManagement(roles: AppRole[]): boolean {
  return roles.some((r) => MANAGEMENT_ROLES.includes(r));
}

/** Flat list of all nav items (used by command palette + route guards). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
