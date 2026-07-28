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
      asset_condition: "excellent" | "good" | "fair" | "poor" | "out_of_service"
      hk_priority: "low" | "normal" | "high" | "urgent"
      hk_task_status:
        | "pending"
        | "in_progress"
        | "waiting_inspection"
        | "completed"
        | "skipped"
      inspection_result: "pass" | "fail" | "pending"
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
      payment_method:
        | "cash"
        | "card"
        | "mobile_money"
        | "bank_transfer"
        | "other"
        | "mtn_momo"
        | "airtel_money"
      payment_status: "pending" | "partial" | "paid" | "refunded" | "failed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      ],
      asset_condition: ["excellent", "good", "fair", "poor", "out_of_service"],
      hk_priority: ["low", "normal", "high", "urgent"],
      hk_task_status: [
        "pending",
        "in_progress",
        "waiting_inspection",
        "completed",
        "skipped",
      ],
      inspection_result: ["pass", "fail", "pending"],
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
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
    },
  },
} as const
