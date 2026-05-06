const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYTICS_COLS = ["platform","month","year","date_start","date_end","views","reach","impressions","likes","comments","shares","saves","engagement_rate","followers_start","followers_end","followers_gained","profile_visits","website_clicks","messages","calls","leads","bookings","sales","revenue","ad_spend","roas","cost_per_lead","cost_per_purchase","notes"];
const CONTENT_COLS = ["platform","views","reach","impressions","likes","comments","shares","saves","watch_time","average_view_duration","retention_rate","hook_rate","completion_rate","followers_gained","leads","sales","bookings","revenue","notes"];

const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { headers, target } = await req.json();
    if (!Array.isArray(headers) || !target) return json({ error: "headers + target required" }, 400);
    const cols = target === "content_metrics" ? CONTENT_COLS : ANALYTICS_COLS;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ mapping: {}, unmapped: headers });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `Map CSV headers to database columns. Available columns: ${cols.join(", ")}. Use empty string for headers that don't match any column.` },
          { role: "user", content: `Headers: ${JSON.stringify(headers)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_mapping",
            parameters: {
              type: "object",
              properties: {
                mapping: { type: "object", additionalProperties: { type: "string" } },
                unmapped: { type: "array", items: { type: "string" } },
              },
              required: ["mapping", "unmapped"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_mapping" } },
      }),
    });

    if (!resp.ok) return json({ mapping: {}, unmapped: headers });
    const data = await resp.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : { mapping: {}, unmapped: headers };
    return json(args);
  } catch (e: any) {
    return json({ error: e?.message }, 500);
  }
});
