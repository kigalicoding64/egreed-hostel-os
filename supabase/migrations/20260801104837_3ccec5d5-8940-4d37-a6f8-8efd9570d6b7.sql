-- ===== ENUMS =====
CREATE TYPE public.outlet_type AS ENUM ('restaurant','bar','coffee_shop','room_service','banquet','conference','pool_bar','outdoor','vip_lounge');
CREATE TYPE public.rms_table_status AS ENUM ('available','reserved','occupied','cleaning','out_of_service');
CREATE TYPE public.pos_order_type AS ENUM ('dine_in','takeaway','bar','room_service','banquet','delivery');
CREATE TYPE public.pos_order_status AS ENUM ('open','sent','partially_paid','paid','void','refunded');
CREATE TYPE public.kitchen_status AS ENUM ('new','preparing','ready','served','cancelled');
CREATE TYPE public.order_priority AS ENUM ('normal','vip','urgent','late');
CREATE TYPE public.menu_kind AS ENUM ('food','drink');
CREATE TYPE public.stock_move_type AS ENUM ('usage','waste','restock','adjustment');
CREATE TYPE public.banquet_status AS ENUM ('inquiry','confirmed','in_progress','completed','cancelled');

-- ===== OUTLETS =====
CREATE TABLE public.outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  type outlet_type NOT NULL DEFAULT 'restaurant',
  description text,
  location text,
  opens_at time NOT NULL DEFAULT '07:00',
  closes_at time NOT NULL DEFAULT '23:00',
  tax_rate numeric NOT NULL DEFAULT 18,
  service_charge_rate numeric NOT NULL DEFAULT 10,
  currency text NOT NULL DEFAULT 'RWF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== MENU =====
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind menu_kind NOT NULL DEFAULT 'food',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  sku text,
  barcode text,
  price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  tax_category text NOT NULL DEFAULT 'standard',
  ingredients text[] NOT NULL DEFAULT '{}',
  allergens text[] NOT NULL DEFAULT '{}',
  prep_minutes integer NOT NULL DEFAULT 10,
  calories integer,
  is_available boolean NOT NULL DEFAULT true,
  is_alcoholic boolean NOT NULL DEFAULT false,
  age_restricted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== TABLES =====
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  seats integer NOT NULL DEFAULT 4,
  status rms_table_status NOT NULL DEFAULT 'available',
  shape text NOT NULL DEFAULT 'square',
  pos_x integer NOT NULL DEFAULT 40,
  pos_y integer NOT NULL DEFAULT 40,
  merged_into uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== INVENTORY =====
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'unit',
  category text NOT NULL DEFAULT 'general',
  stock_on_hand numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, inventory_item_id)
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type stock_move_type NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  reason text,
  reference text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== BANQUETS =====
CREATE TABLE public.banquet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'conference',
  event_date date NOT NULL,
  start_time time,
  end_time time,
  guest_count integer NOT NULL DEFAULT 0,
  package_name text,
  package_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status banquet_status NOT NULL DEFAULT 'inquiry',
  menu_notes text,
  special_requests text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== ORDERS =====
CREATE TABLE public.pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  type pos_order_type NOT NULL DEFAULT 'dine_in',
  status pos_order_status NOT NULL DEFAULT 'open',
  kitchen_status kitchen_status NOT NULL DEFAULT 'new',
  priority order_priority NOT NULL DEFAULT 'normal',
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  banquet_event_id uuid REFERENCES public.banquet_events(id) ON DELETE SET NULL,
  waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  covers integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  coupon_code text,
  service_charge numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  tip numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  charged_to_room boolean NOT NULL DEFAULT false,
  notes text,
  special_requests text,
  delivered_at timestamptz,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pos_orders_outlet_idx ON public.pos_orders(outlet_id, status);
CREATE INDEX pos_orders_kitchen_idx ON public.pos_orders(kitchen_status);

CREATE TABLE public.pos_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  modifiers text[] NOT NULL DEFAULT '{}',
  notes text,
  kitchen_status kitchen_status NOT NULL DEFAULT 'new',
  voided boolean NOT NULL DEFAULT false,
  void_reason text,
  started_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pos_order_items_order_idx ON public.pos_order_items(order_id);

