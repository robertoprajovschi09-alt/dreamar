// AI: explain why a swipe worked. Stores why_it_worked.
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
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { swipe_id } = await req.json();
    if (!swipe_id) return json({ error: "swipe_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: sw } = await admin.from("swipe_files").select("*").eq("id", swipe_id).maybeSingle();
    if (!sw) return json({ error: "Not found" }, 404);

    const { data: m } = await admin.from("agency_members").select("user_id").eq("agency_id", sw.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: prof } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!m && !prof?.is_saas_admin) return json({ error: "Forbidden" }, 403);

    const sys = `You analyze marketing content for an agency. RULES:
- Use ONLY the data provided. If data is missing, say so explicitly. Never invent metrics.
- Be concise. 4-6 bullet sentences max.
- Focus on hook structure, emotional driver, format, audience, and call-to-action.`;

    const ctx = {
      title: sw.title, type: sw.type, platform: sw.platform, niche: sw.niche,
      hook: sw.hook, script: sw.script, caption: sw.caption,
      content_angle: sw.content_angle, content_format: sw.content_format,
      performance_notes: sw.performance_notes,
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Swipe data:\n${JSON.stringify(ctx, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "explain_swipe",
            parameters: {
              type: "object",
              properties: { why_it_worked: { type: "string" } },
              required: ["why_it_worked"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "explain_swipe" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limited. Try again in a minute." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
    if (!aiRes.ok) return json({ error: "AI gateway error" }, 500);

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* ignore */ }
    const why = parsed.why_it_worked || "";

    if (why) await admin.from("swipe_files").update({ why_it_worked: why }).eq("id", swipe_id);

    return json({ why_it_worked: why }, 200);
  } catch (e) {
    console.error("swipe-analyze:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: any, s: number) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
