/**
 * WhatsApp staff command engine (server-only).
 * Shared by the WhatsApp webhook and the in-app simulator: same login, same
 * role checks, same database, so WhatsApp and the dashboard always agree.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = ReturnType<typeof createClient<Database>>;
type Role = Database["public"]["Enums"]["app_role"];

const SESSION_HOURS = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const MGMT: Role[] = ["super_admin", "hotel_owner", "general_manager"];
const CAN = {
  rooms: [...MGMT, "receptionist", "housekeeping_manager", "housekeeping_staff", "security_officer", "customer_support", "maintenance_manager", "maintenance_staff"] as Role[],
  setRoom: [...MGMT, "receptionist", "housekeeping_manager", "housekeeping_staff"] as Role[],
  cleaning: [...MGMT, "receptionist", "housekeeping_manager", "housekeeping_staff"] as Role[],
  frontDesk: [...MGMT, "receptionist", "customer_support"] as Role[],
  orders: [...MGMT, "restaurant_manager", "chef", "kitchen_staff", "waiter", "bar_staff", "cashier"] as Role[],
  stock: [...MGMT, "restaurant_manager", "chef", "kitchen_staff", "bar_staff"] as Role[],
  stockWrite: [...MGMT, "restaurant_manager", "chef", "kitchen_staff", "bar_staff"] as Role[],
  maintenance: [...MGMT, "maintenance_manager", "maintenance_staff"] as Role[],
  report: [...MGMT, "accountant"] as Role[],
};
type Perm = keyof typeof CAN;
const has = (roles: Role[], p: Perm) => roles.some((r) => CAN[p].includes(r));

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) => Math.round(Number(n ?? 0)).toLocaleString("en-US");

const HELP: Record<Perm, string> = {
  rooms: "*ROOMS* [dirty|available|occupied] – room list\n*ROOM 101* – one room",
  setRoom: "*CLEAN 101* / *DIRTY 101* / *INSPECTED 101* – set room status",
  cleaning: "*TASKS* – open cleaning jobs\n*START 101* / *DONE 101* – cleaning job",
  frontDesk: "*ARRIVALS* / *DEPARTURES* – today's guests",
  orders: "*ORDERS* – open kitchen orders\n*READY ORD-123* / *SERVED ORD-123*",
  stock: "*STOCK* [name] – stock levels / low stock",
  stockWrite: "*USED 5 rice* / *RECEIVED 20 water* / *WASTE 2 milk* – record stock",
  maintenance: "*FAULTS* – open maintenance tickets",
  report: "*REPORT* – today's occupancy & revenue",
};

function helpFor(roles: Role[]) {
  const lines = (Object.keys(HELP) as Perm[]).filter((p) => has(roles, p)).map((p) => HELP[p]);
  return ["📋 *What you can do:*", ...lines, "*WHOAMI* – your account\n*LOGOUT* – sign out"].join("\n");
}

export async function handleStaffMessage(admin: Admin, phone: string, raw: string): Promise<string> {
  const text = raw.trim().replace(/\s+/g, " ");
  const [cmdRaw, ...rest] = text.split(" ");
  const cmd = (cmdRaw ?? "").toUpperCase();
  const arg = rest.join(" ");

  const { data: session } = await admin.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();

  // ---------- LOGIN ----------
  if (cmd === "LOGIN") {
    if (session?.locked_until && new Date(session.locked_until) > new Date()) {
      return "🔒 Too many wrong attempts. Try again in a few minutes.";
    }
    const [email, ...pw] = rest;
    const password = pw.join(" ");
    if (!email || !password) return "Send: *LOGIN your@email.com yourpassword*";
    const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const failed = (session?.failed_attempts ?? 0) + 1;
      await admin.from("whatsapp_sessions").upsert(
        {
          phone,
          failed_attempts: failed,
          locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
          user_id: null,
          expires_at: null,
        },
        { onConflict: "phone" },
      );
      return "❌ Wrong email or password.";
    }
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
    const roles = (roleRows ?? []).map((r) => r.role as Role).filter((r) => r !== "guest_portal");
    if (roles.length === 0) return "⛔ This account has no staff access.";
    await admin.from("whatsapp_sessions").upsert(
      {
        phone,
        user_id: data.user.id,
        email: data.user.email ?? email,
        expires_at: new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString(),
        last_active_at: new Date().toISOString(),
        failed_attempts: 0,
        locked_until: null,
      },
      { onConflict: "phone" },
    );
    return `✅ Signed in as ${data.user.email}\nRoles: ${roles.join(", ")}\n⚠️ Please delete your LOGIN message from this chat.\n\n${helpFor(roles)}`;
  }

  const active = session?.user_id && session.expires_at && new Date(session.expires_at) > new Date();
  if (!active) {
    return "👋 Welcome to EGREED staff WhatsApp.\nTo start, send:\n*LOGIN your@email.com yourpassword*";
  }
  const userId = session!.user_id!;

  if (cmd === "LOGOUT") {
    await admin.from("whatsapp_sessions").update({ user_id: null, expires_at: null }).eq("phone", phone);
    return "👋 Signed out.";
  }

  await admin.from("whatsapp_sessions").update({ last_active_at: new Date().toISOString() }).eq("phone", phone);
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (roleRows ?? []).map((r) => r.role as Role);
  const deny = "⛔ Your role can't do that. Send *HELP* to see your options.";
  const { data: hotel } = await admin.from("hotels").select("id,name,currency").eq("is_active", true).limit(1).maybeSingle();
  const cur = hotel?.currency ?? "RWF";

  switch (cmd) {
    case "HELP":
    case "MENU":
    case "HI":
    case "HELLO":
      return helpFor(roles);
    case "WHOAMI":
      return `👤 ${session!.email}\nRoles: ${roles.join(", ")}\nSession ends ${new Date(session!.expires_at!).toUTCString()}`;

    case "ROOMS": {
      if (!has(roles, "rooms")) return deny;
      let q = admin.from("rooms").select("room_number,status").order("room_number");
      if (arg) q = q.eq("status", arg.toLowerCase() as Database["public"]["Enums"]["room_status"]);
      const { data } = await q.limit(60);
      if (!data?.length) return "No rooms found.";
      const counts: Record<string, number> = {};
      data.forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));
      return `🛏 *Rooms* (${data.length})\n${Object.entries(counts).map(([s, n]) => `${s}: ${n}`).join(" · ")}\n\n${data.map((r) => `${r.room_number} – ${r.status}`).join("\n")}`;
    }
    case "ROOM": {
      if (!has(roles, "rooms")) return deny;
      const { data: room } = await admin.from("rooms").select("id,room_number,status").eq("room_number", arg).maybeSingle();
      if (!room) return `Room ${arg} not found.`;
      const { data: res } = await admin
        .from("reservations")
        .select("check_in,check_out,status,guests(first_name,last_name)")
        .eq("room_id", room.id)
        .in("status", ["checked_in", "confirmed"])
        .gte("check_out", today())
        .order("check_in")
        .limit(1)
        .maybeSingle();
      const g = (res as { guests?: { first_name?: string; last_name?: string } } | null)?.guests;
      return `🛏 *Room ${room.room_number}* – ${room.status}${res ? `\nGuest: ${g?.first_name ?? ""} ${g?.last_name ?? ""} (${res.status})\n${res.check_in} → ${res.check_out}` : "\nNo current guest."}`;
    }
    case "CLEAN":
    case "DIRTY":
    case "INSPECTED": {
      if (!has(roles, "setRoom")) return deny;
      const status = cmd === "CLEAN" ? "available" : (cmd.toLowerCase() as "dirty" | "inspected");
      const { data, error } = await admin.from("rooms").update({ status }).eq("room_number", arg).select("room_number");
      if (error || !data?.length) return `Room ${arg} not found.`;
      return `✅ Room ${arg} is now *${status}*. The dashboard is updated.`;
    }
    case "TASKS": {
      if (!has(roles, "cleaning")) return deny;
      const { data } = await admin
        .from("housekeeping_tasks")
        .select("status,priority,task_type,rooms(room_number)")
        .in("status", ["pending", "in_progress"])
        .order("priority", { ascending: false })
        .limit(30);
      if (!data?.length) return "🧹 No open cleaning jobs.";
      return `🧹 *Open cleaning jobs* (${data.length})\n${data.map((t) => `${(t as { rooms?: { room_number?: string } }).rooms?.room_number ?? "?"} – ${t.task_type} – ${t.priority} – ${t.status}`).join("\n")}`;
    }
    case "START":
    case "DONE": {
      if (!has(roles, "cleaning")) return deny;
      const { data: room } = await admin.from("rooms").select("id").eq("room_number", arg).maybeSingle();
      if (!room) return `Room ${arg} not found.`;
      const { data: task } = await admin
        .from("housekeeping_tasks")
        .select("id,started_at")
        .eq("room_id", room.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (!task) return `No open cleaning job for room ${arg}.`;
      const now = new Date().toISOString();
      if (cmd === "START") {
        await admin.from("housekeeping_tasks").update({ status: "in_progress", started_at: now, assigned_to: userId }).eq("id", task.id);
        await admin.from("rooms").update({ status: "cleaning" }).eq("id", room.id);
        return `🧽 Cleaning started for room ${arg}.`;
      }
      await admin.from("housekeeping_tasks").update({ status: "completed", completed_at: now }).eq("id", task.id);
      await admin.from("rooms").update({ status: "available" }).eq("id", room.id);
      return `✅ Room ${arg} cleaned and ready.`;
    }
    case "ARRIVALS":
    case "DEPARTURES": {
      if (!has(roles, "frontDesk")) return deny;
      const col = cmd === "ARRIVALS" ? "check_in" : "check_out";
      const { data } = await admin
        .from("reservations")
        .select("reference,status,rooms(room_number),guests(first_name,last_name)")
        .eq(col, today())
        .not("status", "in", "(cancelled,no_show)")
        .limit(40);
      if (!data?.length) return `No ${cmd.toLowerCase()} today.`;
      return `🧳 *${cmd === "ARRIVALS" ? "Arrivals" : "Departures"} today* (${data.length})\n${data
        .map((r) => {
          const x = r as { rooms?: { room_number?: string }; guests?: { first_name?: string; last_name?: string } };
          return `${x.guests?.first_name ?? ""} ${x.guests?.last_name ?? ""} – room ${x.rooms?.room_number ?? "-"} – ${r.status}`;
        })
        .join("\n")}`;
    }
    case "ORDERS": {
      if (!has(roles, "orders")) return deny;
      const { data } = await admin
        .from("pos_orders")
        .select("order_number,kitchen_status,total,rooms(room_number),pos_order_items(name,quantity)")
        .in("kitchen_status", ["new", "preparing", "ready"])
        .order("opened_at")
        .limit(20);
      if (!data?.length) return "🍽 No open kitchen orders.";
      return `🍽 *Open orders* (${data.length})\n${data
        .map((o) => {
          const x = o as { rooms?: { room_number?: string }; pos_order_items?: { name: string; quantity: number }[] };
          return `*${o.order_number}* – ${o.kitchen_status}${x.rooms?.room_number ? ` – room ${x.rooms.room_number}` : ""}\n  ${(x.pos_order_items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}`;
        })
        .join("\n")}`;
    }
    case "READY":
    case "SERVED":
    case "PREPARING": {
      if (!has(roles, "orders")) return deny;
      const ks = cmd === "SERVED" ? "served" : cmd.toLowerCase();
      const { data, error } = await admin
        .from("pos_orders")
        .update({ kitchen_status: ks as Database["public"]["Enums"]["kitchen_status"] })
        .ilike("order_number", arg)
        .select("order_number");
      if (error || !data?.length) return `Order ${arg} not found.`;
      return `✅ Order ${data[0]!.order_number} is now *${ks}*.`;
    }
    case "STOCK": {
      if (!has(roles, "stock")) return deny;
      let q = admin.from("inventory_items").select("name,unit,stock_on_hand,reorder_level").order("name");
      if (arg) q = q.ilike("name", `%${arg}%`);
      const { data } = await q.limit(80);
      if (!data?.length) return "No stock items found.";
      const list = arg ? data : data.filter((i) => Number(i.stock_on_hand) <= Number(i.reorder_level));
      if (!list.length) return "📦 All stock is above reorder levels. Send *STOCK name* to check an item.";
      return `📦 *${arg ? "Stock" : "Low stock"}*\n${list.map((i) => `${Number(i.stock_on_hand) <= Number(i.reorder_level) ? "⚠️" : "•"} ${i.name}: ${i.stock_on_hand} ${i.unit} (reorder at ${i.reorder_level})`).join("\n")}`;
    }
    case "USED":
    case "RECEIVED":
    case "WASTE": {
      if (!has(roles, "stockWrite")) return deny;
      const m = arg.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)\s+(.+)$/);
      if (!m) return `Send: *${cmd} 5 rice* (amount then item)`;
      const qty = Number(m[1]!.replace(",", "."));
      const term = m[3]!.trim();
      const { data: items } = await admin.from("inventory_items").select("id,hotel_id,name,unit,stock_on_hand,unit_cost,reorder_level").ilike("name", `%${term}%`).limit(5);
      if (!items?.length) return `No stock item matches "${term}". Send *STOCK* to see names.`;
      if (items.length > 1 && !items.some((i) => i.name.toLowerCase() === term.toLowerCase()))
        return `Which one?\n${items.map((i) => `• ${i.name}`).join("\n")}\nSend the full name.`;
      const item = items.find((i) => i.name.toLowerCase() === term.toLowerCase()) ?? items[0]!;
      const type = cmd === "USED" ? "usage" : cmd === "WASTE" ? "waste" : "restock";
      const delta = type === "restock" ? qty : -qty;
      const newStock = Number(item.stock_on_hand) + delta;
      const { error } = await admin.from("inventory_movements").insert({
        hotel_id: item.hotel_id,
        inventory_item_id: item.id,
        type,
        quantity: qty,
        unit_cost: item.unit_cost,
        reason: "Recorded via WhatsApp",
        reference: `whatsapp:${phone.slice(-4)}`,
        created_by: userId,
      });
      if (error) return "Could not save that. Please try again.";
      await admin.from("inventory_items").update({ stock_on_hand: newStock }).eq("id", item.id);
      const warn = newStock <= Number(item.reorder_level) ? `\n⚠️ Below reorder level (${item.reorder_level}).` : "";
      return `✅ ${type === "restock" ? "Received" : type === "waste" ? "Wasted" : "Used"} ${qty} ${item.unit} ${item.name}.\nNow in stock: ${newStock} ${item.unit}${warn}`;
    }
    case "FAULTS": {
      if (!has(roles, "maintenance")) return deny;
      const { data } = await admin
        .from("maintenance_tickets")
        .select("title,priority,status,rooms(room_number)")
        .not("status", "in", "(resolved,closed,cancelled)")
        .limit(25);
      if (!data?.length) return "🔧 No open maintenance tickets.";
      return `🔧 *Open tickets* (${data.length})\n${data.map((t) => `${(t as { rooms?: { room_number?: string } }).rooms?.room_number ?? "-"} – ${t.title} – ${t.priority} – ${t.status}`).join("\n")}`;
    }
    case "REPORT": {
      if (!has(roles, "report")) return deny;
      const [{ data: rooms }, { data: pays }, { count: arr }, { count: dep }] = await Promise.all([
        admin.from("rooms").select("status"),
        admin.from("payments").select("amount").gte("created_at", `${today()}T00:00:00Z`),
        admin.from("reservations").select("id", { count: "exact", head: true }).eq("check_in", today()),
        admin.from("reservations").select("id", { count: "exact", head: true }).eq("check_out", today()),
      ]);
      const total = rooms?.length ?? 0;
      const occ = rooms?.filter((r) => r.status === "occupied").length ?? 0;
      const dirty = rooms?.filter((r) => r.status === "dirty").length ?? 0;
      const rev = (pays ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
      return `📊 *${hotel?.name ?? "Hotel"} – ${today()}*\nOccupancy: ${total ? Math.round((occ / total) * 100) : 0}% (${occ}/${total})\nArrivals: ${arr ?? 0} · Departures: ${dep ?? 0}\nDirty rooms: ${dirty}\nPayments today: ${fmt(rev)} ${cur}`;
    }
    default:
      return `I didn't understand "${cmdRaw}".\n\n${helpFor(roles)}`;
  }
}

/** Sends a WhatsApp text through the Lovable connector gateway. */
export async function sendWhatsAppText(to: string, body: string): Promise<{ id?: string; error?: string }> {
  const lk = process.env["LOVABLE_API_KEY"];
  const wk = process.env["WHATSAPP_API_KEY"];
  if (!lk || !wk) return { error: "WhatsApp is not connected" };
  const res = await fetch("https://connector-gateway.lovable.dev/whatsapp/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": wk, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: body.slice(0, 4000) } }),
  });
  const txt = await res.text();
  if (!res.ok) return { error: `${res.status}: ${txt.slice(0, 500)}` };
  try {
    return { id: (JSON.parse(txt) as { messages?: { id: string }[] }).messages?.[0]?.id };
  } catch {
    return {};
  }
}
