// Refines the suggested_prompt_for_lovable for a given suggestion.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, logRun, runSafety, estimateCost } from "../_shared/openai.ts";

const SYSTEM = `You are a senior product engineer writing prompts for the Lovable AI builder.
Given a product improvement suggestion, output a single, copy-paste-ready prompt that an
agency owner can submit to Lovable to implement the change. The prompt must:
- be specific and actionable
- list affected pages/components when known
- include acceptance criteria
- explicitly forbid changes to billing, RLS, roles, payments, deletions, or auto-publishing
Reply with the prompt text only — no preamble, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { suggestion_id } = await req.json().catch(() => ({}));
    if (!suggestion_id) return jsonResponse({ error: "suggestion_id required" }, 400);

    const { data: sug, error } = await supa.from("ai_improvement_suggestions").select("*").eq("id", suggestion_id).maybeSingle();
    if (error || !sug) return jsonResponse({ error: "Not found" }, 404);

    const userMsg = `Title: ${sug.title}\nCategory: ${sug.category}\nPriority: ${sug.priority}\nDescription:\n${sug.description ?? ""}\n\nAI reasoning:\n${sug.ai_reasoning ?? ""}\n\nCurrent draft prompt:\n${sug.suggested_prompt_for_lovable ?? "(none)"}`;

    const t0 = Date.now();
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
        temperature: 0.4,
      }),
    });
    if (!resp.ok) return jsonResponse({ error: await resp.text() }, resp.status);
    const data = await resp.json();
    const out = (data.choices?.[0]?.message?.content || "").trim();
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;

    const safety = await runSafety(svc, sug.agency_id, out);
    await logRun(svc, {
      agency_id: sug.agency_id, user_id: userId, prompt_key: "generate_fix_prompt", model: OPENAI_MODEL,
      input_messages: [{ role: "user", content: userMsg.slice(0, 4000) }], output_text: out,
      tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: Date.now() - t0,
      cost_usd: estimateCost(OPENAI_MODEL, tokensIn, tokensOut),
      status: safety.action === "block" ? "blocked" : "success", safety_flags: safety.flags,
    });
    if (safety.action === "block") return jsonResponse({ error: "Output blocked by safety rules" }, 400);

    const { error: upErr } = await supa.from("ai_improvement_suggestions")
      .update({ suggested_prompt_for_lovable: out }).eq("id", suggestion_id);
    if (upErr) return jsonResponse({ error: upErr.message }, 403);

    return jsonResponse({ prompt: out });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
