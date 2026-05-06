// AI: Generate insights across all competitors of a client. Returns patterns, missed opportunities, original ideas.
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
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const { client_id } = await req.json();
    if (!client_id) return j({ error: "client_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: client } = await admin.from("clients").select("id,agency_id,name,niche,target_audience,tone_of_voice,brand_voice,objectives").eq("id", client_id).maybeSingle();
    if (!client) return j({ error: "Client not found" }, 404);

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", client.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return j({ error: "Forbidden" }, 403);

    const { data: comps } = await admin.from("competitors").select("id,name,niche,website").eq("client_id", client_id);
    const { data: obs } = await admin.from("competitor_observations").select("competitor_id,title,platform,content_type,hook,caption,offer,content_angle,estimated_performance,tags,observed_date").eq("client_id", client_id).order("observed_date", { ascending: false }).limit(200);

    const missing: string[] = [];
    if (!comps?.length) missing.push("No competitors added.");
    if (!obs?.length) missing.push("No observations recorded.");

    const sys = `You are a senior content strategist. RULES:
- Use ONLY the provided data. Do not invent metrics or facts. If data is missing, list it in missing_data.
- DO NOT copy competitor hooks, captions or offers verbatim. All ideas you propose must be ORIGINAL and differentiated.
- Original ideas must serve the client's niche, audience and tone.
- Be concise and specific.`;

    const ctx = {
      client: { name: client.name, niche: client.niche, target_audience: client.target_audience, tone: client.tone_of_voice || client.brand_voice, objectives: client.objectives },
      competitors: comps || [],
      observations: obs || [],
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Data:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "competitor_insights",
            parameters: {
              type: "object",
              properties: {
                patterns: { type: "array", items: { type: "string" } },
                common_content_types: { type: "array", items: { type: "string" } },
                missed_opportunities: { type: "array", items: { type: "string" } },
                differentiation_angles: { type: "array", items: { type: "string" } },
                original_ideas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      hook: { type: "string" },
                      angle: { type: "string" },
                      why_it_works: { type: "string" },
                    },
                    required: ["title", "hook", "angle", "why_it_works"],
                    additionalProperties: false,
                  },
                },
                missing_data: { type: "array", items: { type: "string" } },
              },
              required: ["patterns", "common_content_types", "missed_opportunities", "differentiation_angles", "original_ideas", "missing_data"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "competitor_insights" } },
      }),
    });

    if (aiRes.status === 429) return j({ error: "Rate limited. Try again in a minute." }, 429);
    if (aiRes.status === 402) return j({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
    if (!aiRes.ok) return j({ error: "AI gateway error" }, 500);

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* */ }
    parsed.missing_data = [...(parsed.missing_data || []), ...missing];
    return j(parsed, 200);
  } catch (e) {
    console.error("competitor-insights:", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: any, s: number) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
