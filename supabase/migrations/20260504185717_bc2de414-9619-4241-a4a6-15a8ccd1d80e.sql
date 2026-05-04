
-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  objective text,
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  budget numeric,
  channels text[] DEFAULT ARRAY[]::text[],
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_read ON public.campaigns FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY campaigns_write ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY campaigns_update ON public.campaigns FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY campaigns_delete ON public.campaigns FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Document visibility
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;

-- Replace read policy so clients see their visible documents
DROP POLICY IF EXISTS documents_read ON public.documents;
CREATE POLICY documents_read ON public.documents FOR SELECT TO authenticated
  USING (
    is_member_of(auth.uid(), agency_id)
    OR is_saas_admin(auth.uid())
    OR (visibility = 'client_visible' AND client_id IS NOT NULL AND is_client_viewer_of(auth.uid(), client_id))
  );
