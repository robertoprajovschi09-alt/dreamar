// Generates a monthly AI report for a client based on their performance data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NICHE_TABLE: Record<string, { table: string; cols: string }> = {
  real_estate: { table: "niche_real_estate_properties", cols: "title,property_type,price,views,messages,viewings_booked,offers_received,sold" },
  restaurant:  { table: "niche_restaurant_items", cols: "name,category,reservations,orders,foot_traffic,events,best_dish,buying_intent_comments,estimated_sales_impact" },
  dental:      { table: "niche_dental_treatments", cols: "treatment,treatment_interest,qualified_leads,appointments_booked,patients_arrived,cost_per_appointment,conversion_status" },
  fitness:     { table: "niche_fitness_offerings", cols: "name,offering_type,memberships_sold,trial_sessions,classes_promoted,trainer_content,transformations,messages_received,new_members_influenced" },
  custom:      { table: "niche_custom_metrics", cols: "label,value,unit,recorded_at,notes" },
};
const NICHE_LABEL: Record<string, string> = {
  real_estate: "real estate", restaurant: "restaurant", dental: "dental clinic", fitness: "fitness / gym", custom: "custom",
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

    const { client_id, period_start, period_end } = await req.json();
    if (!client_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: client, error: cErr } = await supabase.from("clients").select("*").eq("id", client_id).maybeSingle();
    if (cErr || !client) throw new Error("Client not found");
    const niche = client.niche;
    const nicheLabel = NICHE_LABEL[niche] || niche || "general";

    const [postsRes, videosRes, tasksRes, campaignsRes, briefRes, goalsRes, fbRes] = await Promise.all([
      supabase.from("content_posts").select("title,platform,status,scheduled_for,content_type").eq("client_id", client_id).gte("scheduled_for", period_start).lte("scheduled_for", period_end + "T23:59:59"),
      supabase.from("videos").select("hook,platform,format,publish_date,views,reach,likes,comments,shares,saves,calls,dms,completion_rate,estimated_sales_impact,recommendation").eq("client_id", client_id).gte("publish_date", period_start).lte("publish_date", period_end),
      supabase.from("tasks").select("title,status,priority").eq("client_id", client_id),
      supabase.from("campaigns").select("name,status,objective,budget").eq("client_id", client_id),
      supabase.from("client_briefs").select("business_description,main_objective,target_audience,unique_selling_points,brand_tone").eq("client_id", client_id).maybeSingle(),
      supabase.from("monthly_goals").select("objective,metric,target,progress,status").eq("client_id", client_id).gte("month", period_start.slice(0,7) + "-01"),
      supabase.from("client_feedback").select("month,calls_received,messages_received,bookings,sales_estimate,feedback_text,real_life_impact").eq("client_id", client_id).gte("month", period_start),
    ]);

    const videos = videosRes.data || [];
    const totals = videos.reduce((acc: any, v: any) => {
      acc.views += Number(v.views || 0);
      acc.reach += Number(v.reach || 0);
      acc.likes += v.likes || 0;
      acc.comments += v.comments || 0;
      acc.shares += v.shares || 0;
      acc.saves += v.saves || 0;
      acc.calls += v.calls || 0;
      acc.dms += v.dms || 0;
      acc.estimated_sales += Number(v.estimated_sales_impact || 0);
      return acc;
    }, { views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, calls: 0, dms: 0, estimated_sales: 0 });

    const engagementRate = totals.reach > 0
      ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.reach) * 100 : 0;

    const metrics = {
      ...totals,
      engagement_rate: Number(engagementRate.toFixed(2)),
      videos_count: videos.length,
      posts_count: postsRes.data?.length ?? 0,
    };

    // Niche-specific data
    let nicheData: any[] = [];
    const nicheCfg = NICHE_TABLE[niche];
    if (nicheCfg) {
      const { data } = await supabase.from(nicheCfg.table).select(nicheCfg.cols).eq("client_id", client_id).limit(20);
      nicheData = data || [];
    }

    const sysPrompt = `You are a senior ${nicheLabel} social media strategist generating a concise monthly client report. Output ONLY valid JSON via the requested tool. Be specific, data-driven, actionable. Reference the client's niche specifics. Default language: same as client notes/objectives, else English.`;

    const userPrompt = `Client: ${client.name}
Niche: ${nicheLabel}
City: ${client.city || "n/a"}
Objectives (from profile): ${client.objectives || "n/a"}
${briefRes.data ? `Brief: ${JSON.stringify(briefRes.data)}` : ""}
${goalsRes.data?.length ? `Monthly goals: ${JSON.stringify(goalsRes.data)}` : ""}
Period: ${period_start} → ${period_end}

Aggregate metrics: ${JSON.stringify(metrics)}
Top videos (up to 5): ${JSON.stringify(videos.slice(0, 5))}
Posts published: ${postsRes.data?.length ?? 0}
Active campaigns: ${JSON.stringify(campaignsRes.data || [])}
Open tasks: ${(tasksRes.data || []).filter((t: any) => t.status !== "done").length}
${nicheData.length ? `Niche-specific items (${nicheLabel}): ${JSON.stringify(nicheData)}` : ""}
${fbRes.data?.length ? `Client self-reported impact: ${JSON.stringify(fbRes.data)}` : ""}

Generate a monthly report with: an executive summary (3-4 sentences), 3-5 highlights (concrete wins this period), and 3-5 recommendations (concrete next-month actions tailored to the ${nicheLabel} niche).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }],
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
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error: " + t.slice(0, 200) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
