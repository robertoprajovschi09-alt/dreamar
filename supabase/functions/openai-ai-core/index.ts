// Unified OpenAI entry-point for all AI features.
// Enforces role-based context, JSON-only output, and full logging.
import {
  corsHeaders,
  jsonResponse,
  userClient,
  serviceClient,
  requireUser,
  getActivePrompt,
  runSafety,
  estimateCost,
  logEvent,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
} from "../_shared/openai.ts";

// Whitelist of supported features and the role scope each requires.
type Scope = "agency" | "client_or_agency" | "admin";
const FEATURES: Record<string, Scope> = {
  monthly_report_generation: "client_or_agency",
  next_month_strategy: "agency",
  content_idea_generation: "agency",
  video_performance_analysis: "agency",
  health_score_explanation: "client_or_agency",
  risk_detector_analysis: "agency",
  website_audit: "admin",
  lovable_fix_prompt_generator: "admin",
  document_summary: "agency",
  competitor_insights: "agency",
  swipe_file_variations: "agency",
  analytics_interpretation: "agency",
};

const RESPONSE_SCHEMA = `{
  "title": string,
  "summary": string,
  "insights": string[],
  "recommendations": string[],
  "missing_data": string[],
  "confidence_score": number (0..1),
  "action_items": [{ "title": string, "priority": "low"|"medium"|"high", "owner": string|null }],
  "warnings": string[],
  "generated_text": string
}`;

