
CREATE TABLE public.analytics_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  period_type text NOT NULL DEFAULT 'month',
  month integer,
  year integer,
  date_start date,
  date_end date,
  views numeric DEFAULT 0,
  reach numeric DEFAULT 0,
  impressions numeric DEFAULT 0,
  likes numeric DEFAULT 0,
  comments numeric DEFAULT 0,
  shares numeric DEFAULT 0,
  saves numeric DEFAULT 0,
  engagement_rate numeric,
  followers_start numeric,
  followers_end numeric,
  followers_gained numeric,
  profile_visits numeric,
  website_clicks numeric,
  messages numeric,
  calls numeric,
  leads numeric,
  bookings numeric,
  sales numeric,
  revenue numeric,
  ad_spend numeric,
  roas numeric,
  cost_per_lead numeric,
  cost_per_purchase numeric,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv_import','ai_extracted','integration')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_entries_client_period ON public.analytics_entries(client_id, year, month);
CREATE INDEX idx_analytics_entries_client_platform ON public.analytics_entries(client_id, platform, date_start);
ALTER TABLE public.analytics_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_entries_read ON public.analytics_entries FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY analytics_entries_insert ON public.analytics_entries FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY analytics_entries_update ON public.analytics_entries FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY analytics_entries_delete ON public.analytics_entries FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER analytics_entries_set_updated_at BEFORE UPDATE ON public.analytics_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  content_item_id uuid NOT NULL,
  platform text,
  views numeric DEFAULT 0,
  reach numeric DEFAULT 0,
  impressions numeric DEFAULT 0,
  likes numeric DEFAULT 0,
  comments numeric DEFAULT 0,
  shares numeric DEFAULT 0,
  saves numeric DEFAULT 0,
  watch_time numeric,
  average_view_duration numeric,
  retention_rate numeric,
  hook_rate numeric,
  completion_rate numeric,
  followers_gained numeric,
  leads numeric,
  sales numeric,
  bookings numeric,
  revenue numeric,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv_import','ai_extracted','integration')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_item_id, platform)
);
CREATE INDEX idx_content_metrics_client_platform ON public.content_metrics(client_id, platform);
CREATE INDEX idx_content_metrics_item ON public.content_metrics(content_item_id);
ALTER TABLE public.content_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_metrics_read ON public.content_metrics FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY content_metrics_insert ON public.content_metrics FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY content_metrics_update ON public.content_metrics FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY content_metrics_delete ON public.content_metrics FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER content_metrics_set_updated_at BEFORE UPDATE ON public.content_metrics
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
