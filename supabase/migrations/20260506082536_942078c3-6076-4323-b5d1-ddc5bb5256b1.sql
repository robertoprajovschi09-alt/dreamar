
-- Enable pgvector for embeddings (ai_memory)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1) ai_prompts
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  model text NULL,
  temperature numeric NULL,
  is_active boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, key, version)
);
CREATE INDEX ai_prompts_key_active_idx ON public.ai_prompts(key, is_active);
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_prompts_read ON public.ai_prompts FOR SELECT TO authenticated
  USING (agency_id IS NULL OR is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));
CREATE POLICY ai_prompts_write ON public.ai_prompts FOR INSERT TO authenticated
  WITH CHECK (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));
CREATE POLICY ai_prompts_update ON public.ai_prompts FOR UPDATE TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));
CREATE POLICY ai_prompts_delete ON public.ai_prompts FOR DELETE TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));

CREATE TRIGGER ai_prompts_updated_at BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) ai_prompt_runs
CREATE TABLE public.ai_prompt_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  client_id uuid NULL,
  user_id uuid NULL,
  prompt_key text NULL,
  prompt_version integer NULL,
  model text NULL,
  input_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_text text NULL,
  tool_calls jsonb NULL,
  tokens_in integer NULL,
  tokens_out integer NULL,
  latency_ms integer NULL,
  cost_usd numeric NULL,
  status text NOT NULL DEFAULT 'success',
  error_text text NULL,
  safety_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_prompt_runs_agency_idx ON public.ai_prompt_runs(agency_id, created_at DESC);
ALTER TABLE public.ai_prompt_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_prompt_runs_read ON public.ai_prompt_runs FOR SELECT TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_member_of(auth.uid(), agency_id)));
CREATE POLICY ai_prompt_runs_insert ON public.ai_prompt_runs FOR INSERT TO authenticated
  WITH CHECK (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_member_of(auth.uid(), agency_id)));

-- 3) ai_feedback
CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_prompt_runs(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  category text NULL,
  comment text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_feedback_read ON public.ai_feedback FOR SELECT TO authenticated
  USING (is_saas_admin(auth.uid()) OR is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_feedback_write ON public.ai_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_member_of(auth.uid(), agency_id));

-- 4) ai_evaluations
CREATE TABLE public.ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  prompt_key text NOT NULL,
  prompt_version integer NOT NULL,
  dataset_name text NOT NULL,
  score numeric NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_evaluations_read ON public.ai_evaluations FOR SELECT TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NULL) OR is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_evaluations_write ON public.ai_evaluations FOR INSERT TO authenticated
  WITH CHECK (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_member_of(auth.uid(), agency_id)));

-- 5) ai_actions
CREATE TABLE public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NULL,
  requested_by_user_id uuid NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning text NULL,
  run_id uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid NULL,
  decided_at timestamptz NULL,
  executed_at timestamptz NULL,
  result jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_actions_agency_status_idx ON public.ai_actions(agency_id, status, created_at DESC);
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_actions_read ON public.ai_actions FOR SELECT TO authenticated
  USING (is_saas_admin(auth.uid()) OR is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_actions_insert ON public.ai_actions FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_actions_update ON public.ai_actions FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_actions_delete ON public.ai_actions FOR DELETE TO authenticated
  USING (is_owner_of(auth.uid(), agency_id));
CREATE TRIGGER ai_actions_updated_at BEFORE UPDATE ON public.ai_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6) ai_memory
CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NULL,
  scope text NOT NULL DEFAULT 'agency',
  kind text NOT NULL DEFAULT 'fact',
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NULL,
  source text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_memory_agency_idx ON public.ai_memory(agency_id);
CREATE INDEX ai_memory_client_idx ON public.ai_memory(client_id);
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_memory_read ON public.ai_memory FOR SELECT TO authenticated
  USING (
    is_saas_admin(auth.uid())
    OR is_member_of(auth.uid(), agency_id)
    OR (scope = 'client' AND client_id IS NOT NULL AND is_client_viewer_of(auth.uid(), client_id))
  );
CREATE POLICY ai_memory_write ON public.ai_memory FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_memory_update ON public.ai_memory FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY ai_memory_delete ON public.ai_memory FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE TRIGGER ai_memory_updated_at BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7) ai_audit_events
CREATE TABLE public.ai_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  source text NOT NULL DEFAULT 'edge',
  level text NOT NULL DEFAULT 'info',
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_audit_events_idx ON public.ai_audit_events(level, created_at DESC);
ALTER TABLE public.ai_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_audit_events_read ON public.ai_audit_events FOR SELECT TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_member_of(auth.uid(), agency_id)));
CREATE POLICY ai_audit_events_insert ON public.ai_audit_events FOR INSERT TO authenticated
  WITH CHECK (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_member_of(auth.uid(), agency_id)));

-- 8) ai_safety_rules
CREATE TABLE public.ai_safety_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  rule_key text NOT NULL,
  description text NULL,
  pattern text NOT NULL,
  action text NOT NULL DEFAULT 'warn',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_safety_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_safety_rules_read ON public.ai_safety_rules FOR SELECT TO authenticated
  USING (agency_id IS NULL OR is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));
CREATE POLICY ai_safety_rules_write ON public.ai_safety_rules FOR INSERT TO authenticated
  WITH CHECK (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));
CREATE POLICY ai_safety_rules_update ON public.ai_safety_rules FOR UPDATE TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));
CREATE POLICY ai_safety_rules_delete ON public.ai_safety_rules FOR DELETE TO authenticated
  USING (is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND is_owner_of(auth.uid(), agency_id)));
CREATE TRIGGER ai_safety_rules_updated_at BEFORE UPDATE ON public.ai_safety_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed: default global safety rules
INSERT INTO public.ai_safety_rules (agency_id, rule_key, description, pattern, action, enabled) VALUES
  (NULL, 'prompt_injection', 'Detect prompt injection attempts', '(?i)(ignore (all|previous) instructions|disregard the system prompt|you are now)', 'warn', true),
  (NULL, 'pii_email', 'Detect email leakage in output', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'warn', true),
  (NULL, 'pii_phone', 'Detect phone number leakage', '(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{2,4}', 'warn', true),
  (NULL, 'destructive_sql', 'Block destructive SQL in output', '(?i)(drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;)', 'block', true);

-- Seed: initial system prompts (global, active)
INSERT INTO public.ai_prompts (agency_id, key, version, content, model, temperature, is_active, notes) VALUES
  (NULL, 'agency_assistant', 1,
   'You are an expert social media strategist embedded inside a SaaS dashboard for marketing agencies. Use the provided CONTEXT as ground truth — never invent metrics. Be concise, structured (bullets when listing), and actionable. Respond in the user''s language. When you suggest concrete actions on the database, propose them as ai_actions, never claim you executed them.',
   NULL, 0.4, true, 'Initial system prompt for the agency AI assistant'),
  (NULL, 'maintainer_scan', 1,
   'You are an SRE assistant. Given recent error logs and audit events from a SaaS app, return: (1) likely root causes, (2) prioritized fix suggestions (P0/P1/P2), (3) which file/area is most likely affected. Be terse. Never invent stack traces.',
   NULL, 0.2, true, 'AI Maintainer scan prompt'),
  (NULL, 'safety_rewrite', 1,
   'Rewrite the following AI output to remove personal identifiable information (emails, phone numbers, addresses) while keeping the message intact. Return only the cleaned text.',
   NULL, 0.0, true, 'Safety rewrite when PII is detected');
