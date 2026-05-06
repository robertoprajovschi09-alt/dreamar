// Personalize the client dashboard via Lovable AI Gateway.
// Reads agency-curated data + recent activity, emits a small JSON
// stored on clients.ai_strategy_base.dashboard_personalization.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.client_id;
    if (!clientId) return json({ error: "client_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization check: must be agency member or active client_user for this client
    const { data: client } = await admin.from("clients").select("*").eq("id", clientId).maybeSingle();
    if (!client) return json({ error: "Client not found" }, 404);

    const [{ data: member }, { data: cu }] = await Promise.all([
      admin.from("agency_members").select("id").eq("user_id", u.user.id).eq("agency_id", client.agency_id).maybeSingle(),
      admin.from("client_users").select("id").eq("user_id", u.user.id).eq("client_id", clientId).eq("status", "active").maybeSingle(),
    ]);
    if (!member && !cu) return json({ error: "Forbidden" }, 403);

    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const since90 = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);

    const [{ data: kpiSchema }, { data: platforms }, { data: goals }, { data: brief }, { data: impact }, { data: analytics }] = await Promise.all([
      admin.from("client_kpi_schemas").select("*").eq("client_id", clientId).maybeSingle(),
      admin.from("client_platforms").select("platform,handle,starting_followers,objective").eq("client_id", clientId),
      admin.from("monthly_goals").select("month,objective,metric,target").eq("client_id", clientId).order("month", { ascending: false }).limit(6),
      admin.from("client_briefs").select("main_objective,content_donts,extra_notes,target_audience,brand_tone,unique_selling_points").eq("client_id", clientId).maybeSingle(),
      admin.from("business_impact_entries").select("entry_date,calls,dms,bookings,sales,revenue_estimate,qualitative_feedback").eq("client_id", clientId).gte("entry_date", since30).order("entry_date", { ascending: false }),
      admin.from("analytics_entries").select("platform,period_type,date_start,date_end,reach,impressions,engagement_rate,followers_end,leads,sales,revenue").eq("client_id", clientId).gte("date_start", since90).order("date_start", { ascending: false }).limit(40),
    ]);

    const context = {
      client: {
        name: client.name, niche: client.niche, custom_niche: client.custom_niche,
        target_audience: client.target_audience, brand_voice: client.brand_voice,
        tone_of_voice: client.tone_of_voice, services: client.services, status: client.status,
      },
      kpi_schema: kpiSchema ? {
        niche_key: (kpiSchema as any).niche_key,
        kpi_fields: (kpiSchema as any).kpi_fields,
        business_impact_fields: (kpiSchema as any).business_impact_fields,
      } : null,
      platforms, goals, brief,
      recent_business_impact: impact,
      recent_analytics: analytics,
    };

    const system = `You are a senior marketing strategist personalizing a client dashboard.
Rules:
- NEVER invent metric values. If a value is missing, list the field key in "missing_data" and write the body so it asks the agency to log that data.
- Pick "priority_metrics" ONLY from kpi_schema.kpi_fields[].key. Choose 3 most relevant for this niche and the client's stated goals.
- Keep all copy tight and concrete. No filler. No emojis.
- Return valid JSON only matching the requested shape.`;

    const user = `Personalize for this client. Output JSON shape:
{
  "greeting": string,
  "niche_focus": string,
  "priority_metrics": string[],
  "insight_cards": [{"title": string, "body": string, "severity": "info"|"good"|"warning", "missing_data": string[]}],
  "next_actions": [{"label": string, "why": string}]
}

Context:
${JSON.stringify(context).slice(0, 14000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: "AI gateway error", detail: txt }, aiRes.status === 429 ? 429 : 502);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const personalization = {
      ...parsed,
      generated_at: new Date().toISOString(),
    };

    const existingBase = (client.ai_strategy_base as any) || {};
    const newBase = { ...existingBase, dashboard_personalization: personalization };
    await admin.from("clients").update({ ai_strategy_base: newBase }).eq("id", clientId);

    return json({ personalization });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
