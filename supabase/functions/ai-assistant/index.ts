// AI assistant chat for the agency. Streams answers grounded in agency/client context.
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { messages, client_id, agency_id } = await req.json();
    if (!Array.isArray(messages) || !agency_id) {
      return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build context
    let context = "";
    const { data: agency } = await supabase.from("agencies").select("name").eq("id", agency_id).maybeSingle();
    context += `Agency: ${agency?.name ?? "?"}\n`;

    if (client_id) {
      const [{ data: client }, { data: vids }, { data: posts }] = await Promise.all([
        supabase.from("clients").select("name,niche,city,goals,notes").eq("id", client_id).maybeSingle(),
        supabase.from("videos").select("title,views,reach,likes,comments,shares,saves,sales_value,published_at").eq("client_id", client_id).order("published_at", { ascending: false }).limit(10),
        supabase.from("content_posts").select("title,status,scheduled_for,platform").eq("client_id", client_id).order("scheduled_for", { ascending: false }).limit(10),
      ]);
      if (client) {
        context += `\nClient: ${client.name} (${client.niche}${client.city ? ", " + client.city : ""})\n`;
        if (client.goals) context += `Goals: ${client.goals}\n`;
        if (client.notes) context += `Notes: ${client.notes}\n`;
      }
      context += `\nRecent videos (last 10): ${JSON.stringify(vids || [])}\n`;
      context += `Recent posts (last 10): ${JSON.stringify(posts || [])}\n`;
    } else {
      const { data: clients } = await supabase.from("clients").select("name,niche,city,status").eq("agency_id", agency_id).limit(50);
      context += `\nAll clients: ${JSON.stringify(clients || [])}\n`;
    }

    const systemPrompt = `You are an expert social media strategist embedded inside a SaaS dashboard. Help the agency analyze performance, propose hooks/scripts, plan content calendars, and answer questions. Use the provided CONTEXT as ground truth. Be concise, structured (bullets when listing), and actionable. Respond in the user's language.

CONTEXT:
${context}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
