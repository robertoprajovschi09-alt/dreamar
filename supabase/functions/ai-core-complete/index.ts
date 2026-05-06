// One-shot completion using a versioned prompt. Non-streaming. Logs run.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, getActivePrompt, OPENAI_MODEL, OPENAI_API_KEY, OPENAI_BASE_URL, runSafety, logRun, logEvent, estimateCost } from "../_shared/openai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { agency_id, client_id, prompt_key, prompt_version, user_input, model: modelOverride, json = false } = await req.json();
    if (!agency_id || !prompt_key || !user_input) return jsonResponse({ error: "Bad request" }, 400);

    const { data: mem } = await supa.from("agency_members").select("role").eq("agency_id", agency_id).eq("user_id", userId).maybeSingle();
    if (!mem) return jsonResponse({ error: "Forbidden" }, 403);

    let promptRow;
    if (prompt_version) {
      const { data } = await svc.from("ai_prompts").select("*").eq("key", prompt_key).eq("version", prompt_version).maybeSingle();
      promptRow = data;
    } else {
      promptRow = await getActivePrompt(svc, prompt_key, agency_id);
    }
    if (!promptRow) return jsonResponse({ error: "Prompt not found" }, 404);

    const safetyIn = await runSafety(svc, agency_id, String(user_input));
    if (safetyIn.action === "block") return jsonResponse({ error: "Blocked", flags: safetyIn.flags }, 422);

    const model = modelOverride || promptRow.model || OPENAI_MODEL;
    const t0 = Date.now();
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: promptRow.content }, { role: "user", content: String(user_input) }],
        temperature: promptRow.temperature ?? 0.3,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      await logEvent(svc, agency_id, "error", "openai_error", { status: resp.status, body: t.slice(0, 500) }, userId);
      return jsonResponse({ error: t.slice(0, 200) }, resp.status);
    }
    const data = await resp.json();
    const out = data.choices?.[0]?.message?.content || "";
    const tokensIn = data.usage?.prompt_tokens ?? Math.ceil((promptRow.content.length + String(user_input).length) / 4);
    const tokensOut = data.usage?.completion_tokens ?? Math.ceil(out.length / 4);
    await logRun(svc, {
      agency_id, client_id: client_id ?? null, user_id: userId,
      prompt_key, prompt_version: promptRow.version, model,
      input_messages: [{ role: "user", content: user_input }],
      output_text: out, tokens_in: tokensIn, tokens_out: tokensOut,
      latency_ms: Date.now() - t0, cost_usd: estimateCost(model, tokensIn, tokensOut),
      status: "success", safety_flags: safetyIn.flags,
    });
    return jsonResponse({ output: out, raw: json ? safeParse(out) : null });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function safeParse(s: string) { try { return JSON.parse(s); } catch { return null; } }
