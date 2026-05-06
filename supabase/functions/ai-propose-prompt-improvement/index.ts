// Drafts an improved system prompt for a feature, saved as inactive ai_prompts row + a learning event.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, logRun, runSafety, estimateCost, getActivePrompt } from "../_shared/openai.ts";

const SYSTEM = `You are a senior prompt engineer. Improve the system prompt of an AI feature
based on the user feedback and recent failures provided. The improved prompt MUST:
- explicitly require grounding in real data; if data is missing, output "Missing data: <field>" and stop
- forbid fabricating numbers, statistics, or sources
- preserve the original feature's intent and output format
- not weaken any safety rules
Reply with strict JSON only:
{"proposed_system_prompt": string, "rationale": string, "expected_improvement": string}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { feature, agency_id = null } = await req.json().catch(() => ({}));
    if (!feature) return jsonResponse({ error: "feature required" }, 400);

    // Authz
    const { data: prof } = await supa.from("profiles").select("is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!prof?.is_saas_admin;
    if (!isAdmin) {
      if (!agency_id) return jsonResponse({ error: "Forbidden" }, 403);
      const { data: mem } = await supa.from("agency_members").select("role").eq("agency_id", agency_id).eq("user_id", userId).maybeSingle();
      if (!mem || mem.role !== "agency_owner") return jsonResponse({ error: "Forbidden" }, 403);
    }

    const active = await getActivePrompt(svc, feature, agency_id);
    if (!active) return jsonResponse({ error: "No active prompt for this feature" }, 404);

    const { data: feedbacks } = await svc.from("ai_feedback")
      .select("rating,feedback_type,comment,correction,created_at")
      .eq("ai_feature", feature)
      .order("created_at", { ascending: false }).limit(30);

    const { data: failedRuns } = await svc.from("ai_prompt_runs")
      .select("output_text,error_text,status,created_at")
      .eq("feature", feature).in("status", ["error", "blocked"])
      .order("created_at", { ascending: false }).limit(10);

    const userMsg = `Feature: ${feature}
Current system prompt:
"""
${active.content}
"""
Recent feedback (last 30):
${JSON.stringify(feedbacks ?? [])}
Recent failed runs:
${JSON.stringify(failedRuns ?? [])}`;

    const t0 = Date.now();
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return jsonResponse({ error: await resp.text() }, resp.status);
    const data = await resp.json();
    const out = data.choices?.[0]?.message?.content || "{}";
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;

    const safety = await runSafety(svc, agency_id, out);
    await logRun(svc, {
      agency_id, user_id: userId, prompt_key: "propose_prompt_improvement", feature: "propose_prompt_improvement",
      model: OPENAI_MODEL, input_messages: [{ role: "user", content: userMsg.slice(0, 4000) }],
      output_text: out, tokens_in: tokensIn, tokens_out: tokensOut,
      latency_ms: Date.now() - t0, cost_usd: estimateCost(OPENAI_MODEL, tokensIn, tokensOut),
      status: safety.action === "block" ? "blocked" : "success", safety_flags: safety.flags,
    });
    if (safety.action === "block") return jsonResponse({ error: "Output blocked by safety rules" }, 400);

    let parsed: any = {};
    try { parsed = JSON.parse(out); } catch { /* */ }
    if (!parsed.proposed_system_prompt) return jsonResponse({ error: "Invalid proposal" }, 422);

    // Compute next version number for this feature/agency
    const { data: maxRow } = await svc.from("ai_prompts").select("version")
      .eq("key", feature).eq("agency_id", agency_id ?? null)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (maxRow?.version ?? 0) + 1;

    const { data: draft, error: insErr } = await svc.from("ai_prompts").insert({
      key: feature, feature, agency_id, version: nextVersion,
      version_name: "AI proposal",
      content: parsed.proposed_system_prompt,
      model: active.model, temperature: active.temperature,
      is_active: false,
      notes: parsed.rationale ?? null,
      created_by: userId,
    }).select("id").single();
    if (insErr) return jsonResponse({ error: insErr.message }, 500);

    const { data: ev } = await svc.from("ai_learning_events").insert({
      agency_id, event_type: "prompt_improvement_proposal", source: "feedback",
      summary: `AI proposed a new prompt version for "${feature}" (v${nextVersion}).`,
      recommended_change: parsed.expected_improvement ?? parsed.rationale ?? null,
      proposed_prompt_version_id: draft.id, status: "new",
    }).select("id").single();

    return jsonResponse({ prompt_id: draft.id, version: nextVersion, learning_event_id: ev?.id, rationale: parsed.rationale });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
