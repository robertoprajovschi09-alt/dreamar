// AI assistant chat for the agency. Streams answers grounded in agency/client context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NICHE_TABLE: Record<string, { table: string; cols: string }> = {
  real_estate: { table: "niche_real_estate_properties", cols: "title,property_type,price,views,messages,viewings_booked,offers_received,sold" },
  restaurant:  { table: "niche_restaurant_items", cols: "name,category,reservations,orders,foot_traffic,events,best_dish,buying_intent_comments,estimated_sales_impact" },
  dental:      { table: "niche_dental_treatments", cols: "treatment,treatment_interest,qualified_leads,appointments_booked,patients_arrived,cost_per_appointment,conversion_status,objections" },
  fitness:     { table: "niche_fitness_offerings", cols: "name,offering_type,memberships_sold,trial_sessions,classes_promoted,trainer_content,transformations,messages_received,new_members_influenced" },
  custom:      { table: "niche_custom_metrics", cols: "label,value,unit,recorded_at,notes" },
};

const NICHE_LABEL: Record<string, string> = {
  real_estate: "real estate",
  restaurant: "restaurant / hospitality",
  dental: "dental clinic",
  fitness: "fitness / gym",
  custom: "custom niche",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { messages, client_id, agency_id } = await req.json();
    if (!Array.isArray(messages) || !agency_id) {
      return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let context = "";
    let nicheLabel = "";
    const { data: agency } = await supabase.from("agencies").select("name").eq("id", agency_id).maybeSingle();
    context += `Agency: ${agency?.name ?? "?"}\n`;

    if (client_id) {
      const { data: client } = await supabase.from("clients")
        .select("name,niche,city,objectives,notes,target_audience,tone_of_voice,competitors,brand_voice")
        .eq("id", client_id).maybeSingle();

      const [briefRes, goalsRes, vidsRes, postsRes, fbRes] = await Promise.all([
        supabase.from("client_briefs").select("business_description,main_objective,target_audience,unique_selling_points,brand_tone,content_dos,content_donts,preferred_platforms,posting_frequency,budget_range,extra_notes").eq("client_id", client_id).maybeSingle(),
        supabase.from("monthly_goals").select("month,objective,metric,target,progress,status,deadline").eq("client_id", client_id).order("month", { ascending: false }).limit(10),
        supabase.from("videos").select("hook,platform,format,publish_date,views,reach,likes,comments,shares,saves,calls,dms,completion_rate,estimated_sales_impact,recommendation,ai_score").eq("client_id", client_id).order("publish_date", { ascending: false, nullsFirst: false }).limit(10),
        supabase.from("content_posts").select("title,status,scheduled_for,platform,content_type,hook").eq("client_id", client_id).order("scheduled_for", { ascending: false, nullsFirst: false }).limit(10),
        supabase.from("client_feedback").select("month,calls_received,messages_received,bookings,sales_estimate,feedback_text,real_life_impact,objections,promote_next_month").eq("client_id", client_id).order("month", { ascending: false }).limit(3),
      ]);

      if (client) {
        nicheLabel = NICHE_LABEL[client.niche] || client.niche || "general";
        context += `\nClient: ${client.name} (${nicheLabel}${client.city ? ", " + client.city : ""})\n`;
        if (client.objectives) context += `Objectives: ${client.objectives}\n`;
        if (client.target_audience) context += `Audience: ${client.target_audience}\n`;
        if (client.tone_of_voice || client.brand_voice) context += `Tone: ${client.tone_of_voice || client.brand_voice}\n`;
        if (client.competitors) context += `Competitors: ${client.competitors}\n`;
        if (client.notes) context += `Notes: ${client.notes}\n`;

        // Niche-specific data
        const nicheCfg = NICHE_TABLE[client.niche];
        if (nicheCfg) {
          const { data: nicheRows } = await supabase.from(nicheCfg.table).select(nicheCfg.cols).eq("client_id", client_id).limit(20);
          if (nicheRows?.length) context += `\n${nicheLabel} data: ${JSON.stringify(nicheRows)}\n`;
        }
      }
      if (briefRes.data) context += `\nClient brief: ${JSON.stringify(briefRes.data)}\n`;
      if (goalsRes.data?.length) context += `\nMonthly goals: ${JSON.stringify(goalsRes.data)}\n`;
      context += `\nRecent videos (last 10): ${JSON.stringify(vidsRes.data || [])}\n`;
      context += `Recent content posts: ${JSON.stringify(postsRes.data || [])}\n`;
      if (fbRes.data?.length) context += `\nClient self-reported impact (last 3 months): ${JSON.stringify(fbRes.data)}\n`;
    } else {
      const { data: clients } = await supabase.from("clients").select("name,niche,city,status,objectives").eq("agency_id", agency_id).limit(50);
      context += `\nAll clients: ${JSON.stringify(clients || [])}\n`;
    }

    const systemPrompt = `You are an expert ${nicheLabel ? nicheLabel + " " : ""}social media strategist embedded inside a SaaS dashboard for marketing agencies. Help the agency analyze performance, propose hooks/scripts, plan content calendars, and answer questions. Use the provided CONTEXT as ground truth — never invent metrics. Be concise, structured (bullets when listing), and actionable. Respond in the user's language.

CONTEXT:
${context}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error: " + t.slice(0, 200) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