CREATE TABLE public.pos_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'paid',
  reference text,
  tip numeric NOT NULL DEFAULT 0,
  is_refund boolean NOT NULL DEFAULT false,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== GRANTS =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outlets, public.menu_categories, public.menu_items,
  public.restaurant_tables, public.inventory_items, public.menu_item_ingredients,
  public.inventory_movements, public.banquet_events, public.pos_orders, public.pos_order_items,
  public.pos_payments, public.order_feedback TO authenticated;
GRANT ALL ON public.outlets, public.menu_categories, public.menu_items,
  public.restaurant_tables, public.inventory_items, public.menu_item_ingredients,
  public.inventory_movements, public.banquet_events, public.pos_orders, public.pos_order_items,
  public.pos_payments, public.order_feedback TO service_role;

-- ===== RLS =====
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banquet_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- read: any restaurant-side or management staff
CREATE POLICY rms_read_outlets ON public.outlets FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist','accountant']::app_role[]));
CREATE POLICY rms_manage_outlets ON public.outlets FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]));

CREATE POLICY rms_read_menu_categories ON public.menu_categories FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist','accountant']::app_role[]));
CREATE POLICY rms_manage_menu_categories ON public.menu_categories FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]));

CREATE POLICY rms_read_menu_items ON public.menu_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist','accountant']::app_role[]));
CREATE POLICY rms_manage_menu_items ON public.menu_items FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]));

CREATE POLICY rms_read_tables ON public.restaurant_tables FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist']::app_role[]));
CREATE POLICY rms_manage_tables ON public.restaurant_tables FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff']::app_role[]));

CREATE POLICY rms_read_inventory ON public.inventory_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef','kitchen_staff','bar_staff','accountant']::app_role[]));
CREATE POLICY rms_manage_inventory ON public.inventory_items FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]));

CREATE POLICY rms_read_recipes ON public.menu_item_ingredients FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef','kitchen_staff']::app_role[]));
CREATE POLICY rms_manage_recipes ON public.menu_item_ingredients FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef']::app_role[]));

CREATE POLICY rms_read_movements ON public.inventory_movements FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef','kitchen_staff','accountant']::app_role[]));
CREATE POLICY rms_write_movements ON public.inventory_movements FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef','kitchen_staff','bar_staff','cashier','waiter']::app_role[]));

CREATE POLICY rms_read_banquets ON public.banquet_events FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','chef','kitchen_staff','receptionist','accountant','marketing_manager']::app_role[]));
CREATE POLICY rms_manage_banquets ON public.banquet_events FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]));

CREATE POLICY rms_read_orders ON public.pos_orders FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist','accountant']::app_role[]));
CREATE POLICY rms_write_orders ON public.pos_orders FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','receptionist']::app_role[]));
CREATE POLICY rms_update_orders ON public.pos_orders FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','chef','kitchen_staff','receptionist']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','chef','kitchen_staff','receptionist']::app_role[]));
CREATE POLICY rms_delete_orders ON public.pos_orders FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]));

CREATE POLICY rms_read_order_items ON public.pos_order_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','chef','kitchen_staff','bar_staff','receptionist','accountant']::app_role[]));
CREATE POLICY rms_write_order_items ON public.pos_order_items FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','receptionist']::app_role[]));
CREATE POLICY rms_update_order_items ON public.pos_order_items FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','chef','kitchen_staff']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','chef','kitchen_staff']::app_role[]));
CREATE POLICY rms_delete_order_items ON public.pos_order_items FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff']::app_role[]));

CREATE POLICY rms_read_payments ON public.pos_payments FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','accountant','receptionist']::app_role[]));
CREATE POLICY rms_write_payments ON public.pos_payments FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','bar_staff','receptionist']::app_role[]));
CREATE POLICY rms_update_payments ON public.pos_payments FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager']::app_role[]));

