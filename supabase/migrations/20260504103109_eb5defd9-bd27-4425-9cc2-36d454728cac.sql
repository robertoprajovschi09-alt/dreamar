
-- ===========================================
-- AgencyOS AI — Multi-tenant Foundation
-- ===========================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('saas_admin', 'agency_owner', 'agency_team', 'content_creator', 'client_viewer');
CREATE TYPE public.plan_tier AS ENUM ('starter', 'growth', 'unlimited', 'white_label');
CREATE TYPE public.sub_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused');
CREATE TYPE public.client_status AS ENUM ('active', 'paused', 'onboarding', 'churned');
CREATE TYPE public.niche AS ENUM ('real_estate','restaurant','lounge','dental','fitness','local_store','beauty','auto','hotel','custom');
CREATE TYPE public.post_status AS ENUM ('idea','script','filming','editing','sent_for_approval','approved','scheduled','published','analyzed');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','blocked','done');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.video_recommendation AS ENUM ('repeat','improve','stop');

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_saas_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Agencies
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#E11D2E',
  plan public.plan_tier NOT NULL DEFAULT 'starter',
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER agencies_updated BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Agency members (roles table)
CREATE TABLE public.agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'agency_team',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);
CREATE INDEX idx_agency_members_user ON public.agency_members(user_id);
CREATE INDEX idx_agency_members_agency ON public.agency_members(agency_id);

-- Plans (seed-driven)
CREATE TABLE public.plans (
  tier public.plan_tier PRIMARY KEY,
  name TEXT NOT NULL,
  price_eur INTEGER NOT NULL,
  max_clients INTEGER, -- null = unlimited
  max_seats INTEGER,   -- null = unlimited
  ai_reports BOOLEAN NOT NULL DEFAULT false,
  client_portal BOOLEAN NOT NULL DEFAULT false,
  niche_dashboards BOOLEAN NOT NULL DEFAULT false,
  approval_workflow BOOLEAN NOT NULL DEFAULT false,
  white_label BOOLEAN NOT NULL DEFAULT false,
  ai_strategy_room BOOLEAN NOT NULL DEFAULT false,
  advanced_analytics BOOLEAN NOT NULL DEFAULT false,
  competitor_watch BOOLEAN NOT NULL DEFAULT false,
  custom_branding BOOLEAN NOT NULL DEFAULT false,
  premium_pdf BOOLEAN NOT NULL DEFAULT false,
  stripe_price_id TEXT
);

INSERT INTO public.plans (tier, name, price_eur, max_clients, max_seats, ai_reports, client_portal, niche_dashboards, approval_workflow, white_label, ai_strategy_room, advanced_analytics, competitor_watch, custom_branding, premium_pdf) VALUES
('starter', 'Starter Agency', 99, 5, 1, false, false, false, false, false, false, false, false, false, false),
('growth', 'Growth Agency', 150, 15, 3, true, true, true, true, false, false, false, false, false, false),
('unlimited', 'Unlimited Agency', 249, NULL, NULL, true, true, true, true, true, true, true, true, false, true),
('white_label', 'White Label Pro', 399, NULL, NULL, true, true, true, true, true, true, true, true, true, true);

