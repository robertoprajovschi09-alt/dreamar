// Generates a monthly AI report for a client based on their performance data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { client_id, period_start, period_end } = body;
    if (!client_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client, error: cErr } = await supabase.from("clients").select("*").eq("id", client_id).maybeSingle();
    if (cErr || !client) throw new Error("Client not found");

    const [{ data: posts }, { data: videos }, { data: tasks }, { data: campaigns }] = await Promise.all([
      supabase.from("content_posts").select("title,platform,status,scheduled_for,published_at").eq("client_id", client_id).gte("scheduled_for", period_start).lte("scheduled_for", period_end + "T23:59:59"),
      supabase.from("videos").select("title,platform,views,reach,likes,comments,shares,saves,sales_count,sales_value,calls_booked,dms_received,published_at").eq("client_id", client_id).gte("published_at", period_start).lte("published_at", period_end),
      supabase.from("tasks").select("title,status,priority").eq("client_id", client_id),
      supabase.from("campaigns").select("name,status,objective,budget").eq("client_id", client_id),
    ]);

    const totals = (videos || []).reduce((acc: any, v: any) => {
      acc.views += v.views || 0;
      acc.reach += v.reach || 0;
      acc.likes += v.likes || 0;
      acc.comments += v.comments || 0;
      acc.shares += v.shares || 0;
      acc.saves += v.saves || 0;
      acc.sales_value += Number(v.sales_value || 0);
      acc.sales_count += v.sales_count || 0;
      acc.calls += v.calls_booked || 0;
      acc.dms += v.dms_received || 0;
      return acc;
    }, { views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, sales_value: 0, sales_count: 0, calls: 0, dms: 0 });

    const engagementRate = totals.reach > 0
      ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.reach) * 100
      : 0;

    const metrics = {
      ...totals,
      engagement_rate: Number(engagementRate.toFixed(2)),
      videos_count: videos?.length ?? 0,
      posts_count: posts?.length ?? 0,
    };

    const sysPrompt = `You are a senior social media strategist generating a concise monthly client report in the same language as the client's notes (default English). Output ONLY valid JSON matching the requested tool schema. Be specific, data-driven, and actionable.`;

    const userPrompt = `Client: ${client.name}
Niche: ${client.niche}
City: ${client.city || "n/a"}
Period: ${period_start} → ${period_end}

Metrics: ${JSON.stringify(metrics)}
Top videos: ${JSON.stringify((videos || []).slice(0, 5))}
Posts published: ${posts?.length ?? 0}
Active campaigns: ${JSON.stringify(campaigns || [])}
Open tasks: ${(tasks || []).filter((t: any) => t.status !== "done").length}

Generate a monthly report with: an executive summary (3-4 sentences), 3-5 highlights (wins this period), and 3-5 recommendations (concrete next-month actions).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_report",
            description: "Returns the structured monthly report.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                highlights: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "highlights", "recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_report" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};

    return new Response(JSON.stringify({
      summary: args.summary || "",
      highlights: args.highlights || [],
      recommendations: args.recommendations || [],
      metrics,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-report error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
