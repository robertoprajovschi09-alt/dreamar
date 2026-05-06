// Ingest a knowledge source (document, report, brief, feedback, analytics, competitor),
// summarize and extract structured facts via Lovable AI, store in ai_knowledge_sources,
// then queue suggested ai_memory_items via the ai_action_requests approval system.
import { corsHeaders, jsonResponse, userClient, serviceClient, requireUser } from "../_shared/openai.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ALLOWED_SOURCE = new Set(["document","report","brief","feedback","analytics","competitor","manual"]);

const ALLOWED_TYPES = [
  "agency_preference","client_brand_voice","client_goal","niche_insight","content_pattern",
  "winning_hook","failed_hook","reporting_preference","business_context","audience_insight","competitor_insight",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);
    const body = await req.json().catch(() => ({}));
    const { agency_id, client_id = null, source_type, source_id, title, raw_content } = body || {};

    if (!agency_id || !source_type || !source_id || !title || !raw_content) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }
    if (!ALLOWED_SOURCE.has(source_type)) {
      return jsonResponse({ error: "Unsupported source_type" }, 400);
    }

    const { data: profile } = await svc.from("profiles").select("is_saas_admin").eq("id", userId).maybeSingle();
    const isAdmin = !!profile?.is_saas_admin;
    if (!isAdmin) {
      const { data: mem } = await svc.from("agency_members")
        .select("user_id").eq("user_id", userId).eq("agency_id", agency_id).maybeSingle();
      if (!mem) return jsonResponse({ error: "Forbidden" }, 403);
    }

    // upsert source as processing
    const upsertSrc = await svc.from("ai_knowledge_sources").upsert({
      agency_id, client_id, source_type, source_id, title,
      status: "processing",
    }, { onConflict: "agency_id,source_type,source_id" }).select().single();
    if (upsertSrc.error) return jsonResponse({ error: upsertSrc.error.message }, 400);
    const sourceRow = upsertSrc.data;

    // Ask AI to summarize + extract structured facts (must be JSON)
    const sys = [
      "You analyze a knowledge source for an agency CRM and extract structured facts.",
      "Return ONLY a single JSON object with this schema:",
      `{ "summary": string, "facts": [ { "memory_type": one of [${ALLOWED_TYPES.join(", ")}], "title": string, "content": string, "confidence": number (0..1) } ] }`,
      "Do NOT invent. If the source does not support a fact, omit it.",
      "Keep titles short. Keep content concise and self-contained.",
    ].join("\n");

    const trimmed = String(raw_content).slice(0, 30_000);
    const aiResp = await fetch(LOVABLE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify({ source_type, title, content: trimmed }) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      await svc.from("ai_knowledge_sources").update({ status: "failed" }).eq("id", sourceRow.id);
      return jsonResponse({ error: "AI gateway error", detail: t.slice(0, 200) }, 502);
    }
    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const summary: string = typeof parsed.summary === "string" ? parsed.summary : "";
    const facts: any[] = Array.isArray(parsed.facts) ? parsed.facts.filter(
      (f: any) => f && ALLOWED_TYPES.includes(f.memory_type) && f.title && f.content,
    ) : [];

    await svc.from("ai_knowledge_sources").update({
      content_summary: summary,
      extracted_facts: facts,
      status: "processed",
      last_processed_at: new Date().toISOString(),
    }).eq("id", sourceRow.id);

    // Propose memory items via the action approval queue (human-in-the-loop)
    const proposals = facts.slice(0, 20).map((f: any) => ({
      agency_id, client_id,
      action_type: "create_ai_memory_item",
      title: `Add memory: ${f.title}`,
      description: `Proposed from ${source_type}:${source_id}`,
      payload: {
        agency_id, client_id,
        memory_type: f.memory_type,
        title: String(f.title).slice(0, 200),
        content: String(f.content).slice(0, 4000),
        source_type, source_id,
        confidence_score: typeof f.confidence === "number" ? f.confidence : 0.5,
        visibility: "internal_agency",
        is_active: true,
      },
      reasoning: `Extracted by ai-knowledge-ingest from ${source_type}:${source_id}`,
      risk_level: "low",
      status: "pending",
    }));
    if (proposals.length) {
      await svc.from("ai_action_requests").insert(proposals);
    }

    return jsonResponse({
      source_id: sourceRow.id,
      summary,
      facts_count: facts.length,
      proposals_queued: proposals.length,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