-- Subscriptions
CREATE TABLE public.subscriptions (
  agency_id UUID PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan public.plan_tier NOT NULL DEFAULT 'starter',
  status public.sub_status NOT NULL DEFAULT 'trialing',
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche public.niche NOT NULL DEFAULT 'custom',
  city TEXT,
  website TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  start_date DATE,
  monthly_retainer NUMERIC(10,2),
  status public.client_status NOT NULL DEFAULT 'active',
  objectives TEXT,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  brand_voice TEXT,
  notes TEXT,
  logo_url TEXT,
  health_score INTEGER DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_agency ON public.clients(agency_id);
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Niche: Real estate properties
CREATE TABLE public.niche_real_estate_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  property_type TEXT,
  price NUMERIC(12,2),
  area_sqm NUMERIC(10,2),
  views INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  viewings_booked INTEGER DEFAULT 0,
  offers_received INTEGER DEFAULT 0,
  sold BOOLEAN DEFAULT false,
  cost_per_lead NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_re_props_client ON public.niche_real_estate_properties(client_id);
CREATE TRIGGER re_props_updated BEFORE UPDATE ON public.niche_real_estate_properties FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Niche: Restaurant items
CREATE TABLE public.niche_restaurant_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  reservations INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  foot_traffic INTEGER DEFAULT 0,
  events INTEGER DEFAULT 0,
  best_dish BOOLEAN DEFAULT false,
  buying_intent_comments INTEGER DEFAULT 0,
  estimated_sales_impact NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rest_items_client ON public.niche_restaurant_items(client_id);
CREATE TRIGGER rest_items_updated BEFORE UPDATE ON public.niche_restaurant_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Niche: Dental treatments
CREATE TABLE public.niche_dental_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  treatment TEXT NOT NULL,
  qualified_leads INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  patients_arrived INTEGER DEFAULT 0,
  treatment_interest INTEGER DEFAULT 0,
  objections TEXT,
  cost_per_appointment NUMERIC(10,2),
  conversion_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dental_client ON public.niche_dental_treatments(client_id);
CREATE TRIGGER dental_updated BEFORE UPDATE ON public.niche_dental_treatments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Niche: Fitness offerings
CREATE TABLE public.niche_fitness_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  offering_type TEXT,
  memberships_sold INTEGER DEFAULT 0,
  trial_sessions INTEGER DEFAULT 0,
  classes_promoted INTEGER DEFAULT 0,
  trainer_content INTEGER DEFAULT 0,
  transformations INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  new_members_influenced INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fitness_client ON public.niche_fitness_offerings(client_id);
CREATE TRIGGER fitness_updated BEFORE UPDATE ON public.niche_fitness_offerings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Niche: Custom metrics (free-form)
CREATE TABLE public.niche_custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  notes TEXT,
  recorded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_custom_client ON public.niche_custom_metrics(client_id);
CREATE TRIGGER custom_updated BEFORE UPDATE ON public.niche_custom_metrics FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Content posts (calendar)
CREATE TABLE public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT,
  status public.post_status NOT NULL DEFAULT 'idea',
  scheduled_for TIMESTAMPTZ,
  script TEXT,
  caption TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  deadline TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_agency ON public.content_posts(agency_id);
CREATE INDEX idx_posts_client ON public.content_posts(client_id);
CREATE INDEX idx_posts_scheduled ON public.content_posts(scheduled_for);
CREATE TRIGGER posts_updated BEFORE UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Videos (performance tracker)
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT,
  publish_date DATE,
  video_url TEXT,
  hook TEXT,
  body_angle TEXT,
  cta TEXT,
  format TEXT,
  duration_seconds INTEGER,
  objective TEXT,
  views BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  retention_3s NUMERIC(5,2),
  retention_50pct NUMERIC(5,2),
  completion_rate NUMERIC(5,2),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  dms INTEGER DEFAULT 0,
  calls INTEGER DEFAULT 0,
  estimated_sales_impact NUMERIC(12,2),
  client_feedback TEXT,
  ai_score INTEGER,
  ai_insight TEXT,
  recommendation public.video_recommendation,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_agency ON public.videos(agency_id);
CREATE INDEX idx_videos_client ON public.videos(client_id);
CREATE INDEX idx_videos_publish ON public.videos(publish_date);
CREATE TRIGGER videos_updated BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Business impact entries
CREATE TABLE public.business_impact_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calls INTEGER DEFAULT 0,
  dms INTEGER DEFAULT 0,
  bookings INTEGER DEFAULT 0,
  appointments INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  viewings INTEGER DEFAULT 0,
  contracts INTEGER DEFAULT 0,
  revenue_estimate NUMERIC(12,2),
  qualitative_feedback TEXT,
  objections TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_impact_client ON public.business_impact_entries(client_id, entry_date);
CREATE TRIGGER impact_updated BEFORE UPDATE ON public.business_impact_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  folder TEXT DEFAULT 'general',
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_summary TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_agency ON public.documents(agency_id);
CREATE INDEX idx_docs_client ON public.documents(client_id);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_agency ON public.tasks(agency_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Invites
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agency_team',
  token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_agency ON public.invites(agency_id);
CREATE INDEX idx_invites_email ON public.invites(email);

-- ===========================================
-- SECURITY DEFINER helper functions
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_saas_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_saas_admin FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = _user_id AND agency_id = _agency_id);
$$;

CREATE OR REPLACE FUNCTION public.has_agency_role(_user_id UUID, _agency_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = _user_id AND agency_id = _agency_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND agency_id = _agency_id AND role IN ('agency_owner','saas_admin')
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- When an agency is created, add creator as owner + create trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_agency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'agency_owner')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.subscriptions (agency_id, plan, status, trial_end)
  VALUES (NEW.id, NEW.plan, 'trialing', now() + interval '14 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_agency_created AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agency();

-- Plan-limit triggers
CREATE OR REPLACE FUNCTION public.enforce_client_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max INTEGER; _current INTEGER;
BEGIN
  SELECT p.max_clients INTO _max FROM public.plans p
    JOIN public.agencies a ON a.plan = p.tier WHERE a.id = NEW.agency_id;
  IF _max IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO _current FROM public.clients WHERE agency_id = NEW.agency_id;
  IF _current >= _max THEN
    RAISE EXCEPTION 'Plan client limit reached (%). Upgrade your plan to add more clients.', _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_enforce_client_limit BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_client_limit();

CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max INTEGER; _current INTEGER;
BEGIN
  SELECT p.max_seats INTO _max FROM public.plans p
    JOIN public.agencies a ON a.plan = p.tier WHERE a.id = NEW.agency_id;
  IF _max IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO _current FROM public.agency_members WHERE agency_id = NEW.agency_id;
  IF _current >= _max THEN
    RAISE EXCEPTION 'Plan seat limit reached (%). Upgrade your plan to add more team members.', _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_enforce_seat_limit BEFORE INSERT ON public.agency_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();

-- ===========================================
-- RLS
-- ===========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_real_estate_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_restaurant_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_dental_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_fitness_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_impact_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Profiles: read own, read other members of same agency, admins read all
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_saas_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.agency_members m1 JOIN public.agency_members m2 ON m1.agency_id = m2.agency_id
               WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Plans: world readable
CREATE POLICY "plans_read_all" ON public.plans FOR SELECT TO authenticated USING (true);

-- Agencies
CREATE POLICY "agencies_member_read" ON public.agencies FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "agencies_create" ON public.agencies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "agencies_owner_update" ON public.agencies FOR UPDATE TO authenticated
  USING (public.is_owner_of(auth.uid(), id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "agencies_admin_delete" ON public.agencies FOR DELETE TO authenticated
  USING (public.is_saas_admin(auth.uid()));

-- Agency members
CREATE POLICY "members_read" ON public.agency_members FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR user_id = auth.uid() OR public.is_saas_admin(auth.uid()));
CREATE POLICY "members_owner_insert" ON public.agency_members FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of(auth.uid(), agency_id) OR user_id = auth.uid() OR public.is_saas_admin(auth.uid()));
CREATE POLICY "members_owner_update" ON public.agency_members FOR UPDATE TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "members_owner_delete" ON public.agency_members FOR DELETE TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id) OR user_id = auth.uid() OR public.is_saas_admin(auth.uid()));

