import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HotelRef {
  hotelId: string | null;
  floors: { id: string; name: string; building?: string | null }[];
  roomTypes: { id: string; name: string; base_rate: number; max_occupancy: number }[];
  ratePlans: {
    id: string;
    name: string;
    adjustment_type: string;
    adjustment_value: number;
  }[];
}

/**
 * Loads the active hotel context plus reference data (floors, room types, rate
 * plans) used across the reservation / room modules. Cached and shared.
 */
export function useHotelRef() {
  return useQuery({
    queryKey: ["hotel-ref"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HotelRef> => {
      const { data: hotel } = await supabase
        .from("hotels")
        .select("id")
        .eq("is_active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle();

      const hotelId = hotel?.id ?? null;

      const [floorsRes, typesRes, plansRes] = await Promise.all([
        supabase
          .from("floors")
          .select("id,name,level,buildings(name)")
          .order("level"),
        supabase
          .from("room_types")
          .select("id,name,base_rate,max_occupancy")
          .order("name"),
        supabase
          .from("rate_plans")
          .select("id,name,adjustment_type,adjustment_value")
          .eq("is_active", true)
          .order("name"),
      ]);

      return {
        hotelId,
        floors: (floorsRes.data ?? []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          name: f.name as string,
          building: (f.buildings as { name?: string } | null)?.name ?? null,
        })),
        roomTypes: (typesRes.data ?? []) as HotelRef["roomTypes"],
        ratePlans: (plansRes.data ?? []) as HotelRef["ratePlans"],
      };
    },
  });
}
