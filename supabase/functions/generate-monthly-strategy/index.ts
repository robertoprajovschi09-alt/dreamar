// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "save_monthly_strategy",
    description: "Persist a structured next-month strategy. Use ONLY data provided in context; flag missing inputs in missing_data.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        strategy_title: { type: "string" },
        executive_summary: { type: "string" },
        key_insights: { type: "array", items: { type: "string" } },
        what_worked: { type: "array", items: { type: "string" } },
        what_did_not_work: { type: "array", items: { type: "string" } },
        content_to_repeat: { type: "array", items: { type: "string" } },
        content_to_stop: { type: "array", items: { type: "string" } },
        new_tests: { type: "array", items: { type: "string" } },
        recommended_hooks: { type: "array", items: { type: "string" } },
        recommended_content_formats: { type: "array", items: { type: "string" } },
        recommended_campaigns: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { name: { type: "string" }, goal: { type: "string" }, description: { type: "string" } },
            required: ["name", "goal", "description"],
          },
        },
        suggested_calendar_plan: {
          type: "object",
          additionalProperties: false,
          properties: {
            posts_per_week: { type: "number" },
            reels: { type: "number" },
            stories: { type: "number" },
            carousels: { type: "number" },
            campaigns: { type: "number" },
            key_dates: { type: "array", items: { type: "string" } },
            notes: { type: "string" },
          },
          required: ["posts_per_week", "reels", "stories", "carousels", "campaigns", "key_dates", "notes"],
        },
        business_focus: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        action_items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["title", "description", "priority"],
          },
        },
        missing_data: { type: "array", items: { type: "string" } },
      },
      required: [
        "strategy_title", "executive_summary", "key_insights", "what_worked", "what_did_not_work",
        "content_to_repeat", "content_to_stop", "new_tests", "recommended_hooks",
        "recommended_content_formats", "recommended_campaigns", "suggested_calendar_plan",
        "business_focus", "risks", "action_items", "missing_data",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { client_id, year, month } = await req.json();
    if (!client_id || !year || !month) {
      return new Response(JSON.stringify({ error: "Missing client_id, year, month" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify user is a member of this client's agency
    const { data: client } = await admin.from("clients").select("id, name, niche, agency_id, target_audience, brand_voice, tone_of_voice, objectives, competitors, services").eq("id", client_id).maybeSingle();
    if (!client) return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: membership } = await admin.from("agency_members").select("role").eq("agency_id", client.agency_id).eq("user_id", user.id).maybeSingle();
    if (!membership) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Determine "previous month" (the month BEFORE the strategy's target)
    const targetIdx = month - 1; // JS month index for target
    const prevDate = new Date(year, targetIdx - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevStart = new Date(prevYear, prevMonth - 1, 1).toISOString();
    const prevEndExclusive = new Date(year, targetIdx, 1).toISOString();
    const prevDateOnlyStart = prevStart.slice(0, 10);
    const prevDateOnlyEnd = prevEndExclusive.slice(0, 10);

    const [report, goals, posts, impact, feedback, health, risks, comps, swipes] = await Promise.all([
      admin.from("reports").select("*").eq("client_id", client_id).lte("period_start", prevEndExclusive).order("period_end", { ascending: false }).limit(1).maybeSingle(),
      admin.from("monthly_goals").select("*").eq("client_id", client_id).gte("month", prevDateOnlyStart).lt("month", prevDateOnlyEnd),
      admin.from("content_posts").select("id,title,platform,format,content_type,hook,status,scheduled_for,caption,assets").eq("client_id", client_id).gte("scheduled_for", prevStart).lt("scheduled_for", prevEndExclusive).limit(120),
      admin.from("business_impact_entries").select("*").eq("client_id", client_id).gte("entry_date", prevDateOnlyStart).lt("entry_date", prevDateOnlyEnd),
      admin.from("client_feedback").select("*").eq("client_id", client_id).gte("month", prevDateOnlyStart).lt("month", prevDateOnlyEnd),
      admin.from("client_health_scores").select("*").eq("client_id", client_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("client_risk_alerts").select("*").eq("client_id", client_id).eq("status", "active").limit(10),
      admin.from("competitor_observations").select("title,platform,hook,offer,content_angle,estimated_performance,notes,observed_date").eq("client_id", client_id).order("observed_date", { ascending: false }).limit(20),
      admin.from("swipe_files").select("title,platform,content_type,hook,why_it_works,niche,tags").eq("agency_id", client.agency_id).order("created_at", { ascending: false }).limit(20).then((r: any) => r).catch(() => ({ data: [] })),
    ]);

    const context = {
      client: {
        name: client.name, niche: client.niche, target_audience: client.target_audience,
        brand_voice: client.brand_voice, tone_of_voice: client.tone_of_voice,
        objectives: client.objectives, competitors: client.competitors, services: client.services,
      },
      previous_month: { year: prevYear, month: prevMonth },
      target_month: { year, month },
      latest_report: report.data || null,
      monthly_goals: goals.data || [],
      content_posts: posts.data || [],
      business_impact: impact.data || [],
      client_feedback: feedback.data || [],
      latest_health_score: health.data || null,
      active_risks: risks.data || [],
      competitor_observations: comps.data || [],
      relevant_swipe_files: (swipes as any).data || [],
    };

    const systemPrompt = `Ești un strateg senior de social media pentru o agenție. Generezi strategia pentru luna următoare a unui client, în limba română.
REGULI:
- Folosește DOAR datele din context. NU inventa cifre.
- Dacă o categorie de date lipsește (ex: nu există feedback sau impact business), adaug-o explicit în "missing_data".
- Adaptează tot conținutul la nișa clientului.
- Hook-urile, formatele și campaniile trebuie să fie concrete și acționabile.
- Action items trebuie să fie task-uri clare pentru echipă (nu generalități).
- suggested_calendar_plan trebuie să conțină numere realiste raportate la datele din luna trecută.`;

    const userPrompt = `Context client și luna trecută (JSON):\n\n${JSON.stringify(context, null, 2)}\n\nGenerează strategia pentru ${month}/${year}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "save_monthly_strategy" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Încearcă din nou." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Credit AI epuizat." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(tc.function.arguments);

    const upsertPayload = {
      agency_id: client.agency_id,
      client_id,
      month,
      year,
      based_on_report_id: report.data?.id || null,
      strategy_title: parsed.strategy_title,
      executive_summary: parsed.executive_summary,
      key_insights: parsed.key_insights,
      what_worked: parsed.what_worked,
      what_did_not_work: parsed.what_did_not_work,
      content_to_repeat: parsed.content_to_repeat,
      content_to_stop: parsed.content_to_stop,
      new_tests: parsed.new_tests,
      recommended_hooks: parsed.recommended_hooks,
      recommended_content_formats: parsed.recommended_content_formats,
      recommended_campaigns: parsed.recommended_campaigns,
      suggested_calendar_plan: parsed.suggested_calendar_plan,
      business_focus: parsed.business_focus,
      risks: parsed.risks,
      action_items: parsed.action_items,
      missing_data: parsed.missing_data,
      status: "generated",
      created_by: user.id,
    };

    const { data: saved, error: saveErr } = await admin
      .from("monthly_strategies")
      .upsert(upsertPayload, { onConflict: "client_id,year,month" })
      .select("id")
      .single();

    if (saveErr) {
      console.error("save err", saveErr);
      return new Response(JSON.stringify({ error: saveErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ id: saved.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fn error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
