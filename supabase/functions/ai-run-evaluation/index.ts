// Runs an evaluation dataset against a specific prompt version, scores via LLM-as-judge, persists rows.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, logRun, estimateCost } from "../_shared/openai.ts";

const JUDGE = `You are an evaluator. Given a feature, the system prompt under test, an input sample,
the expected behavior, and the actual output, return strict JSON:
{"score": number between 0 and 1, "passed": boolean, "notes": string}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const { prompt_version_id, dataset } = await req.json().catch(() => ({}));
    if (!prompt_version_id || !Array.isArray(dataset) || dataset.length === 0) {
      return jsonResponse({ error: "prompt_version_id and dataset[] required" }, 400);
    }

    const { data: prompt, error: pErr } = await supa.from("ai_prompts").select("*").eq("id", prompt_version_id).maybeSingle();
    if (pErr || !prompt) return jsonResponse({ error: "Prompt not found" }, 404);

    // Authz: admin or agency owner
    const { data: prof } = await supa.from("profiles").select("is_saas_admin").eq("id", userId).maybeSingle();
    if (!prof?.is_saas_admin) {
      if (!prompt.agency_id) return jsonResponse({ error: "Forbidden" }, 403);
      const { data: mem } = await supa.from("agency_members").select("role").eq("agency_id", prompt.agency_id).eq("user_id", userId).maybeSingle();
      if (!mem || mem.role !== "agency_owner") return jsonResponse({ error: "Forbidden" }, 403);
    }

    const results: any[] = [];
    const model = prompt.model || OPENAI_MODEL;

    for (const sample of dataset.slice(0, 20)) {
      const { test_name, input_sample, expected_behavior } = sample;
      const t0 = Date.now();
      // 1) Run the candidate prompt
      const runResp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: prompt.content },
            { role: "user", content: typeof input_sample === "string" ? input_sample : JSON.stringify(input_sample) },
          ],
          temperature: prompt.temperature ?? 0.3,
        }),
      });
      const runData = runResp.ok ? await runResp.json() : null;
      const actual = runData?.choices?.[0]?.message?.content ?? "";

      // 2) Judge
      const judgeResp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: JUDGE },
            { role: "user", content: `Feature: ${prompt.key}\nExpected: ${expected_behavior}\nActual: ${actual.slice(0, 4000)}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });
      const judgeData = judgeResp.ok ? await judgeResp.json() : null;
      let verdict: any = { score: 0, passed: false, notes: "judge failed" };
      try { verdict = JSON.parse(judgeData?.choices?.[0]?.message?.content ?? "{}"); } catch { /* */ }
      const score = Math.max(0, Math.min(1, Number(verdict.score) || 0));
      const passed = !!verdict.passed && score >= 0.6;

      await svc.from("ai_evaluations").insert({
        agency_id: prompt.agency_id, prompt_key: prompt.key, prompt_version: prompt.version,
        prompt_version_id: prompt.id, feature: prompt.key, dataset_name: "manual",
        score, passed, test_name: test_name ?? null,
        input_sample: input_sample ?? null, expected_behavior: expected_behavior ?? null,
        actual_output: actual, evaluator_notes: verdict.notes ?? null,
        metrics: { latency_ms: Date.now() - t0 },
      });

      const tokensIn = (runData?.usage?.prompt_tokens ?? 0) + (judgeData?.usage?.prompt_tokens ?? 0);
      const tokensOut = (runData?.usage?.completion_tokens ?? 0) + (judgeData?.usage?.completion_tokens ?? 0);
      await logRun(svc, {
        agency_id: prompt.agency_id, user_id: userId, prompt_key: "evaluation", feature: "evaluation",
        model, input_messages: [{ role: "user", content: String(input_sample).slice(0, 2000) }],
        output_text: actual, tokens_in: tokensIn, tokens_out: tokensOut,
        cost_usd: estimateCost(model, tokensIn, tokensOut), status: "success",
        prompt_version_id: prompt.id,
      });
      results.push({ test_name, score, passed });
    }

    const avg = results.reduce((a, b) => a + b.score, 0) / results.length;
    await svc.from("ai_prompts").update({ performance_score: Number(avg.toFixed(3)) }).eq("id", prompt.id);

    return jsonResponse({ avg_score: avg, count: results.length, results });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