CREATE POLICY rms_read_feedback ON public.order_feedback FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','marketing_manager','customer_support']::app_role[]));
CREATE POLICY rms_write_feedback ON public.order_feedback FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','restaurant_manager','cashier','waiter','receptionist','customer_support']::app_role[]));

-- ===== TRIGGERS =====
CREATE TRIGGER trg_outlets_updated BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_menu_categories_updated BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tables_updated BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_banquets_updated BEFORE UPDATE ON public.banquet_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pos_orders_updated BEFORE UPDATE ON public.pos_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pos_order_items_updated BEFORE UPDATE ON public.pos_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-deduct inventory when an order line is added
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE h_id uuid;
BEGIN
  IF NEW.menu_item_id IS NULL THEN RETURN NEW; END IF;
  SELECT hotel_id INTO h_id FROM public.pos_orders WHERE id = NEW.order_id;

  UPDATE public.inventory_items ii
  SET stock_on_hand = ii.stock_on_hand - (mi.quantity * NEW.quantity)
  FROM public.menu_item_ingredients mi
  WHERE mi.menu_item_id = NEW.menu_item_id AND ii.id = mi.inventory_item_id;

  INSERT INTO public.inventory_movements (hotel_id, inventory_item_id, type, quantity, unit_cost, reason, reference, created_by)
  SELECT h_id, mi.inventory_item_id, 'usage', mi.quantity * NEW.quantity, ii.unit_cost, 'POS sale', NEW.order_id::text, auth.uid()
  FROM public.menu_item_ingredients mi
  JOIN public.inventory_items ii ON ii.id = mi.inventory_item_id
  WHERE mi.menu_item_id = NEW.menu_item_id;

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.deduct_inventory_for_order_item() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_deduct_inventory AFTER INSERT ON public.pos_order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_for_order_item();

-- ===== SEED =====
INSERT INTO public.outlets (hotel_id, name, type, location, opens_at, closes_at, tax_rate, service_charge_rate)
SELECT h.id, v.name, v.type::outlet_type, v.loc, v.o::time, v.c::time, 18, 10
FROM public.hotels h
CROSS JOIN (VALUES
  ('Main Restaurant','restaurant','Ground Floor','06:30','23:00'),
  ('Sky Bar','bar','Rooftop','16:00','02:00'),
  ('Kwa Rugeyo Coffee','coffee_shop','Lobby','06:00','20:00'),
  ('Room Service','room_service','In-Room','00:00','23:59'),
  ('Conference Hall','conference','1st Floor','07:00','22:00'),
  ('Outdoor Terrace','outdoor','Garden','10:00','23:00')
) AS v(name,type,loc,o,c)
WHERE h.is_active
  AND NOT EXISTS (SELECT 1 FROM public.outlets o2 WHERE o2.hotel_id = h.id);

INSERT INTO public.menu_categories (hotel_id, outlet_id, name, kind, sort_order)
SELECT o.hotel_id, o.id, v.name, v.kind::menu_kind, v.so
FROM public.outlets o
CROSS JOIN (VALUES
  ('Breakfast','food',1),('Lunch','food',2),('Dinner','food',3),('Desserts','food',4),
  ('Kids Menu','food',5),('Cocktails','drink',6),('Wine','drink',7),('Beer','drink',8),
  ('Coffee','drink',9),('Tea','drink',10),('Soft Drinks','drink',11)
) AS v(name,kind,so)
WHERE o.type IN ('restaurant','bar','coffee_shop')
  AND NOT EXISTS (SELECT 1 FROM public.menu_categories c WHERE c.hotel_id = o.hotel_id);

INSERT INTO public.restaurant_tables (hotel_id, outlet_id, name, seats, pos_x, pos_y)
SELECT o.hotel_id, o.id, 'T' || g::text, CASE WHEN g % 3 = 0 THEN 6 ELSE 4 END,
       60 + ((g - 1) % 5) * 150, 60 + ((g - 1) / 5) * 130
FROM public.outlets o CROSS JOIN generate_series(1, 10) g
WHERE o.type = 'restaurant'
  AND NOT EXISTS (SELECT 1 FROM public.restaurant_tables t WHERE t.outlet_id = o.id);

