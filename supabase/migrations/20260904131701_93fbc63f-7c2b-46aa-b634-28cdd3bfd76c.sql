-- ===== ENUMS =====
CREATE TYPE public.support_status AS ENUM ('open','in_progress','waiting_guest','resolved','closed');
CREATE TYPE public.support_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.incident_severity AS ENUM ('low','moderate','high','critical');
CREATE TYPE public.incident_status AS ENUM ('reported','investigating','escalated','resolved','closed');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','active','paused','completed','cancelled');

-- ===== SUPPORT =====
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  reference text NOT NULL DEFAULT ('SUP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  subject text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  channel text NOT NULL DEFAULT 'front_desk',
  priority public.support_priority NOT NULL DEFAULT 'normal',
  status public.support_status NOT NULL DEFAULT 'open',
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_name text,
  guest_contact text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  satisfaction integer CHECK (satisfaction BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== SECURITY =====
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  reference text NOT NULL DEFAULT ('INC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  severity public.incident_severity NOT NULL DEFAULT 'low',
  status public.incident_status NOT NULL DEFAULT 'reported',
  location text,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  people_involved text,
  witnesses text,
  police_reference text,
  action_taken text,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.security_patrols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  area text NOT NULL,
  checkpoint text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  findings text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== MARKETING =====
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  objective text NOT NULL DEFAULT 'bookings',
  audience text,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  budget numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  audience_size integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  converted_count integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== GRANTS =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_patrols TO authenticated;
GRANT ALL ON public.security_patrols TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

-- ===== RLS =====
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_read ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support','receptionist']::app_role[]));
CREATE POLICY support_tickets_write ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support','receptionist']::app_role[]));
CREATE POLICY support_tickets_update ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support']::app_role[]));
CREATE POLICY support_tickets_delete ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager']::app_role[]));

CREATE POLICY support_messages_read ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support','receptionist']::app_role[]));
CREATE POLICY support_messages_write ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','customer_support','receptionist']::app_role[]));
CREATE POLICY support_messages_delete ON public.support_ticket_messages FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager']::app_role[]));

CREATE POLICY security_incidents_read ON public.security_incidents FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_incidents_write ON public.security_incidents FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_incidents_update ON public.security_incidents FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_incidents_delete ON public.security_incidents FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager']::app_role[]));

CREATE POLICY security_patrols_read ON public.security_patrols FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_patrols_write ON public.security_patrols FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_patrols_update ON public.security_patrols FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','security_officer']::app_role[]));
CREATE POLICY security_patrols_delete ON public.security_patrols FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager']::app_role[]));

CREATE POLICY campaigns_read ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','marketing_manager']::app_role[]));
CREATE POLICY campaigns_write ON public.marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','marketing_manager']::app_role[]));
CREATE POLICY campaigns_update ON public.marketing_campaigns FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','marketing_manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','marketing_manager']::app_role[]));
CREATE POLICY campaigns_delete ON public.marketing_campaigns FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager']::app_role[]));

-- ===== TRIGGERS =====
CREATE TRIGGER support_tickets_upd BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER security_incidents_upd BEFORE UPDATE ON public.security_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER security_patrols_upd BEFORE UPDATE ON public.security_patrols FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER campaigns_upd BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_messages_ticket ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_incidents_status ON public.security_incidents(status);
CREATE INDEX idx_patrols_sched ON public.security_patrols(scheduled_at);
CREATE INDEX idx_campaigns_status ON public.marketing_campaigns(status);