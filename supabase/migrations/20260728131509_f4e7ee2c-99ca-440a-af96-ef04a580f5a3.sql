-- ============ ENUMS ============
CREATE TYPE public.hk_task_status AS ENUM ('pending','in_progress','waiting_inspection','completed','skipped');
CREATE TYPE public.hk_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.inspection_result AS ENUM ('pass','fail','pending');
CREATE TYPE public.laundry_status AS ENUM ('collected','washing','drying','ironing','delivered','completed');
CREATE TYPE public.laundry_kind AS ENUM ('linen','uniform','guest');
CREATE TYPE public.lost_found_status AS ENUM ('stored','claimed','returned','disposed');
CREATE TYPE public.maint_category AS ENUM ('electrical','plumbing','internet','furniture','doors','windows','hvac','water','lighting','painting','general');
CREATE TYPE public.maint_priority AS ENUM ('low','normal','high','critical');
CREATE TYPE public.maint_status AS ENUM ('open','assigned','in_progress','on_hold','resolved','closed','cancelled');
CREATE TYPE public.asset_condition AS ENUM ('excellent','good','fair','poor','out_of_service');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','blocked','done','cancelled');
CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');

-- ============ HOUSEKEEPING TASKS ============
CREATE TABLE public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.hk_task_status NOT NULL DEFAULT 'pending',
  priority public.hk_priority NOT NULL DEFAULT 'normal',
  task_type TEXT NOT NULL DEFAULT 'standard',
  scheduled_for DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.housekeeping_tasks TO authenticated;
GRANT ALL ON public.housekeeping_tasks TO service_role;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY hk_read ON public.housekeeping_tasks FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager','receptionist']::app_role[])
    OR assigned_to = auth.uid()
  );
CREATE POLICY hk_manage ON public.housekeeping_tasks FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]));
CREATE POLICY hk_staff_update ON public.housekeeping_tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE TRIGGER hk_upd BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.housekeeping_tasks (hotel_id, scheduled_for);
CREATE INDEX ON public.housekeeping_tasks (assigned_to, status);
CREATE INDEX ON public.housekeeping_tasks (room_id);

-- ============ ROOM INSPECTIONS ============
CREATE TABLE public.room_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  housekeeping_task_id UUID REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result public.inspection_result NOT NULL DEFAULT 'pending',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  signature TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_inspections TO authenticated;
GRANT ALL ON public.room_inspections TO service_role;
ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY insp_read ON public.room_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY insp_manage ON public.room_inspections FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]));
CREATE INDEX ON public.room_inspections (room_id, inspected_at DESC);

-- ============ LAUNDRY ============
CREATE TABLE public.laundry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.laundry_kind NOT NULL DEFAULT 'linen',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  stock_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laundry_items TO authenticated;
GRANT ALL ON public.laundry_items TO service_role;
ALTER TABLE public.laundry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY laundry_items_read ON public.laundry_items FOR SELECT TO authenticated USING (true);
CREATE POLICY laundry_items_manage ON public.laundry_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager']::app_role[]));
CREATE TRIGGER laundry_items_upd BEFORE UPDATE ON public.laundry_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.laundry_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reference TEXT NOT NULL DEFAULT ('LND-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  kind public.laundry_kind NOT NULL DEFAULT 'linen',
  status public.laundry_status NOT NULL DEFAULT 'collected',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  damaged_count INTEGER NOT NULL DEFAULT 0,
  replacement_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laundry_orders TO authenticated;
GRANT ALL ON public.laundry_orders TO service_role;
ALTER TABLE public.laundry_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY laundry_orders_read ON public.laundry_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY laundry_orders_manage ON public.laundry_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager','housekeeping_staff','receptionist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager','housekeeping_staff','receptionist']::app_role[]));
CREATE TRIGGER laundry_orders_upd BEFORE UPDATE ON public.laundry_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LOST & FOUND ============
CREATE TABLE public.lost_found (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reference TEXT NOT NULL DEFAULT ('LF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  item TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  location_found TEXT,
  found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  found_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_location TEXT,
  status public.lost_found_status NOT NULL DEFAULT 'stored',
  owner_name TEXT,
  owner_contact TEXT,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  return_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_found TO authenticated;
GRANT ALL ON public.lost_found TO service_role;
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY lf_read ON public.lost_found FOR SELECT TO authenticated USING (true);
CREATE POLICY lf_manage ON public.lost_found FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager','housekeeping_staff','receptionist','security_officer','customer_support']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','housekeeping_manager','housekeeping_staff','receptionist','security_officer','customer_support']::app_role[]));
CREATE TRIGGER lf_upd BEFORE UPDATE ON public.lost_found
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ASSETS ============
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT ('AST-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  serial_number TEXT,
  location TEXT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  purchase_date DATE,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  warranty_until DATE,
  condition public.asset_condition NOT NULL DEFAULT 'good',
  depreciation_years INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_read ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY assets_manage ON public.assets FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]));
CREATE TRIGGER assets_upd BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MAINTENANCE TICKETS ============
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reference TEXT NOT NULL DEFAULT ('MT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title TEXT NOT NULL,
  description TEXT,
  category public.maint_category NOT NULL DEFAULT 'general',
  priority public.maint_priority NOT NULL DEFAULT 'normal',
  status public.maint_status NOT NULL DEFAULT 'open',
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  location TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  cost NUMERIC NOT NULL DEFAULT 0,
  photos TEXT[] NOT NULL DEFAULT '{}',
  resolution TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tickets TO authenticated;
GRANT ALL ON public.maintenance_tickets TO service_role;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY mt_read ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager','receptionist','housekeeping_manager']::app_role[])
    OR assigned_to = auth.uid() OR reported_by = auth.uid()
  );
CREATE POLICY mt_manage ON public.maintenance_tickets FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]));
CREATE POLICY mt_report ON public.maintenance_tickets FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());
CREATE POLICY mt_tech_update ON public.maintenance_tickets FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE TRIGGER mt_upd BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.maintenance_tickets (hotel_id, status, priority);
CREATE INDEX ON public.maintenance_tickets (assigned_to);

-- ============ PREVENTIVE MAINTENANCE ============
CREATE TABLE public.pm_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category public.maint_category NOT NULL DEFAULT 'general',
  interval_days INTEGER NOT NULL DEFAULT 30,
  last_performed DATE,
  next_due DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_schedules TO authenticated;
GRANT ALL ON public.pm_schedules TO service_role;
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_read ON public.pm_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY pm_manage ON public.pm_schedules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','maintenance_manager']::app_role[]));
CREATE TRIGGER pm_upd BEFORE UPDATE ON public.pm_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TASKS (cross-department) ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  due_date DATE,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_read ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR created_by = auth.uid()
  );
CREATE POLICY tasks_manage ON public.tasks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY tasks_assignee_update ON public.tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY tasks_creator_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE TRIGGER tasks_upd BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tc_read ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY tc_write ON public.task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tc_own_update ON public.task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tc_own_delete ON public.task_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));