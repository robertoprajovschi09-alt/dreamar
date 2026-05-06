import { corsHeaders, jsonResponse, userClient, requireUser } from "../_shared/openai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = userClient(req);
    const { userId } = await requireUser(supa, req);
    const { run_id, rating, category, comment } = await req.json();
    if (!run_id || ![-1, 0, 1].includes(rating)) return jsonResponse({ error: "Bad request" }, 400);
    const { data: run } = await supa.from("ai_prompt_runs").select("agency_id").eq("id", run_id).maybeSingle();
    if (!run?.agency_id) return jsonResponse({ error: "Run not found" }, 404);
    const { error } = await supa.from("ai_feedback").insert({
      run_id, agency_id: run.agency_id, user_id: userId, rating, category: category ?? null, comment: comment ?? null,
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
