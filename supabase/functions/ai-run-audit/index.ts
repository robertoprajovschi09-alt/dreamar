// Runs an AI audit for a given audit_type, persists audit + suggestions.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, getActivePrompt, logRun, logEvent, runSafety, estimateCost } from "../_shared/openai.ts";

const AUDIT_TYPES = new Set([
  "ux", "copy", "dashboard", "onboarding", "pricing",
  "client_portal", "agency_dashboard", "conversion", "full",
]);

const SYSTEM_BASE = `You are an expert SaaS product auditor for a marketing-agency platform.
Identify problems related to clarity, copy, UX, dashboards, empty states, missing CTAs,
broken flows, design inconsistencies, unused features, conversion blockers, and onboarding.
You MUST reply with strict JSON only — no prose, no markdown — matching this schema:
{
  "summary": string,
  "severity": "low"|"medium"|"high"|"critical",
  "findings": [{ "problem": string, "evidence": string, "severity": "low"|"medium"|"high"|"critical", "area": string }],
  "recommended_actions": [string],
  "suggestions": [{
    "title": string,
    "description": string,
    "category": "ux"|"copy"|"conversion"|"onboarding"|"dashboard"|"design"|"bug"|"performance"|"feature_cleanup",
    "priority": "low"|"medium"|"high"|"critical",
    "impact_score": number,
    "effort_score": number,
    "ai_reasoning": string,
    "risk_if_unresolved": string,
    "data_used": string,
    "suggested_prompt_for_lovable": string
  }]
}
For each suggestion include impact (1-10), effort (1-10), why it matters, risk if unresolved,
data used, and a copy-paste-ready Lovable prompt to implement the fix.
You may NOT propose changes to billing, RLS, roles, payments, deletions, or auto-publishing content.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);

    const body = await req.json().catch(() => ({}));
    const { agency_id = null, audit_type, page_name = null, page_url = null, context = null } = body ?? {};
    if (!audit_type || !AUDIT_TYPES.has(audit_type)) {
      return jsonResponse({ error: "Invalid audit_type" }, 400);
    }

    // Authz
    const { data: prof } = await supa.from("profiles").select("is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!prof?.is_saas_admin;
    if (!isAdmin) {
      if (!agency_id) return jsonResponse({ error: "agency_id required" }, 400);
      const { data: mem } = await supa.from("agency_members").select("role").eq("agency_id", agency_id).eq("user_id", userId).maybeSingle();
      if (!mem || (mem.role !== "agency_owner" && mem.role !== "agency_admin" && mem.role !== "agency_team")) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    // Gather context
    const ctx: Record<string, unknown> = { audit_type, page_name, page_url, extra: context };
    if (agency_id) {
      const [{ data: events }, { data: feedback }, { data: posts }, { count: clientsCount }] = await Promise.all([
        svc.from("ai_audit_events").select("level,event,payload,created_at").eq("agency_id", agency_id).in("level", ["warn", "error", "critical"]).order("created_at", { ascending: false }).limit(30),
        svc.from("ai_feedback").select("rating,comment,category,created_at").eq("agency_id", agency_id).lte("rating", 3).order("created_at", { ascending: false }).limit(20),
        svc.from("content_posts").select("status,created_at").eq("agency_id", agency_id).order("created_at", { ascending: false }).limit(50),
        svc.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", agency_id),
      ]);
      ctx.recent_errors = events ?? [];
      ctx.negative_feedback = feedback ?? [];
      ctx.recent_posts = posts ?? [];
      ctx.clients_count = clientsCount ?? 0;
    } else {
      const { data: events } = await svc.from("ai_audit_events").select("level,event,payload,created_at").in("level", ["warn", "error", "critical"]).order("created_at", { ascending: false }).limit(30);
      ctx.global_errors = events ?? [];
    }

    const promptRow = await getActivePrompt(svc, "website_maintainer_audit", agency_id);
    const systemPrompt = promptRow?.content || SYSTEM_BASE;
    const userMsg = `Audit type: ${audit_type}\nPage: ${page_name ?? "(any)"} ${page_url ?? ""}\nContext:\n${JSON.stringify(ctx).slice(0, 18000)}`;

    const t0 = Date.now();
    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: promptRow?.model || OPENAI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      await logEvent(svc, agency_id, "error", "ai_run_audit_openai_error", { err }, userId);
      return jsonResponse({ error: err }, resp.status);
    }
    const data = await resp.json();
    const out = data.choices?.[0]?.message?.content || "{}";
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    const model = promptRow?.model || OPENAI_MODEL;

    const safety = await runSafety(svc, agency_id, out);
    await logRun(svc, {
      agency_id, user_id: userId, prompt_key: "website_maintainer_audit", prompt_version: promptRow?.version ?? null,
      model, input_messages: [{ role: "user", content: userMsg.slice(0, 4000) }],
      output_text: out, tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: Date.now() - t0,
      cost_usd: estimateCost(model, tokensIn, tokensOut),
      status: safety.action === "block" ? "blocked" : "success",
      safety_flags: safety.flags,
    });
    if (safety.action === "block") return jsonResponse({ error: "Output blocked by safety rules" }, 400);

    let parsed: any = {};
    try { parsed = JSON.parse(out); } catch { parsed = {}; }

    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    const { data: audit, error: auditErr } = await svc.from("ai_website_audits").insert({
      agency_id, audit_type, page_url, page_name,
      findings: parsed.findings ?? [],
      severity: parsed.severity ?? "medium",
      ai_summary: parsed.summary ?? null,
      recommended_actions: parsed.recommended_actions ?? [],
      status: "completed",
      created_by: userId,
    }).select("id").single();
    if (auditErr) return jsonResponse({ error: auditErr.message }, 500);

    if (suggestions.length) {
      const rows = suggestions.map((s: any) => ({
        agency_id,
        source_type: "audit",
        source_id: audit.id,
        title: String(s.title ?? "Untitled").slice(0, 200),
        description: s.description ?? null,
        category: s.category ?? "ux",
        priority: s.priority ?? "medium",
        impact_score: Math.min(10, Math.max(1, Number(s.impact_score) || 5)),
        effort_score: Math.min(10, Math.max(1, Number(s.effort_score) || 5)),
        ai_reasoning: [
          s.ai_reasoning && `Why it matters: ${s.ai_reasoning}`,
          s.risk_if_unresolved && `Risk if unresolved: ${s.risk_if_unresolved}`,
          s.data_used && `Data used: ${s.data_used}`,
        ].filter(Boolean).join("\n\n"),
        suggested_prompt_for_lovable: s.suggested_prompt_for_lovable ?? null,
        status: "new",
      }));
      await svc.from("ai_improvement_suggestions").insert(rows);
    }

    await logEvent(svc, agency_id, "info", "ai_audit_completed", { audit_id: audit.id, suggestions: suggestions.length }, userId);
    return jsonResponse({ audit_id: audit.id, suggestions_count: suggestions.length, summary: parsed.summary ?? null });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
