// Generates a client strategy base from wizard inputs using Lovable AI.
// Returns: { summary, content_pillars[], suggested_kpis[], recommended_platforms[], initial_content_ideas[], monthly_reporting_focus }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name, niche, custom_niche, sells, services, target_audience, usp, tone_of_voice,
      competitors, objections, offers, notes, platforms,
    } = body || {};

    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const niceNiche = niche === "custom" && custom_niche ? `Custom: ${custom_niche}` : (niche || "unspecified");

    const userPrompt = `Build the initial strategy base for a new agency client.

Client: ${name}
Niche: ${niceNiche}
What they sell: ${sells || "—"}
Services / products: ${services || "—"}
Target audience: ${target_audience || "—"}
Unique selling points: ${usp || "—"}
Tone of voice: ${tone_of_voice || "—"}
Competitors: ${competitors || "—"}
Common objections: ${objections || "—"}
Offers / promotions: ${offers || "—"}
Active platforms: ${(platforms || []).join(", ") || "—"}
Notes: ${notes || "—"}`;

    const tools = [{
      type: "function",
      function: {
        name: "emit_strategy",
        description: "Return a structured strategy base for this client.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "3-5 sentence client summary." },
            content_pillars: { type: "array", items: { type: "string" }, description: "4-6 content pillars." },
            suggested_kpis: { type: "array", items: { type: "string" }, description: "5-8 KPIs to track." },
            recommended_platforms: { type: "array", items: { type: "string" } },
            initial_content_ideas: { type: "array", items: { type: "string" }, description: "8-12 concrete content ideas." },
            monthly_reporting_focus: { type: "array", items: { type: "string" }, description: "What the monthly report should highlight." },
          },
          required: ["summary", "content_pillars", "suggested_kpis", "recommended_platforms", "initial_content_ideas", "monthly_reporting_focus"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior marketing strategist for an agency. Be concrete, audience-aware, and avoid generic fluff. Use the niche to ground recommendations." },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_strategy" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await aiResp.json();
    const tc = j?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const strategy = JSON.parse(tc.function.arguments);

    return new Response(JSON.stringify({ strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-strategy-base error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