-- Subscriptions
CREATE POLICY "subs_member_read" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "subs_owner_update" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "subs_owner_insert" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));

-- Generic policy template macro (we apply manually below for each agency-scoped table)
-- Clients
CREATE POLICY "clients_read" ON public.clients FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY "clients_write" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id));

-- Niche tables (same pattern for all 5)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'niche_real_estate_properties','niche_restaurant_items','niche_dental_treatments',
    'niche_fitness_offerings','niche_custom_metrics',
    'content_posts','videos','business_impact_entries','documents','tasks'
  ] LOOP
    EXECUTE format('CREATE POLICY "%1$s_read" ON public.%1$I FOR SELECT TO authenticated USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "%1$s_write" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_member_of(auth.uid(), agency_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_member_of(auth.uid(), agency_id))', t);
    EXECUTE format('CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE TO authenticated USING (public.is_member_of(auth.uid(), agency_id))', t);
  END LOOP;
END $$;

-- Invites
CREATE POLICY "invites_owner_all" ON public.invites FOR ALL TO authenticated
  USING (public.is_owner_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_owner_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));

-- ===========================================
-- Storage bucket for documents
-- ===========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-files', 'agency-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can access files where the first path segment is an agency they belong to
CREATE POLICY "agency_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agency-files'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "agency_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agency-files'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "agency_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agency-files'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "agency_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agency-files'
    AND public.is_member_of(auth.uid(), (storage.foldername(name))[1]::uuid));
