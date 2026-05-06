
DROP VIEW IF EXISTS public.ai_prompt_scoreboard;
CREATE VIEW public.ai_prompt_scoreboard
WITH (security_invoker = true) AS
SELECT
  p.id AS prompt_id,
  p.key AS feature,
  p.version,
  p.version_name,
  p.is_active,
  p.agency_id,
  COALESCE(r.runs_count, 0) AS runs_count,
  r.last_used_at,
  COALESCE(f.feedback_count, 0) AS feedback_count,
  f.avg_rating,
  COALESCE(f.useful_count, 0) AS useful_count,
  COALESCE(f.hallucinated_count, 0) AS hallucinated_count,
  COALESCE(f.negative_count, 0) AS negative_count,
  CASE WHEN COALESCE(f.feedback_count, 0) > 0
       THEN ROUND((COALESCE(f.useful_count, 0)::numeric / f.feedback_count) * 100, 1)
       ELSE NULL END AS acceptance_rate
FROM public.ai_prompts p
LEFT JOIN (
  SELECT prompt_version_id, COUNT(*) AS runs_count, MAX(created_at) AS last_used_at
  FROM public.ai_prompt_runs WHERE prompt_version_id IS NOT NULL
  GROUP BY prompt_version_id
) r ON r.prompt_version_id = p.id
LEFT JOIN (
  SELECT
    rn.prompt_version_id,
    COUNT(fb.id) AS feedback_count,
    AVG(fb.rating) AS avg_rating,
    COUNT(*) FILTER (WHERE fb.was_useful IS TRUE OR fb.feedback_type IN ('useful','great_output')) AS useful_count,
    COUNT(*) FILTER (WHERE fb.feedback_type = 'hallucinated_data') AS hallucinated_count,
    COUNT(*) FILTER (WHERE fb.rating <= 2 OR fb.feedback_type IN ('inaccurate','too_generic','missing_context','bad_tone','wrong_strategy','hallucinated_data','not_useful')) AS negative_count
  FROM public.ai_feedback fb
  JOIN public.ai_prompt_runs rn ON rn.id = fb.run_id
  WHERE rn.prompt_version_id IS NOT NULL
  GROUP BY rn.prompt_version_id
) f ON f.prompt_version_id = p.id;