INSERT INTO public.menu_items (hotel_id, outlet_id, category_id, name, description, price, cost_price, prep_minutes, calories, allergens, ingredients, is_alcoholic, age_restricted)
SELECT c.hotel_id, c.outlet_id, c.id, v.name, v.descr, v.price, v.cost, v.prep, v.cal,
       string_to_array(v.allerg, ','), string_to_array(v.ingr, ','), v.alc, v.alc
FROM public.menu_categories c
JOIN (VALUES
  ('Breakfast','Full African Breakfast','Eggs, sausage, plantain, beans and toast',12000,4200,15,780,'egg,gluten','eggs,sausage,plantain,beans',false),
  ('Breakfast','Rolex Wrap','Chapati wrap with omelette and vegetables',7000,2200,10,540,'egg,gluten','chapati,eggs,tomato,onion',false),
  ('Lunch','Grilled Tilapia','Lake tilapia with chips and salad',22000,8500,25,620,'fish','tilapia,potato,lettuce',false),
  ('Lunch','Beef Brochette','Char-grilled skewers with plantain',18000,6800,20,700,'','beef,plantain,spices',false),
  ('Dinner','Fillet Steak','250g fillet, pepper sauce, seasonal vegetables',34000,14000,30,820,'dairy','beef fillet,cream,vegetables',false),
  ('Dinner','Vegetable Curry','Coconut curry with basmati rice',16000,5000,22,540,'','coconut milk,vegetables,rice',false),
  ('Desserts','Chocolate Fondant','Warm centre with vanilla ice cream',9000,2600,15,610,'dairy,egg,gluten','chocolate,butter,eggs',false),
  ('Kids Menu','Mini Burger & Chips','Beef slider with fries',9500,3200,12,560,'gluten','beef,bun,potato',false),
  ('Cocktails','Kigali Sunset','Passion fruit, rum and citrus',12000,3800,6,240,'','rum,passion fruit,lime',true),
  ('Cocktails','Virgin Mojito','Mint, lime and soda',7000,1600,5,120,'','mint,lime,soda',false),
  ('Wine','House Red (Glass)','South African merlot',9000,3000,2,150,'sulphites','wine',true),
  ('Beer','Local Lager 500ml','Chilled draught lager',4000,1500,2,210,'gluten','beer',true),
  ('Coffee','Rwandan Espresso','Single origin Nyungwe beans',3500,900,4,10,'','coffee',false),
  ('Coffee','Cappuccino','Espresso with steamed milk',4500,1300,5,120,'dairy','coffee,milk',false),
  ('Tea','African Tea','Spiced milk tea',3000,700,5,90,'dairy','tea,milk,spices',false),
  ('Soft Drinks','Bottled Water 500ml','Still mineral water',1500,400,1,0,'','water',false)
) AS v(cat,name,descr,price,cost,prep,cal,allerg,ingr,alc) ON v.cat = c.name
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.hotel_id = c.hotel_id);

INSERT INTO public.inventory_items (hotel_id, name, unit, category, stock_on_hand, reorder_level, unit_cost, supplier)
SELECT h.id, v.name, v.unit, v.cat, v.stock, v.reorder, v.cost, v.sup
FROM public.hotels h
CROSS JOIN (VALUES
  ('Tilapia Fillet','kg','food',40,10,7000,'Kivu Fisheries'),
  ('Beef Fillet','kg','food',25,8,12000,'Rwanda Meats Ltd'),
  ('Potatoes','kg','food',120,30,900,'Musanze Farms'),
  ('Coffee Beans','kg','beverage',35,10,9000,'Nyungwe Coffee Co'),
  ('Fresh Milk','litre','beverage',80,20,1200,'Inyange Dairy'),
  ('Local Lager','bottle','bar',240,60,1400,'Bralirwa'),
  ('House Red Wine','bottle','bar',48,12,11000,'Cape Imports'),
  ('Passion Fruit','kg','bar',18,5,2500,'Kigali Fresh')
) AS v(name,unit,cat,stock,reorder,cost,sup)
WHERE h.is_active AND NOT EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.hotel_id = h.id);