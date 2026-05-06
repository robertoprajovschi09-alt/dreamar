// AI: Compare multiple competitors side-by-side.
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

    const { client_id, competitor_ids } = await req.json();
    if (!client_id || !Array.isArray(competitor_ids) || competitor_ids.length < 2) return j({ error: "client_id and at least 2 competitor_ids required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: client } = await admin.from("clients").select("id,agency_id,name,niche").eq("id", client_id).maybeSingle();
    if (!client) return j({ error: "Client not found" }, 404);

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", client.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return j({ error: "Forbidden" }, 403);

    const { data: comps } = await admin.from("competitors").select("id,name,niche,website").in("id", competitor_ids).eq("client_id", client_id);
    const { data: obs } = await admin.from("competitor_observations").select("competitor_id,title,platform,content_type,hook,offer,content_angle,estimated_performance,observed_date").in("competitor_id", competitor_ids).order("observed_date", { ascending: false }).limit(300);

    const grouped = (comps || []).map((c: any) => ({
      competitor: c,
      observations: (obs || []).filter((o: any) => o.competitor_id === c.id),
    }));

    const sys = `You compare marketing competitors. RULES:
- Use ONLY data provided. Do not invent numbers.
- Do not copy hooks/offers verbatim.
- Be concise. Each list item should be a short sentence.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Client: ${client.name} (${client.niche || "n/a"})\n\nCompetitors:\n${JSON.stringify(grouped, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "compare",
            parameters: {
              type: "object",
              properties: {
                rows: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      competitor_name: { type: "string" },
                      strengths: { type: "array", items: { type: "string" } },
                      weaknesses: { type: "array", items: { type: "string" } },
                      content_mix: { type: "array", items: { type: "string" } },
                    },
                    required: ["competitor_name", "strengths", "weaknesses", "content_mix"],
                    additionalProperties: false,
                  },
                },
                adopt: { type: "array", items: { type: "string" } },
                avoid: { type: "array", items: { type: "string" } },
              },
              required: ["rows", "adopt", "avoid"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compare" } },
      }),
    });

    if (aiRes.status === 429) return j({ error: "Rate limited. Try again in a minute." }, 429);
    if (aiRes.status === 402) return j({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
    if (!aiRes.ok) return j({ error: "AI gateway error" }, 500);

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { rows: [], adopt: [], avoid: [] };
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* */ }
    return j(parsed, 200);
  } catch (e) {
    console.error("competitor-compare:", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: any, s: number) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
