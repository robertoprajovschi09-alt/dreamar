// AI risk analysis for a single alert. Stores narrative + recommended actions.
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

    const { alert_id } = await req.json();
    if (!alert_id) return new Response(JSON.stringify({ error: "alert_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: alert } = await admin.from("client_risk_alerts").select("*, clients:client_id(name,niche)").eq("id", alert_id).maybeSingle();
    if (!alert) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", alert.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Latest health score for context
    const { data: hs } = await admin.from("client_health_scores").select("total_score,score_status,breakdown,missing_data,period_start")
      .eq("client_id", alert.client_id).order("period_start", { ascending: false }).limit(1);

    const context = {
      client_name: alert.clients?.name,
      niche: alert.clients?.niche,
      risk_level: alert.risk_level,
      risk_score: alert.risk_score,
      risk_reasons: alert.risk_reasons,
      latest_health_score: hs?.[0] || null,
    };

    const systemPrompt = `You are a marketing agency strategist analyzing a client at risk of churn.
RULES:
- Use ONLY the data provided. Never invent numbers, names, or events.
- Be concrete and short. Each list item under 130 chars.
- Recovery plan items must be specific tasks the agency team can execute this week.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Client risk data:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_risk_analysis",
            description: "Return structured risk analysis and recovery plan.",
            parameters: {
              type: "object",
              properties: {
                why_at_risk: { type: "string" },
                whats_changed: { type: "string" },
                warning_signals: { type: "array", items: { type: "string" } },
                urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                agency_actions: { type: "array", items: { type: "string" } },
                recovery_plan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["title", "description", "priority"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["why_at_risk", "whats_changed", "warning_signals", "urgency", "agency_actions", "recovery_plan"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_risk_analysis" } },
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
    let parsed: any = {};
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* ignore */ }

    const summary = parsed.why_at_risk || alert.ai_summary;
    const { data: updated, error: upErr } = await admin.from("client_risk_alerts").update({
      ai_summary: summary,
      recommended_actions: parsed.recovery_plan || [],
      ai_generated_at: new Date().toISOString(),
      risk_reasons: alert.risk_reasons,
    }).eq("id", alert_id).select().single();
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ alert: updated, analysis: parsed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("risk-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
