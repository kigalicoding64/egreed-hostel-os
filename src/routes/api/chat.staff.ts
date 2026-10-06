import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  HOTEL_AI_MODEL,
  HOTEL_AI_PROVIDER_OPTIONS,
  createHotelAiProvider,
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { money, requireUser } from "@/lib/ai-hotel.server";

const STAFF_ROLES = [
  "super_admin",
  "hotel_owner",
  "general_manager",
  "receptionist",
  "housekeeping_manager",
  "maintenance_manager",
  "marketing_manager",
  "restaurant_manager",
  "customer_support",
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/api/chat/staff")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const auth = await requireUser(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, userId } = auth;

        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const roles = (roleRows ?? []).map((r) => r.role);
        if (!roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r))) {
          return new Response("Forbidden", { status: 403 });
        }

        const { data: hotel } = await supabase
          .from("hotels")
          .select("name,city,currency")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const lovable = createHotelAiProvider(key, runIdFetch);
        const empty = z.object({});

        const result = streamText({
          model: lovable.responses(HOTEL_AI_MODEL),
          stopWhen: stepCountIs(20),
          system: [
            `You are the operations analyst for ${hotel?.name ?? "the hotel"}${hotel?.city ? ` in ${hotel.city}` : ""}. Today is ${today()}. Currency: ${hotel?.currency ?? "RWF"}.`,
            `The user's roles: ${roles.join(", ")}.`,
            "Always fetch live data with your tools before answering; never invent figures. If a tool returns nothing, say so.",
            "When asked for a report, write it in clean markdown with a short headline summary, a small table of key figures, and 3–5 concrete recommendations.",
            "When suggesting actions (cleaning, maintenance, marketing), be specific: name rooms, tickets, segments, dates and an owner role, ordered by priority.",
            "Keep ordinary answers under about 200 words.",
          ].join("\n"),
          messages: convertToModelMessages(body.messages as UIMessage[]),
          providerOptions: HOTEL_AI_PROVIDER_OPTIONS,
          tools: {
            hotel_snapshot: tool({
              description:
                "Live overview: room counts by status, occupancy %, today's arrivals/departures, in-house guests and revenue in the last 30 days.",
              inputSchema: empty,
              execute: async () => {
                const t = today();
                const since = new Date(Date.now() - 30 * 864e5).toISOString();
                const [rooms, arrivals, departures, inHouse, payments] = await Promise.all([
                  supabase.from("rooms").select("status"),
                  supabase.from("reservations").select("id", { count: "exact", head: true }).eq("check_in", t).in("status", ["confirmed", "pending"]),
                  supabase.from("reservations").select("id", { count: "exact", head: true }).eq("check_out", t).eq("status", "checked_in"),
                  supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "checked_in"),
                  supabase.from("payments").select("amount").gte("paid_at", since),
                ]);
                const byStatus: Record<string, number> = {};
                for (const r of rooms.data ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
                const total = rooms.data?.length ?? 0;
                return {
                  totalRooms: total,
                  roomsByStatus: byStatus,
                  occupancyPct: total ? Math.round(((byStatus["occupied"] ?? 0) / total) * 100) : 0,
                  arrivalsToday: arrivals.count ?? 0,
                  departuresToday: departures.count ?? 0,
                  inHouse: inHouse.count ?? 0,
                  revenueLast30Days: money((payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0)),
                };
              },
            }),
            list_reservations: tool({
              description: "Reservations overlapping a date range, with guest, room, status, source and amount.",
              inputSchema: z.object({
                from: z.string().describe("Start date YYYY-MM-DD"),
                to: z.string().describe("End date YYYY-MM-DD"),
              }),
              execute: async ({ from, to }) => {
                const { data } = await supabase
                  .from("reservations")
                  .select("reference,status,source,check_in,check_out,total_amount,guests(full_name,vip_status),rooms(room_number)")
                  .lte("check_in", to)
                  .gte("check_out", from)
                  .order("check_in")
                  .limit(100);
                return (data ?? []).map((r) => ({
                  ref: r.reference,
                  status: r.status,
                  source: r.source,
                  in: r.check_in,
                  out: r.check_out,
                  amount: money(r.total_amount),
                  guest: r.guests?.full_name ?? null,
                  vip: r.guests?.vip_status ?? false,
                  room: r.rooms?.room_number ?? null,
                }));
              },
            }),
            housekeeping_status: tool({
              description: "Open housekeeping tasks plus rooms that are dirty or awaiting inspection.",
              inputSchema: empty,
              execute: async () => {
                const [tasks, rooms] = await Promise.all([
                  supabase.from("housekeeping_tasks").select("task_type,status,priority,scheduled_for,rooms(room_number)").in("status", ["pending", "in_progress", "waiting_inspection"]).limit(100),
                  supabase.from("rooms").select("room_number,status,cleaning_status").in("status", ["dirty", "cleaning", "inspected"]),
                ]);
                return {
                  openTasks: (tasks.data ?? []).map((t) => ({ room: t.rooms?.room_number, type: t.task_type, status: t.status, priority: t.priority, date: t.scheduled_for })),
                  roomsNeedingAttention: rooms.data ?? [],
                };
              },
            }),
            maintenance_status: tool({
              description: "Open maintenance tickets and preventive-maintenance jobs due in the next 14 days.",
              inputSchema: empty,
              execute: async () => {
                const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
                const [tickets, pm] = await Promise.all([
                  supabase.from("maintenance_tickets").select("reference,title,category,priority,status,reported_at,rooms(room_number)").not("status", "in", "(resolved,closed,cancelled)").limit(100),
                  supabase.from("pm_schedules").select("name,category,next_due").eq("is_active", true).lte("next_due", soon),
                ]);
                return {
                  openTickets: (tickets.data ?? []).map((t) => ({ ref: t.reference, title: t.title, category: t.category, priority: t.priority, status: t.status, room: t.rooms?.room_number, reported: t.reported_at })),
                  preventiveDue: pm.data ?? [],
                };
              },
            }),
            guest_insights: tool({
              description: "Guest base summary: totals, VIPs, top nationalities, booking source mix and repeat guests.",
              inputSchema: empty,
              execute: async () => {
                const [guests, res] = await Promise.all([
                  supabase.from("guests").select("id,nationality,vip_status,loyalty_points"),
                  supabase.from("reservations").select("guest_id,source,total_amount").limit(2000),
                ]);
                const nat: Record<string, number> = {};
                for (const g of guests.data ?? []) if (g.nationality) nat[g.nationality] = (nat[g.nationality] ?? 0) + 1;
                const src: Record<string, number> = {};
                const stays: Record<string, number> = {};
                for (const r of res.data ?? []) {
                  src[r.source] = (src[r.source] ?? 0) + 1;
                  if (r.guest_id) stays[r.guest_id] = (stays[r.guest_id] ?? 0) + 1;
                }
                return {
                  totalGuests: guests.data?.length ?? 0,
                  vipGuests: (guests.data ?? []).filter((g) => g.vip_status).length,
                  topNationalities: Object.entries(nat).sort((a, b) => b[1] - a[1]).slice(0, 5),
                  bookingSources: src,
                  repeatGuests: Object.values(stays).filter((n) => n > 1).length,
                };
              },
            }),
            marketing_performance: tool({
              description: "Marketing campaigns with budget, spend, conversions and revenue.",
              inputSchema: empty,
              execute: async () => {
                const { data } = await supabase.from("marketing_campaigns").select("name,channel,status,budget,spend,converted_count,revenue,start_date,end_date").limit(50);
                return (data ?? []).map((c) => ({ ...c, budget: money(c.budget), spend: money(c.spend), revenue: money(c.revenue) }));
              },
            }),
            restaurant_and_stock: tool({
              description: "Restaurant sales in the last 7 days and inventory items at or below reorder level.",
              inputSchema: empty,
              execute: async () => {
                const since = new Date(Date.now() - 7 * 864e5).toISOString();
                const [orders, stock] = await Promise.all([
                  supabase.from("pos_orders").select("total,type,status").gte("opened_at", since),
                  supabase.from("inventory_items").select("name,unit,stock_on_hand,reorder_level"),
                ]);
                const paid = (orders.data ?? []).filter((o) => o.status !== "void");
                return {
                  orders7d: paid.length,
                  sales7d: money(paid.reduce((s, o) => s + Number(o.total), 0)),
                  lowStock: (stock.data ?? []).filter((i) => Number(i.stock_on_hand) <= Number(i.reorder_level)),
                };
              },
            }),
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            headers: getLovableAiGatewayResponseHeaders(undefined, {}),
          }),
          runIdFetch,
        );
      },
    },
  },
});
