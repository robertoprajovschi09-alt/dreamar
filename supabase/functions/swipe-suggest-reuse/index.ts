// AI: suggest where to reuse a swipe across the agency clients/platforms.
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

    const { swipe_id } = await req.json();
    if (!swipe_id) return j({ error: "swipe_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: sw } = await admin.from("swipe_files").select("*").eq("id", swipe_id).maybeSingle();
    if (!sw) return j({ error: "Not found" }, 404);

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", sw.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return j({ error: "Forbidden" }, 403);

    const { data: clients } = await admin.from("clients")
      .select("name,niche,platforms,target_audience").eq("agency_id", sw.agency_id).eq("status", "active").limit(50);

    const sys = `You suggest where an idea can be reused across an agency's portfolio. Use ONLY the provided clients. For each suggestion give the client name, best platform, and a one-line reason. Return at most 5 suggestions. If no good fit exists, return an empty list.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Swipe:\n${JSON.stringify({ title: sw.title, type: sw.type, niche: sw.niche, hook: sw.hook, content_angle: sw.content_angle }, null, 2)}\n\nClients:\n${JSON.stringify(clients || [], null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      client_name: { type: "string" },
                      platform: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
      }),
    });

    if (aiRes.status === 429) return j({ error: "Rate limited. Try again in a minute." }, 429);
    if (aiRes.status === 402) return j({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
    if (!aiRes.ok) return j({ error: "AI gateway error" }, 500);

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { suggestions: [] };
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* ignore */ }

    return j({ suggestions: parsed.suggestions || [] }, 200);
  } catch (e) {
    console.error("swipe-suggest-reuse:", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: any, s: number) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
