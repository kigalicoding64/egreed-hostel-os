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

export const Route = createFileRoute("/api/chat/guest")({
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

        // Resolve the guest record that belongs to the signed-in user.
        const { data: guestRow } = await supabase
          .from("guests")
          .select("id,full_name,hotel_id,loyalty_points,preferences")
          .eq("user_id", userId)
          .maybeSingle();

        const { data: hotel } = await supabase
          .from("hotels")
          .select("name,city,country,phone,email,currency,address")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const { data: outlets } = await supabase
          .from("outlets")
          .select("name,type,location,opens_at,closes_at,is_active")
          .eq("is_active", true);

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const lovable = createHotelAiProvider(key, runIdFetch);

        const guestId = guestRow?.id ?? null;

        const result = streamText({
          model: lovable.responses(HOTEL_AI_MODEL),
          stopWhen: stepCountIs(12),
          system: [
            `You are the virtual concierge for ${hotel?.name ?? "the hotel"}${hotel?.city ? ` in ${hotel.city}, ${hotel.country}` : ""}.`,
            `You are chatting with ${guestRow?.full_name ?? "a guest"} in their guest portal.`,
            "Be warm, brief and practical. Use short paragraphs or bullets, never long essays.",
            "Answer questions about the hotel, the guest's bookings, room status, restaurant orders and bill by calling your tools — never invent a booking, price, room number or date.",
            "If the guest wants something done (extra towels, late check-out, a complaint, a request for reception), call message_reception and then confirm that reception has been notified.",
            "If you genuinely do not know something, say so and offer to pass the question to reception.",
            hotel?.phone ? `Reception phone: ${hotel.phone}.` : "",
            hotel?.email ? `Hotel email: ${hotel.email}.` : "",
            hotel?.address ? `Address: ${hotel.address}.` : "",
            outlets?.length
              ? `Restaurants and bars: ${outlets
                  .map(
                    (o) =>
                      `${o.name} (${o.type.replace("_", " ")}${o.location ? `, ${o.location}` : ""}, ${String(o.opens_at).slice(0, 5)}–${String(o.closes_at).slice(0, 5)})`,
                  )
                  .join("; ")}.`
              : "",
            "Standard information: check-in from 14:00, check-out by 11:00, free Wi-Fi throughout, housekeeping daily, luggage storage and airport transfers available on request via reception.",
          ]
            .filter(Boolean)
            .join("\n"),
          messages: convertToModelMessages(body.messages as UIMessage[]),
          providerOptions: HOTEL_AI_PROVIDER_OPTIONS,
          tools: {
            get_my_bookings: tool({
              description:
                "List this guest's bookings with dates, room, status and amount. Use for any question about their stay, room number or dates.",
              inputSchema: z.object({}),
              execute: async () => {
                if (!guestId) return { bookings: [], note: "No guest profile linked yet." };
                const { data } = await supabase
                  .from("reservations")
                  .select(
                    "reference,status,check_in,check_out,num_guests,total_amount,special_requests,rooms(room_number,status,cleaning_status,room_types(name))",
                  )
                  .eq("guest_id", guestId)
                  .order("check_in", { ascending: false });
                return {
                  bookings: (data ?? []).map((r) => ({
                    reference: r.reference,
                    status: r.status,
                    checkIn: r.check_in,
                    checkOut: r.check_out,
                    guests: r.num_guests,
                    amount: money(r.total_amount),
                    room: r.rooms?.room_number ?? null,
                    roomType: r.rooms?.room_types?.name ?? null,
                    roomStatus: r.rooms?.status ?? null,
                    housekeeping: r.rooms?.cleaning_status ?? null,
                    requests: r.special_requests,
                  })),
                };
              },
            }),
            get_my_bill: tool({
              description:
                "Show this guest's invoices, payments and restaurant orders so you can answer billing questions.",
              inputSchema: z.object({}),
              execute: async () => {
                if (!guestId) return { invoices: [], orders: [] };
                const [invoices, orders] = await Promise.all([
                  supabase
                    .from("invoices")
                    .select("number,total,status,issued_at,due_date")
                    .eq("guest_id", guestId)
                    .order("issued_at", { ascending: false }),
                  supabase
                    .from("pos_orders")
                    .select("order_number,type,status,total,opened_at")
                    .eq("guest_id", guestId)
                    .order("opened_at", { ascending: false })
                    .limit(20),
                ]);
                return {
                  currency: hotel?.currency ?? "RWF",
                  invoices: (invoices.data ?? []).map((i) => ({
                    number: i.number,
                    total: money(i.total),
                    status: i.status,
                    issued: i.issued_at,
                    due: i.due_date,
                  })),
                  orders: (orders.data ?? []).map((o) => ({
                    number: o.order_number,
                    type: o.type,
                    status: o.status,
                    total: money(o.total),
                    opened: o.opened_at,
                  })),
                };
              },
            }),
            message_reception: tool({
              description:
                "Send the guest's request, question or complaint to reception. Creates a support ticket and alerts on-duty staff.",
              inputSchema: z.object({
                subject: z.string().describe("Short subject line, max 8 words"),
                message: z.string().describe("The full request in the guest's own words"),
                urgency: z
                  .enum(["low", "normal", "high", "urgent"])
                  .describe("How quickly reception should respond"),
                category: z
                  .enum(["housekeeping", "maintenance", "booking", "billing", "restaurant", "other"])
                  .describe("What the request is about"),
              }),
              execute: async ({ subject, message, urgency, category }) => {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

                const { data: guestFull } = await supabaseAdmin
                  .from("guests")
                  .select("id,full_name,email,phone,hotel_id")
                  .eq("user_id", userId)
                  .maybeSingle();
                if (!guestFull) {
                  return { ok: false, note: "No linked guest profile — ask them to call reception." };
                }

                const { data: stay } = await supabaseAdmin
                  .from("reservations")
                  .select("room_id")
                  .eq("guest_id", guestFull.id)
                  .in("status", ["checked_in", "confirmed", "pending"])
                  .order("check_in", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                const reference = `GST-${Date.now().toString(36).toUpperCase().slice(-6)}`;
                const { error } = await supabaseAdmin.from("support_tickets").insert({
                  hotel_id: guestFull.hotel_id,
                  reference,
                  subject: subject.slice(0, 120),
                  description: message,
                  category,
                  channel: "guest_portal",
                  priority: urgency,
                  status: "open",
                  guest_id: guestFull.id,
                  room_id: stay?.room_id ?? null,
                  guest_name: guestFull.full_name,
                  guest_contact: guestFull.email ?? guestFull.phone,
                });
                if (error) return { ok: false, note: error.message };

                // Alert reception and duty managers in the notification centre.
                const { data: staff } = await supabaseAdmin
                  .from("user_roles")
                  .select("user_id")
                  .in("role", ["receptionist", "general_manager", "hotel_owner", "customer_support"]);
                const recipients = Array.from(new Set((staff ?? []).map((s) => s.user_id)));
                if (recipients.length) {
                  await supabaseAdmin.from("notifications").insert(
                    recipients.map((uid) => ({
                      user_id: uid,
                      title: `Guest request · ${subject.slice(0, 60)}`,
                      message: `${guestFull.full_name}: ${message.slice(0, 180)}`,
                      type: urgency === "urgent" || urgency === "high" ? "warning" : "info",
                      link: "/support",
                    })),
                  );
                }

                return { ok: true, reference, priority: urgency };
              },
            }),
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            sendReasoning: false,
            headers: getLovableAiGatewayResponseHeaders(undefined, {}),
          }),
          runIdFetch,
        );
      },
    },
  },
});