function normalize(out: any) {
  const o = out && typeof out === "object" ? out : {};
  return {
    title: typeof o.title === "string" ? o.title : "",
    summary: typeof o.summary === "string" ? o.summary : "",
    insights: Array.isArray(o.insights) ? o.insights : [],
    recommendations: Array.isArray(o.recommendations) ? o.recommendations : [],
    missing_data: Array.isArray(o.missing_data) ? o.missing_data : [],
    confidence_score: typeof o.confidence_score === "number" ? o.confidence_score : null,
    action_items: Array.isArray(o.action_items) ? o.action_items : [],
    warnings: Array.isArray(o.warnings) ? o.warnings : [],
    generated_text: typeof o.generated_text === "string" ? o.generated_text : "",
  };
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return null; } }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);

    const body = await req.json().catch(() => ({}));
    const {
      feature,
      agency_id = null,
      client_id = null,
      input,
      context_type = null,
      prompt_version_id = null,
    } = body || {};

    if (!feature || !(feature in FEATURES)) {
      return jsonResponse({ error: "Unknown or missing feature" }, 400);
    }
    if (input === undefined || input === null) {
      return jsonResponse({ error: "input is required" }, 400);
    }
    const scope = FEATURES[feature as string];

    // Load profile via service role (bypasses RLS for our own server logic).
    const { data: profile } = await svc
      .from("profiles")
      .select("id, role, agency_id, client_id, is_saas_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 403);

    const isAdmin = !!profile.is_saas_admin;

    // Role / scope guard
    if (scope === "admin" && !isAdmin) {
      return jsonResponse({ error: "Admin only feature" }, 403);
    }

    // Cross-agency guard
    if (scope !== "admin") {
      if (!agency_id) return jsonResponse({ error: "agency_id required" }, 400);
      if (!isAdmin) {
        const { data: mem } = await svc
          .from("agency_members")
          .select("role")
          .eq("agency_id", agency_id)
          .eq("user_id", userId)
          .maybeSingle();
        const isClientViewer = profile.role === "client_viewer";
        if (!mem && !isClientViewer) return jsonResponse({ error: "Forbidden agency" }, 403);

        // Client viewer constraints
        if (isClientViewer) {
          if (scope !== "client_or_agency") return jsonResponse({ error: "Forbidden for client" }, 403);
          if (!client_id || client_id !== profile.client_id) {
            return jsonResponse({ error: "Forbidden client" }, 403);
          }
        }
      }
    }

    // Validate client belongs to agency
    if (client_id && agency_id) {
      const { data: c } = await svc.from("clients").select("agency_id").eq("id", client_id).maybeSingle();
      if (!c || c.agency_id !== agency_id) return jsonResponse({ error: "Client/agency mismatch" }, 403);
    }

    // Load prompt
    let promptRow: any = null;
    if (prompt_version_id) {
      const { data } = await svc.from("ai_prompts").select("*").eq("id", prompt_version_id).maybeSingle();
      promptRow = data;
    } else {
      promptRow = await getActivePrompt(svc, feature, agency_id);
    }
    if (!promptRow) {
      return jsonResponse({ error: `No active prompt for feature '${feature}'` }, 404);
    }

    // Build allowed context (server-side, role-aware)
    const ctx = await loadContext(svc, { feature, scope, isAdmin, role: profile.role, agency_id, client_id });

    // Safety on input + context
    const inputText = typeof input === "string" ? input : JSON.stringify(input);
    const safety = await runSafety(svc, agency_id, inputText + "\n" + JSON.stringify(ctx.data));
    if (safety.action === "block") {
      await persistOutput(svc, {
        agency_id, client_id, user_id: userId, feature, context_type,
        prompt_key: feature, prompt_version: promptRow.version, prompt_version_id: promptRow.id,
        model: promptRow.model || OPENAI_MODEL,
        input_payload: sanitize(input), output_json: null, output_text: null,
        tokens_in: 0, tokens_out: 0, cost_usd: 0, latency_ms: 0,
        status: "blocked", error_text: "Safety block",
        safety_flags: safety.flags, confidence_score: null, missing_data: ctx.missing, warnings: [],
      });
      return jsonResponse({ error: "Blocked by safety", flags: safety.flags }, 422);
    }

    // System prompt
    const baseSystem = promptRow.developer_prompt || promptRow.content || "";
    const roleScopeNote =
      profile.role === "client_viewer"
        ? "The end user is a CLIENT VIEWER. Never reveal data about other clients, internal agency metrics, billing, or configuration."
        : isAdmin
        ? "The end user is a SUPER ADMIN. Operate within administrative scope."
        : "The end user is an AGENCY member. Stay within this agency's data only.";
    const systemMessage = [
      baseSystem,
      "",
      "RULES:",
      "1) Respond ONLY with a single valid JSON object that conforms to the schema below. No prose, no markdown.",
      "2) Use ONLY the data provided in the user message. If a number or fact is missing, add it to `missing_data` and DO NOT invent values.",
      "3) " + roleScopeNote,
      "",
      "JSON SCHEMA:",
      RESPONSE_SCHEMA,
    ].join("\n");

    const userMessage = JSON.stringify({
      feature,
      context_type,
      input,
      context: ctx.data,
      missing_data_hint: ctx.missing,
    });

    const model = promptRow.model || OPENAI_MODEL;
    const t0 = Date.now();
    const callOpenAI = async (extraSystem?: string) => {
      const messages: any[] = [
        { role: "system", content: extraSystem ? systemMessage + "\n\n" + extraSystem : systemMessage },
        { role: "user", content: userMessage },
      ];
      const r = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: promptRow.temperature ?? 0.2,
          response_format: { type: "json_object" },
        }),
      });
      return r;
    };

    let resp = await callOpenAI();
    if (!resp.ok) {
      const t = await resp.text();
      await logEvent(svc, agency_id, "error", "openai_error", { status: resp.status, body: t.slice(0, 500), feature }, userId);
      await persistOutput(svc, {
        agency_id, client_id, user_id: userId, feature, context_type,
        prompt_key: feature, prompt_version: promptRow.version, prompt_version_id: promptRow.id,
        model, input_payload: sanitize(input), output_json: null, output_text: null,
        tokens_in: 0, tokens_out: 0, cost_usd: 0, latency_ms: Date.now() - t0,
        status: "error", error_text: t.slice(0, 500),
        safety_flags: safety.flags, confidence_score: null, missing_data: ctx.missing, warnings: [],
      });
      return jsonResponse({ error: "OpenAI error", detail: t.slice(0, 200) }, 502);
    }

    let data = await resp.json();
    let raw = data.choices?.[0]?.message?.content || "";
    let parsed = safeParse(raw);

    // One retry if JSON malformed
    if (!parsed || typeof parsed !== "object") {
      const retry = await callOpenAI("Your previous output was not valid JSON. Reply now with ONLY the JSON object.");
      if (retry.ok) {
        data = await retry.json();
        raw = data.choices?.[0]?.message?.content || "";
        parsed = safeParse(raw);
      }
    }

    const tokensIn = data.usage?.prompt_tokens ?? Math.ceil((systemMessage.length + userMessage.length) / 4);
    const tokensOut = data.usage?.completion_tokens ?? Math.ceil((raw || "").length / 4);
    const latency = Date.now() - t0;
    const cost = estimateCost(model, tokensIn, tokensOut);

    if (!parsed || typeof parsed !== "object") {
      const id = await persistOutput(svc, {
        agency_id, client_id, user_id: userId, feature, context_type,
        prompt_key: feature, prompt_version: promptRow.version, prompt_version_id: promptRow.id,
        model, input_payload: sanitize(input), output_json: null, output_text: raw,
        tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: cost, latency_ms: latency,
        status: "error", error_text: "Invalid JSON output",
        safety_flags: safety.flags, confidence_score: null, missing_data: ctx.missing, warnings: [],
      });
      return jsonResponse({ error: "Model did not return valid JSON", output_id: id, raw }, 502);
    }

    const normalized = normalize(parsed);
    // Merge backend-detected missing data
    if (ctx.missing.length) {
      const set = new Set([...(normalized.missing_data || []), ...ctx.missing]);
      normalized.missing_data = Array.from(set);
    }

    // Safety on output
    const outSafety = await runSafety(svc, agency_id, normalized.generated_text + "\n" + normalized.summary);
    const status = outSafety.action === "block" ? "blocked"
      : (normalized.missing_data?.length ? "missing_data" : "success");

    const outputId = await persistOutput(svc, {
      agency_id, client_id, user_id: userId, feature, context_type,
      prompt_key: feature, prompt_version: promptRow.version, prompt_version_id: promptRow.id,
      model, input_payload: sanitize(input), output_json: normalized, output_text: normalized.generated_text,
      tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: cost, latency_ms: latency,
      status, error_text: null,
      safety_flags: [...safety.flags, ...outSafety.flags],
      confidence_score: normalized.confidence_score, missing_data: normalized.missing_data, warnings: normalized.warnings,
    });

    // Mirror to ai_prompt_runs for the Learning Loop
    await svc.from("ai_prompt_runs").insert({
      agency_id, client_id, user_id: userId,
      feature, prompt_key: feature, prompt_version: promptRow.version, prompt_version_id: promptRow.id,
      model,
      input_messages: [{ role: "user", content: userMessage }],
      output_text: normalized.generated_text, output_json: normalized,
      tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: latency, cost_usd: cost,
      status, safety_flags: [...safety.flags, ...outSafety.flags],
    });

    return jsonResponse({
      output_id: outputId,
      output: normalized,
      model,
      prompt_version: promptRow.version,
      tokens: { in: tokensIn, out: tokensOut },
      cost_usd: cost,
      status,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

// --- helpers ---

function sanitize(input: unknown) {
  // Strip obviously large blobs to keep payload reasonable
  try {
    const s = JSON.stringify(input);
    if (s.length > 50_000) return { _truncated: true, preview: s.slice(0, 5_000) };
    return typeof input === "string" ? { text: input } : (input as any);
  } catch { return { _unserializable: true }; }
}

async function persistOutput(svc: any, row: Record<string, unknown>): Promise<string | undefined> {
  const { data, error } = await svc.from("ai_outputs").insert(row).select("id").single();
  if (error) { console.error("ai_outputs insert error", error); return undefined; }
  return data?.id as string;
}

type CtxArgs = {
  feature: string; scope: Scope; isAdmin: boolean; role: string | null;
  agency_id: string | null; client_id: string | null;
};

async function loadContext(svc: any, a: CtxArgs): Promise<{ data: any; missing: string[] }> {
  const missing: string[] = [];
  const data: any = { feature: a.feature };

  if (a.scope === "admin") {
    // Aggregate, non-PII admin signals only
    const { count: agenciesCount } = await svc.from("agencies").select("id", { count: "exact", head: true });
    const { count: clientsCount } = await svc.from("clients").select("id", { count: "exact", head: true });
    data.platform_metrics = { agencies: agenciesCount ?? 0, clients: clientsCount ?? 0 };
    if (agenciesCount == null) missing.push("agencies_count");
    return { data, missing };
  }

  // Client viewer: only their own client data
  if (a.role === "client_viewer" && a.client_id) {
    const { data: client } = await svc.from("clients").select("id,name,niche,brand_voice,objectives,target_audience").eq("id", a.client_id).maybeSingle();
    if (!client) missing.push("client_profile"); else data.client = client;
    const { data: hs } = await svc.from("client_health_scores").select("total_score,score_status,summary,period_start,period_end").eq("client_id", a.client_id).order("period_end", { ascending: false }).limit(3);
    if (!hs?.length) missing.push("recent_health_scores"); else data.health_scores = hs;
    return { data, missing };
  }

  // Agency scope
  if (a.agency_id) {
    if (a.client_id) {
      const { data: client } = await svc.from("clients").select("*").eq("id", a.client_id).maybeSingle();
      if (!client) missing.push("client_profile"); else data.client = client;
      const { data: analytics } = await svc.from("analytics_entries").select("*").eq("client_id", a.client_id).order("date_end", { ascending: false }).limit(6);
      if (!analytics?.length) missing.push("analytics_entries"); else data.analytics = analytics;
      const { data: hs } = await svc.from("client_health_scores").select("*").eq("client_id", a.client_id).order("period_end", { ascending: false }).limit(3);
      if (!hs?.length) missing.push("health_scores"); else data.health_scores = hs;
      const { data: risks } = await svc.from("client_risk_alerts").select("risk_level,risk_score,risk_reasons,status,detected_at").eq("client_id", a.client_id).eq("status", "active").limit(5);
      data.active_risks = risks ?? [];
    } else {
      const { data: agency } = await svc.from("agencies").select("id,name,plan").eq("id", a.agency_id).maybeSingle();
      if (!agency) missing.push("agency_profile"); else data.agency = agency;
      const { data: clients } = await svc.from("clients").select("id,name,niche,status,health_score").eq("agency_id", a.agency_id).limit(50);
      if (!clients?.length) missing.push("clients"); else data.clients = clients;
    }
  }
  return { data, missing };
}
