// Generate AI recommendation for an existing health score row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { score_id } = await req.json();
    if (!score_id) return new Response(JSON.stringify({ error: "score_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: score, error } = await admin
      .from("client_health_scores").select("*, clients:client_id(name,niche,objectives)")
      .eq("id", score_id).maybeSingle();
    if (error || !score) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Authorization: caller must be agency member
    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", score.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const context = {
      client: score.clients,
      period: `${score.period_start} → ${score.period_end}`,
      total_score: score.total_score,
      status: score.score_status,
      components: {
        content_consistency: score.content_consistency_score,
        performance: score.performance_score,
        goal_progress: score.goal_progress_score,
        client_engagement: score.client_engagement_score,
        business_impact: score.business_impact_score,
      },
      missing_data: score.missing_data,
      breakdown: score.breakdown,
    };

    const systemPrompt = `You are a marketing agency analyst. Analyze a client's monthly health score and produce SHORT, ACTIONABLE insights.
RULES:
- Use ONLY the data provided. Never invent numbers, names, or events.
- If a component is in "missing_data", say explicitly that data is missing for that area and what the agency needs to log.
- Keep each list item under 120 characters. Be concrete.
- Do not repeat the score itself; explain what drove it.`;

    const userPrompt = `Client health score data:\n${JSON.stringify(context, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "report_health_insights",
            description: "Return structured insights on the client's health score.",
            parameters: {
              type: "object",
              properties: {
                why_this_score: { type: "string", description: "1-3 sentences explaining what drove the total score." },
                whats_working: { type: "array", items: { type: "string" } },
                whats_broken: { type: "array", items: { type: "string" } },
                next_month_actions: { type: "array", items: { type: "string" } },
              },
              required: ["why_this_score", "whats_working", "whats_broken", "next_month_actions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_health_insights" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any;
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); }
    catch { parsed = {}; }

    const { data: updated, error: upErr } = await admin
      .from("client_health_scores")
      .update({ ai_recommendation: parsed, ai_generated_at: new Date().toISOString() })
      .eq("id", score_id).select().single();
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ score: updated }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("health-score-recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
