import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, logEvent } from "../_shared/openai.ts";

const NEGATIVE_TYPES = new Set([
  "inaccurate", "too_generic", "missing_context", "bad_tone",
  "wrong_strategy", "hallucinated_data", "not_useful",
]);
const POSITIVE_TYPES = new Set(["useful", "great_output"]);
const ALL_TYPES = new Set([...NEGATIVE_TYPES, ...POSITIVE_TYPES]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const body = await req.json();
    const { run_id, rating, category = null, comment = null, feedback_type = null, was_useful = null, correction = null, ai_feature = null } = body ?? {};
    if (!run_id || typeof rating !== "number") return jsonResponse({ error: "Bad request" }, 400);
    if (feedback_type && !ALL_TYPES.has(feedback_type)) return jsonResponse({ error: "Invalid feedback_type" }, 400);

    const { data: run } = await supa.from("ai_prompt_runs").select("agency_id,client_id,prompt_key,feature").eq("id", run_id).maybeSingle();
    if (!run?.agency_id) return jsonResponse({ error: "Run not found" }, 404);

    const feature = ai_feature ?? run.feature ?? run.prompt_key ?? null;

    const { error } = await supa.from("ai_feedback").insert({
      run_id, agency_id: run.agency_id, client_id: run.client_id, user_id: userId,
      rating, category, comment, feedback_type, was_useful, correction, ai_feature: feature,
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    // Pattern detector: last 10 feedbacks for same feature in this agency
    if (feature) {
      const { data: recent } = await svc.from("ai_feedback")
        .select("rating,feedback_type,created_at")
        .eq("agency_id", run.agency_id).eq("ai_feature", feature)
        .order("created_at", { ascending: false }).limit(10);
      const negatives = (recent ?? []).filter(f =>
        (typeof f.rating === "number" && f.rating <= 2) ||
        (f.feedback_type && NEGATIVE_TYPES.has(f.feedback_type))
      ).length;
      const hallucinations = (recent ?? []).filter(f => f.feedback_type === "hallucinated_data").length;

      if ((recent?.length ?? 0) >= 5 && negatives >= 5) {
        // Avoid duplicate open events
        const { data: existing } = await svc.from("ai_learning_events")
          .select("id").eq("agency_id", run.agency_id)
          .eq("event_type", "negative_feedback_pattern").eq("status", "new")
          .ilike("summary", `%${feature}%`).limit(1).maybeSingle();
        if (!existing) {
          await svc.from("ai_learning_events").insert({
            agency_id: run.agency_id, event_type: "negative_feedback_pattern", source: "feedback",
            summary: `Repeated negative feedback on feature "${feature}" (${negatives}/${recent?.length} recent ratings).`,
            recommended_change: "Run AI prompt improvement and propose a new prompt version.",
            status: "new",
          });
          await logEvent(svc, run.agency_id, "warn", "ai_negative_feedback_pattern", { feature, negatives }, userId);
        }
      }
      if (hallucinations >= 3) {
        const { data: existing } = await svc.from("ai_learning_events")
          .select("id").eq("agency_id", run.agency_id)
          .eq("event_type", "hallucination_spike").eq("status", "new")
          .ilike("summary", `%${feature}%`).limit(1).maybeSingle();
        if (!existing) {
          await svc.from("ai_learning_events").insert({
            agency_id: run.agency_id, event_type: "hallucination_spike", source: "feedback",
            summary: `Hallucination spike on "${feature}" — ${hallucinations} reports.`,
            recommended_change: "Tighten grounding rules. Force 'Missing data' when context is missing.",
            status: "new",
          });
        }
      }
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
