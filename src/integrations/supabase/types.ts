export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string
          code: string
          condition: Database["public"]["Enums"]["asset_condition"]
          created_at: string
          depreciation_years: number
          hotel_id: string
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number
          room_id: string | null
          serial_number: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          category?: string
          code?: string
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          depreciation_years?: number
          hotel_id: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          room_id?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          category?: string
          code?: string
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          depreciation_years?: number
          hotel_id?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          room_id?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      banquet_events: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string | null
          event_date: string
          event_type: string
          guest_count: number
          guest_id: string | null
          hotel_id: string
          id: string
          menu_notes: string | null
          name: string
          outlet_id: string | null
          package_name: string | null
          package_price: number
          special_requests: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["banquet_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          guest_count?: number
          guest_id?: string | null
          hotel_id: string
          id?: string
          menu_notes?: string | null
          name: string
          outlet_id?: string | null
          package_name?: string | null
          package_price?: number
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["banquet_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          guest_count?: number
          guest_id?: string | null
          hotel_id?: string
          id?: string
          menu_notes?: string | null
          name?: string
          outlet_id?: string | null
          package_name?: string | null
          package_price?: number
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["banquet_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banquet_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banquet_events_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banquet_events_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          hotel_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hotel_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hotel_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          hotel_id: string | null
          id: string
          is_active: boolean
          phone: string | null
          position: string | null
          profile_id: string | null
          salary: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          salary?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          salary?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          id: string
          level: number
          name: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          level?: number
          name: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          hotel_id: string | null
          id: string
          id_document: string | null
          loyalty_points: number
          national_id: string | null
          nationality: string | null
          notes: string | null
          passport: string | null
          phone: string | null
          photo_url: string | null
          preferences: string | null
          updated_at: string
          vehicle_info: string | null
          vip_status: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          hotel_id?: string | null
          id?: string
          id_document?: string | null
          loyalty_points?: number
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          phone?: string | null
          photo_url?: string | null
          preferences?: string | null
          updated_at?: string
          vehicle_info?: string | null
          vip_status?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          hotel_id?: string | null
          id?: string
          id_document?: string | null
          loyalty_points?: number
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          phone?: string | null
          photo_url?: string | null
          preferences?: string | null
          updated_at?: string
          vehicle_info?: string | null
          vip_status?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          currency: string
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          hotel_id: string
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["hk_priority"]
          room_id: string
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["hk_task_status"]
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          hotel_id: string
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["hk_priority"]
          room_id: string
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["hk_task_status"]
          task_type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          hotel_id?: string
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["hk_priority"]
          room_id?: string
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["hk_task_status"]
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          hotel_id: string
          id: string
          name: string
          outlet_id: string | null
          reorder_level: number
          stock_on_hand: number
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          hotel_id: string
          id?: string
          name: string
          outlet_id?: string | null
          reorder_level?: number
          stock_on_hand?: number
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          hotel_id?: string
          id?: string
          name?: string
          outlet_id?: string | null
          reorder_level?: number
          stock_on_hand?: number
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          hotel_id: string
          id: string
          inventory_item_id: string
          quantity: number
          reason: string | null
          reference: string | null
          type: Database["public"]["Enums"]["stock_move_type"]
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hotel_id: string
          id?: string
          inventory_item_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["stock_move_type"]
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hotel_id?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["stock_move_type"]
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          guest_id: string | null
          hotel_id: string
          id: string
          issued_at: string
          number: string
          reservation_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          guest_id?: string | null
          hotel_id: string
          id?: string
          issued_at?: string
          number?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          guest_id?: string | null
          hotel_id?: string
          id?: string
          issued_at?: string
          number?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_items: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          kind: Database["public"]["Enums"]["laundry_kind"]
          name: string
          reorder_level: number
          stock_on_hand: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          kind?: Database["public"]["Enums"]["laundry_kind"]
          name: string
          reorder_level?: number
          stock_on_hand?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["laundry_kind"]
          name?: string
          reorder_level?: number
          stock_on_hand?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_orders: {
        Row: {
          collected_at: string
          created_at: string
          created_by: string | null
          damaged_count: number
          delivered_at: string | null
          guest_id: string | null
          hotel_id: string
          id: string
          kind: Database["public"]["Enums"]["laundry_kind"]
          lines: Json
          notes: string | null
          reference: string
          replacement_cost: number
          room_id: string | null
          status: Database["public"]["Enums"]["laundry_status"]
          updated_at: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          created_by?: string | null
          damaged_count?: number
          delivered_at?: string | null
          guest_id?: string | null
          hotel_id: string
          id?: string
          kind?: Database["public"]["Enums"]["laundry_kind"]
          lines?: Json
          notes?: string | null
          reference?: string
          replacement_cost?: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["laundry_status"]
          updated_at?: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          created_by?: string | null
          damaged_count?: number
          delivered_at?: string | null
          guest_id?: string | null
          hotel_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["laundry_kind"]
          lines?: Json
          notes?: string | null
          reference?: string
          replacement_cost?: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["laundry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found: {
        Row: {
          claimed_at: string | null
          created_at: string
          description: string | null
          found_at: string
          found_by: string | null
          guest_id: string | null
          hotel_id: string
          id: string
          item: string
          location_found: string | null
          owner_contact: string | null
          owner_name: string | null
          photo_url: string | null
          reference: string
          return_notes: string | null
          returned_at: string | null
          status: Database["public"]["Enums"]["lost_found_status"]
          storage_location: string | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          found_at?: string
          found_by?: string | null
          guest_id?: string | null
          hotel_id: string
          id?: string
          item: string
          location_found?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          photo_url?: string | null
          reference?: string
          return_notes?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          found_at?: string
          found_by?: string | null
          guest_id?: string | null
          hotel_id?: string
          id?: string
          item?: string
          location_found?: string | null
          owner_contact?: string | null
          owner_name?: string | null
          photo_url?: string | null
          reference?: string
          return_notes?: string | null
          returned_at?: string | null
          status?: Database["public"]["Enums"]["lost_found_status"]
          storage_location?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          actual_minutes: number | null
          asset_id: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["maint_category"]
          cost: number
          created_at: string
          description: string | null
          estimated_minutes: number | null
          hotel_id: string
          id: string
          location: string | null
          photos: string[]
          priority: Database["public"]["Enums"]["maint_priority"]
          reference: string
          reported_at: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          room_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["maint_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_minutes?: number | null
          asset_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maint_category"]
          cost?: number
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          hotel_id: string
          id?: string
          location?: string | null
          photos?: string[]
          priority?: Database["public"]["Enums"]["maint_priority"]
          reference?: string
          reported_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          room_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["maint_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_minutes?: number | null
          asset_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maint_category"]
          cost?: number
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          hotel_id?: string
          id?: string
          location?: string | null
          photos?: string[]
          priority?: Database["public"]["Enums"]["maint_priority"]
          reference?: string
          reported_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          room_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["maint_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience: string | null
          audience_size: number
          budget: number
          channel: string
          clicked_count: number
          converted_count: number
          created_at: string
          created_by: string | null
          end_date: string | null
          hotel_id: string | null
          id: string
          name: string
          notes: string | null
          objective: string
          opened_count: number
          revenue: number
          sent_count: number
          spend: number
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          audience?: string | null
          audience_size?: number
          budget?: number
          channel?: string
          clicked_count?: number
          converted_count?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          hotel_id?: string | null
          id?: string
          name: string
          notes?: string | null
          objective?: string
          opened_count?: number
          revenue?: number
          sent_count?: number
          spend?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          audience?: string | null
          audience_size?: number
          budget?: number
          channel?: string
          clicked_count?: number
          converted_count?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          hotel_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string
          opened_count?: number
          revenue?: number
          sent_count?: number
          spend?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["menu_kind"]
          name: string
          outlet_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["menu_kind"]
          name: string
          outlet_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["menu_kind"]
          name?: string
          outlet_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          age_restricted: boolean
          allergens: string[]
          barcode: string | null
          calories: number | null
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          image_url: string | null
          ingredients: string[]
          is_alcoholic: boolean
          is_available: boolean
          name: string
          outlet_id: string | null
          prep_minutes: number
          price: number
          sku: string | null
          sort_order: number
          tax_category: string
          updated_at: string
        }
        Insert: {
          age_restricted?: boolean
          allergens?: string[]
          barcode?: string | null
          calories?: number | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_alcoholic?: boolean
          is_available?: boolean
          name: string
          outlet_id?: string | null
          prep_minutes?: number
          price?: number
          sku?: string | null
          sort_order?: number
          tax_category?: string
          updated_at?: string
        }
        Update: {
          age_restricted?: boolean
          allergens?: string[]
          barcode?: string | null
          calories?: number | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_alcoholic?: boolean
          is_available?: boolean
          name?: string
          outlet_id?: string | null
          prep_minutes?: number
          price?: number
          sku?: string | null
          sort_order?: number
          tax_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string
          guest_id: string | null
          hotel_id: string
          id: string
          order_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          guest_id?: string | null
          hotel_id: string
          id?: string
          order_id?: string | null
          rating?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          guest_id?: string | null
          hotel_id?: string
          id?: string
          order_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          closes_at: string
          created_at: string
          currency: string
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          opens_at: string
          service_charge_rate: number
          tax_rate: number
          type: Database["public"]["Enums"]["outlet_type"]
          updated_at: string
        }
        Insert: {
          closes_at?: string
          created_at?: string
          currency?: string
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          opens_at?: string
          service_charge_rate?: number
          tax_rate?: number
          type?: Database["public"]["Enums"]["outlet_type"]
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          currency?: string
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          opens_at?: string
          service_charge_rate?: number
          tax_rate?: number
          type?: Database["public"]["Enums"]["outlet_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          hotel_id: string
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          reference: string | null
          reservation_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          hotel_id: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          hotel_id?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_schedules: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["maint_category"]
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          interval_days: number
          is_active: boolean
          last_performed: string | null
          name: string
          next_due: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maint_category"]
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          interval_days?: number
          is_active?: boolean
          last_performed?: string | null
          name: string
          next_due?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maint_category"]
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          last_performed?: string | null
          name?: string
          next_due?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_order_items: {
        Row: {
          cost_price: number
          created_at: string
          discount: number
          id: string
          kitchen_status: Database["public"]["Enums"]["kitchen_status"]
          line_total: number
          menu_item_id: string | null
          modifiers: string[]
          name: string
          notes: string | null
          order_id: string
          quantity: number
          ready_at: string | null
          started_at: string | null
          unit_price: number
          updated_at: string
          void_reason: string | null
          voided: boolean
        }
        Insert: {
          cost_price?: number
          created_at?: string
          discount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["kitchen_status"]
          line_total?: number
          menu_item_id?: string | null
          modifiers?: string[]
          name: string
          notes?: string | null
          order_id: string
          quantity?: number
          ready_at?: string | null
          started_at?: string | null
          unit_price?: number
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
        }
        Update: {
          cost_price?: number
          created_at?: string
          discount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["kitchen_status"]
          line_total?: number
          menu_item_id?: string | null
          modifiers?: string[]
          name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          ready_at?: string | null
          started_at?: string | null
          unit_price?: number
          updated_at?: string
          void_reason?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pos_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_orders: {
        Row: {
          banquet_event_id: string | null
          charged_to_room: boolean
          closed_at: string | null
          coupon_code: string | null
          covers: number
          created_at: string
          created_by: string | null
          delivered_at: string | null
          discount: number
          guest_id: string | null
          hotel_id: string
          id: string
          kitchen_status: Database["public"]["Enums"]["kitchen_status"]
          notes: string | null
          opened_at: string
          order_number: string
          outlet_id: string
          paid_amount: number
          priority: Database["public"]["Enums"]["order_priority"]
          reservation_id: string | null
          room_id: string | null
          service_charge: number
          special_requests: string | null
          status: Database["public"]["Enums"]["pos_order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          tip: number
          total: number
          type: Database["public"]["Enums"]["pos_order_type"]
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          banquet_event_id?: string | null
          charged_to_room?: boolean
          closed_at?: string | null
          coupon_code?: string | null
          covers?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          discount?: number
          guest_id?: string | null
          hotel_id: string
          id?: string
          kitchen_status?: Database["public"]["Enums"]["kitchen_status"]
          notes?: string | null
          opened_at?: string
          order_number: string
          outlet_id: string
          paid_amount?: number
          priority?: Database["public"]["Enums"]["order_priority"]
          reservation_id?: string | null
          room_id?: string | null
          service_charge?: number
          special_requests?: string | null
          status?: Database["public"]["Enums"]["pos_order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
          type?: Database["public"]["Enums"]["pos_order_type"]
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          banquet_event_id?: string | null
          charged_to_room?: boolean
          closed_at?: string | null
          coupon_code?: string | null
          covers?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          discount?: number
          guest_id?: string | null
          hotel_id?: string
          id?: string
          kitchen_status?: Database["public"]["Enums"]["kitchen_status"]
          notes?: string | null
          opened_at?: string
          order_number?: string
          outlet_id?: string
          paid_amount?: number
          priority?: Database["public"]["Enums"]["order_priority"]
          reservation_id?: string | null
          room_id?: string | null
          service_charge?: number
          special_requests?: string | null
          status?: Database["public"]["Enums"]["pos_order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
          type?: Database["public"]["Enums"]["pos_order_type"]
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_orders_banquet_event_id_fkey"
            columns: ["banquet_event_id"]
            isOneToOne: false
            referencedRelation: "banquet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          hotel_id: string
          id: string
          is_refund: boolean
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tip: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          hotel_id: string
          id?: string
          is_refund?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tip?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          hotel_id?: string
          id?: string
          is_refund?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          paid_at?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tip?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_payments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_plans: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          children: number
          confirmation_number: string | null
          created_at: string
          created_by: string | null
          deposit: number
          discount: number
          guest_id: string | null
          hotel_id: string
          id: string
          notes: string | null
          num_guests: number
          rate_plan_id: string | null
          reference: string
          room_id: string | null
          source: Database["public"]["Enums"]["reservation_source"]
          special_requests: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          tax: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          adults?: number
          check_in: string
          check_out: string
          children?: number
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          deposit?: number
          discount?: number
          guest_id?: string | null
          hotel_id: string
          id?: string
          notes?: string | null
          num_guests?: number
          rate_plan_id?: string | null
          reference?: string
          room_id?: string | null
          source?: Database["public"]["Enums"]["reservation_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          tax?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          children?: number
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          deposit?: number
          discount?: number
          guest_id?: string | null
          hotel_id?: string
          id?: string
          notes?: string | null
          num_guests?: number
          rate_plan_id?: string | null
          reference?: string
          room_id?: string | null
          source?: Database["public"]["Enums"]["reservation_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          tax?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          merged_into: string | null
          name: string
          notes: string | null
          outlet_id: string
          pos_x: number
          pos_y: number
          seats: number
          shape: string
          status: Database["public"]["Enums"]["rms_table_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          merged_into?: string | null
          name: string
          notes?: string | null
          outlet_id: string
          pos_x?: number
          pos_y?: number
          seats?: number
          shape?: string
          status?: Database["public"]["Enums"]["rms_table_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          merged_into?: string | null
          name?: string
          notes?: string | null
          outlet_id?: string
          pos_x?: number
          pos_y?: number
          seats?: number
          shape?: string
          status?: Database["public"]["Enums"]["rms_table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      room_amenities: {
        Row: {
          amenity_id: string
          room_id: string
        }
        Insert: {
          amenity_id: string
          room_id: string
        }
        Update: {
          amenity_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_amenities_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_inspections: {
        Row: {
          checklist: Json
          created_at: string
          hotel_id: string
          housekeeping_task_id: string | null
          id: string
          inspected_at: string
          inspector_id: string | null
          notes: string | null
          photos: string[]
          result: Database["public"]["Enums"]["inspection_result"]
          room_id: string
          signature: string | null
        }
        Insert: {
          checklist?: Json
          created_at?: string
          hotel_id: string
          housekeeping_task_id?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          notes?: string | null
          photos?: string[]
          result?: Database["public"]["Enums"]["inspection_result"]
          room_id: string
          signature?: string | null
        }
        Update: {
          checklist?: Json
          created_at?: string
          hotel_id?: string
          housekeeping_task_id?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          notes?: string | null
          photos?: string[]
          result?: Database["public"]["Enums"]["inspection_result"]
          room_id?: string
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_inspections_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_housekeeping_task_id_fkey"
            columns: ["housekeeping_task_id"]
            isOneToOne: false
            referencedRelation: "housekeeping_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_inspections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          base_rate: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          max_occupancy: number
          name: string
          updated_at: string
        }
        Insert: {
          base_rate?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          max_occupancy?: number
          name: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          max_occupancy?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          base_price: number | null
          bed_types: string[]
          capacity: number
          cleaning_status: string
          created_at: string
          description: string | null
          floor_id: string | null
          hotel_id: string
          id: string
          images: string[]
          internal_notes: string | null
          maintenance_status: string
          max_guests: number
          notes: string | null
          num_beds: number
          qr_code: string | null
          room_name: string | null
          room_number: string
          room_size: number | null
          room_type_id: string | null
          seasonal_price: number | null
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
          weekend_price: number | null
        }
        Insert: {
          base_price?: number | null
          bed_types?: string[]
          capacity?: number
          cleaning_status?: string
          created_at?: string
          description?: string | null
          floor_id?: string | null
          hotel_id: string
          id?: string
          images?: string[]
          internal_notes?: string | null
          maintenance_status?: string
          max_guests?: number
          notes?: string | null
          num_beds?: number
          qr_code?: string | null
          room_name?: string | null
          room_number: string
          room_size?: number | null
          room_type_id?: string | null
          seasonal_price?: number | null
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
          weekend_price?: number | null
        }
        Update: {
          base_price?: number | null
          bed_types?: string[]
          capacity?: number
          cleaning_status?: string
          created_at?: string
          description?: string | null
          floor_id?: string | null
          hotel_id?: string
          id?: string
          images?: string[]
          internal_notes?: string | null
          maintenance_status?: string
          max_guests?: number
          notes?: string | null
          num_beds?: number
          qr_code?: string | null
          room_name?: string | null
          room_number?: string
          room_size?: number | null
          room_type_id?: string | null
          seasonal_price?: number | null
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
          weekend_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          hotel_id: string | null
          id: string
          location: string | null
          occurred_at: string
          people_involved: string | null
          police_reference: string | null
          reference: string
          reported_by: string | null
          resolved_at: string | null
          room_id: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hotel_id?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          people_involved?: string | null
          police_reference?: string | null
          reference?: string
          reported_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hotel_id?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          people_involved?: string | null
          police_reference?: string | null
          reference?: string
          reported_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_incidents_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_incidents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      security_patrols: {
        Row: {
          area: string
          checkpoint: string
          completed_at: string | null
          created_at: string
          findings: string | null
          hotel_id: string | null
          id: string
          officer_id: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          area: string
          checkpoint: string
          completed_at?: string | null
          created_at?: string
          findings?: string | null
          hotel_id?: string | null
          id?: string
          officer_id?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          checkpoint?: string
          completed_at?: string | null
          created_at?: string
          findings?: string | null
          hotel_id?: string | null
          id?: string
          officer_id?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_patrols_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          hotel_id: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          hotel_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          hotel_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          channel: string
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          guest_contact: string | null
          guest_id: string | null
          guest_name: string | null
          hotel_id: string | null
          id: string
          priority: Database["public"]["Enums"]["support_priority"]
          reference: string
          resolution: string | null
          resolved_at: string | null
          room_id: string | null
          satisfaction: number | null
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          guest_contact?: string | null
          guest_id?: string | null
          guest_name?: string | null
          hotel_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          reference?: string
          resolution?: string | null
          resolved_at?: string | null
          room_id?: string | null
          satisfaction?: number | null
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          guest_contact?: string | null
          guest_id?: string | null
          guest_name?: string | null
          hotel_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          reference?: string
          resolution?: string | null
          resolved_at?: string | null
          room_id?: string | null
          satisfaction?: number | null
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: string[]
          completed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          hotel_id: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          hotel_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          hotel_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "hotel_owner"
        | "general_manager"
        | "receptionist"
        | "accountant"
        | "housekeeping_manager"
        | "housekeeping_staff"
        | "restaurant_manager"
        | "cashier"
        | "kitchen_staff"
        | "maintenance_manager"
        | "maintenance_staff"
        | "security_officer"
        | "marketing_manager"
        | "customer_support"
        | "guest_portal"
        | "waiter"
        | "chef"
        | "bar_staff"
      asset_condition: "excellent" | "good" | "fair" | "poor" | "out_of_service"
      banquet_status:
        | "inquiry"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      campaign_status:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      hk_priority: "low" | "normal" | "high" | "urgent"
      hk_task_status:
        | "pending"
        | "in_progress"
        | "waiting_inspection"
        | "completed"
        | "skipped"
      incident_severity: "low" | "moderate" | "high" | "critical"
      incident_status:
        | "reported"
        | "investigating"
        | "escalated"
        | "resolved"
        | "closed"
      inspection_result: "pass" | "fail" | "pending"
      kitchen_status: "new" | "preparing" | "ready" | "served" | "cancelled"
      laundry_kind: "linen" | "uniform" | "guest"
      laundry_status:
        | "collected"
        | "washing"
        | "drying"
        | "ironing"
        | "delivered"
        | "completed"
      lost_found_status: "stored" | "claimed" | "returned" | "disposed"
      maint_category:
        | "electrical"
        | "plumbing"
        | "internet"
        | "furniture"
        | "doors"
        | "windows"
        | "hvac"
        | "water"
        | "lighting"
        | "painting"
        | "general"
      maint_priority: "low" | "normal" | "high" | "critical"
      maint_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "resolved"
        | "closed"
        | "cancelled"
      menu_kind: "food" | "drink"
      order_priority: "normal" | "vip" | "urgent" | "late"
      outlet_type:
        | "restaurant"
        | "bar"
        | "coffee_shop"
        | "room_service"
        | "banquet"
        | "conference"
        | "pool_bar"
        | "outdoor"
        | "vip_lounge"
      payment_method:
        | "cash"
        | "card"
        | "mobile_money"
        | "bank_transfer"
        | "other"
        | "mtn_momo"
        | "airtel_money"
      payment_status: "pending" | "partial" | "paid" | "refunded" | "failed"
      pos_order_status:
        | "open"
        | "sent"
        | "partially_paid"
        | "paid"
        | "void"
        | "refunded"
      pos_order_type:
        | "dine_in"
        | "takeaway"
        | "bar"
        | "room_service"
        | "banquet"
        | "delivery"
      reservation_source:
        | "walk_in"
        | "phone"
        | "email"
        | "website"
        | "corporate"
        | "group"
        | "travel_agent"
        | "ota"
      reservation_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show"
        | "draft"
        | "waitlist"
      rms_table_status:
        | "available"
        | "reserved"
        | "occupied"
        | "cleaning"
        | "out_of_service"
      room_status:
        | "available"
        | "occupied"
        | "reserved"
        | "dirty"
        | "out_of_order"
        | "cleaning"
        | "inspected"
        | "maintenance"
        | "out_of_service"
        | "blocked"
      stock_move_type: "usage" | "waste" | "restock" | "adjustment"
      support_priority: "low" | "normal" | "high" | "urgent"
      support_status:
        | "open"
        | "in_progress"
        | "waiting_guest"
        | "resolved"
        | "closed"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "hotel_owner",
        "general_manager",
        "receptionist",
        "accountant",
        "housekeeping_manager",
        "housekeeping_staff",
        "restaurant_manager",
        "cashier",
        "kitchen_staff",
        "maintenance_manager",
        "maintenance_staff",
        "security_officer",
        "marketing_manager",
        "customer_support",
        "guest_portal",
        "waiter",
        "chef",
        "bar_staff",
      ],
      asset_condition: ["excellent", "good", "fair", "poor", "out_of_service"],
      banquet_status: [
        "inquiry",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      hk_priority: ["low", "normal", "high", "urgent"],
      hk_task_status: [
        "pending",
        "in_progress",
        "waiting_inspection",
        "completed",
        "skipped",
      ],
      incident_severity: ["low", "moderate", "high", "critical"],
      incident_status: [
        "reported",
        "investigating",
        "escalated",
        "resolved",
        "closed",
      ],
      inspection_result: ["pass", "fail", "pending"],
      kitchen_status: ["new", "preparing", "ready", "served", "cancelled"],
      laundry_kind: ["linen", "uniform", "guest"],
      laundry_status: [
        "collected",
        "washing",
        "drying",
        "ironing",
        "delivered",
        "completed",
      ],
      lost_found_status: ["stored", "claimed", "returned", "disposed"],
      maint_category: [
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
      ],
      maint_priority: ["low", "normal", "high", "critical"],
      maint_status: [
        "open",
        "assigned",
        "in_progress",
        "on_hold",
        "resolved",
        "closed",
        "cancelled",
      ],
      menu_kind: ["food", "drink"],
      order_priority: ["normal", "vip", "urgent", "late"],
      outlet_type: [
        "restaurant",
        "bar",
        "coffee_shop",
        "room_service",
        "banquet",
        "conference",
        "pool_bar",
        "outdoor",
        "vip_lounge",
      ],
      payment_method: [
        "cash",
        "card",
        "mobile_money",
        "bank_transfer",
        "other",
        "mtn_momo",
        "airtel_money",
      ],
      payment_status: ["pending", "partial", "paid", "refunded", "failed"],
      pos_order_status: [
        "open",
        "sent",
        "partially_paid",
        "paid",
        "void",
        "refunded",
      ],
      pos_order_type: [
        "dine_in",
        "takeaway",
        "bar",
        "room_service",
        "banquet",
        "delivery",
      ],
      reservation_source: [
        "walk_in",
        "phone",
        "email",
        "website",
        "corporate",
        "group",
        "travel_agent",
        "ota",
      ],
      reservation_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
        "draft",
        "waitlist",
      ],
      rms_table_status: [
        "available",
        "reserved",
        "occupied",
        "cleaning",
        "out_of_service",
      ],
      room_status: [
        "available",
        "occupied",
        "reserved",
        "dirty",
        "out_of_order",
        "cleaning",
        "inspected",
        "maintenance",
        "out_of_service",
        "blocked",
      ],
      stock_move_type: ["usage", "waste", "restock", "adjustment"],
      support_priority: ["low", "normal", "high", "urgent"],
      support_status: [
        "open",
        "in_progress",
        "waiting_guest",
        "resolved",
        "closed",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
    },
  },
} as const
