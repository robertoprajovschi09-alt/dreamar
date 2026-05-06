import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { client_id, year, month } = await req.json();
    if (!client_id || !year || !month) return json({ error: "client_id, year, month required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(url, key, { global: { headers: { Authorization: auth } } });

    const [{ data: entries }, { data: metrics }, { data: posts }, { data: goals }] = await Promise.all([
      supa.from("analytics_entries").select("*").eq("client_id", client_id).eq("year", year).eq("month", month),
      supa.from("content_metrics").select("*").eq("client_id", client_id),
      supa.from("content_posts").select("id,title,platform,format,scheduled_for").eq("client_id", client_id),
      supa.from("monthly_goals").select("*").eq("client_id", client_id),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const system = `You are a marketing analytics expert. Analyze ONLY the provided data. Never invent numbers. If a metric is missing or zero across the dataset, mention it in missing_data instead of guessing. Output ONLY via the provided tool.`;

    const user = `Client analytics for ${year}-${String(month).padStart(2, "0")}:

ANALYTICS ENTRIES (period totals per platform):
${JSON.stringify(entries || [], null, 2)}

CONTENT METRICS (per-post performance):
${JSON.stringify(metrics || [], null, 2)}

CONTENT POSTS (titles for ranking):
${JSON.stringify(posts || [], null, 2)}

MONTHLY GOALS:
${JSON.stringify(goals || [], null, 2)}

Generate insights based strictly on this data.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "save_insights",
            description: "Save the analytics insights",
            parameters: {
              type: "object",
              properties: {
                best_platform: { type: ["string", "null"] },
                worst_platform: { type: ["string", "null"] },
                top_content: { type: "array", items: { type: "string" } },
                bottom_content: { type: "array", items: { type: "string" } },
                what_worked: { type: "array", items: { type: "string" } },
                what_dropped: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                next_month_focus: { type: "array", items: { type: "string" } },
                missing_data: { type: "array", items: { type: "string" } },
              },
              required: ["best_platform","worst_platform","top_content","bottom_content","what_worked","what_dropped","recommendations","next_month_focus","missing_data"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_insights" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) return json({ error: "AI gateway error", details: await resp.text() }, 500);

    const data = await resp.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) return json({ error: "AI returned no insights" }, 500);
    return json(args);
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
