// Generates a per-month Client Dashboard Context using Lovable AI.
// Input: { client_id: uuid, year?: number, month?: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const truncate = (s: any, n = 4000) =>
  typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s;

const stripPii = (s: any) => {
  if (typeof s !== "string") return s;
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({}));
    const client_id = body?.client_id;
    if (typeof client_id !== "string" || !/^[0-9a-f-]{36}$/i.test(client_id)) {
      return json(400, { error: "Invalid client_id" });
    }
    const now = new Date();
    const year = Number.isFinite(body?.year) ? Number(body.year) : now.getUTCFullYear();
    const month = Number.isFinite(body?.month) ? Number(body.month) : now.getUTCMonth() + 1;
    if (year < 2020 || year > 2100 || month < 1 || month > 12) {
      return json(400, { error: "Invalid year/month" });
    }

    // Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const uid = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load client to get agency_id, then verify caller is either an agency member or a client viewer
    const { data: clientRow, error: cErr } = await admin
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .maybeSingle();
    if (cErr || !clientRow) return json(404, { error: "Client not found" });
    const agency_id: string = clientRow.agency_id;

    const [{ data: am }, { data: cu }] = await Promise.all([
      admin.from("agency_members").select("user_id").eq("agency_id", agency_id).eq("user_id", uid).maybeSingle(),
      admin.from("client_users").select("user_id").eq("client_id", client_id).eq("user_id", uid).eq("status", "active").maybeSingle(),
    ]);
    if (!am && !cu) return json(403, { error: "Forbidden" });

    // Period range
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const since60 = new Date(periodStart.getTime() - 60 * 86400_000);
    const since90 = new Date(periodStart.getTime() - 90 * 86400_000);
    const upcoming30 = new Date(nextMonth.getTime() + 30 * 86400_000);

    // Parallel data fan-out (service role; scoped to client_id/agency_id)
    const [
      schemaRes,
      platformsRes,
      goalsRes,
      postsRes,
      analyticsRes,
      reportsRes,
      docsRes,
      impactRes,
      feedbackRes,
      checkinRes,
      competitorsRes,
      swipeRes,
      memoryRes,
    ] = await Promise.all([
      admin.from("client_kpi_schemas").select("*").eq("client_id", client_id).maybeSingle(),
      admin.from("client_platforms").select("*").eq("client_id", client_id),
      admin.from("monthly_goals").select("*").eq("client_id", client_id).order("month", { ascending: false }).limit(8),
      admin.from("content_posts")
        .select("id,title,platform,content_type,status,scheduled_for,hook,caption")
        .eq("client_id", client_id)
        .gte("scheduled_for", since60.toISOString())
        .lte("scheduled_for", upcoming30.toISOString())
        .order("scheduled_for", { ascending: false })
        .limit(60),
      admin.from("analytics_entries").select("*").eq("client_id", client_id).gte("date_start", since90.toISOString().slice(0, 10)).order("date_start", { ascending: false }).limit(20),
      admin.from("reports").select("id,title,summary,period_start,period_end,created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(3),
      admin.from("documents").select("id,name,folder,visibility,created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(20),
      admin.from("business_impact_entries").select("*").eq("client_id", client_id).gte("entry_date", since90.toISOString().slice(0, 10)).order("entry_date", { ascending: false }).limit(60),
      admin.from("client_feedback").select("*").eq("client_id", client_id).order("created_at", { ascending: false }).limit(3),
      admin.from("client_checkins").select("*").eq("client_id", client_id).eq("year", year).eq("month", month).maybeSingle(),
      admin.from("competitor_observations").select("id,competitor_name,observation,created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(10).then(r => r, () => ({ data: [] as any[] })),
      admin.from("swipe_files").select("id,title,why_it_works,niche,tags").eq("agency_id", agency_id).order("created_at", { ascending: false }).limit(10).then(r => r, () => ({ data: [] as any[] })),
      admin.from("ai_memory").select("title,content,kind,scope").eq("agency_id", agency_id).or(`client_id.eq.${client_id},client_id.is.null`).order("updated_at", { ascending: false }).limit(20).then(r => r, () => ({ data: [] as any[] })),
    ]);

    const ctx = {
      client: {
        name: clientRow.name,
        niche: clientRow.niche,
        custom_niche_name: clientRow.custom_niche_name,
        city: clientRow.city,
        services: truncate(clientRow.services_offered, 1000),
        target_audience: truncate(clientRow.target_audience, 1000),
        brand_tone: clientRow.brand_tone,
        unique_selling_points: truncate(clientRow.unique_selling_points, 1000),
      },
      kpi_schema: {
        kpi_fields: (schemaRes.data?.kpi_fields as any[]) || [],
        business_impact_fields: (schemaRes.data?.business_impact_fields as any[]) || [],
      },
      platforms: (platformsRes.data || []).map((p: any) => ({ platform: p.platform, objective: p.objective, posting_frequency: p.posting_frequency })),
      goals: (goalsRes.data || []).map((g: any) => ({ month: g.month, objective: g.objective, metric: g.metric, target: g.target, status: g.status })),
      content_calendar: (postsRes.data || []).map((p: any) => ({
        id: p.id, title: truncate(p.title, 120), platform: p.platform, type: p.content_type, status: p.status,
        scheduled_for: p.scheduled_for, hook: truncate(p.hook, 200),
      })),
      analytics: (analyticsRes.data || []).map((a: any) => ({
        platform: a.platform, period_type: a.period_type, date_start: a.date_start, date_end: a.date_end,
        reach: a.reach, impressions: a.impressions, engagement_rate: a.engagement_rate,
        followers_end: a.followers_end, followers_gained: a.followers_gained,
        leads: a.leads, sales: a.sales, revenue: a.revenue, calls: a.calls, messages: a.messages,
      })),
      reports: (reportsRes.data || []).map((r: any) => ({ title: r.title, summary: truncate(r.summary, 800), period_start: r.period_start, period_end: r.period_end })),
      documents: (docsRes.data || []).filter((d: any) => d.visibility === "client_visible").map((d: any) => ({ name: d.name, folder: d.folder })),
      business_impact: (impactRes.data || []).map((b: any) => ({
        entry_date: b.entry_date, calls: b.calls, dms: b.dms, bookings: b.bookings, appointments: b.appointments,
        sales: b.sales, orders: b.orders, viewings: b.viewings, contracts: b.contracts, revenue_estimate: b.revenue_estimate,
        feedback: stripPii(truncate(b.qualitative_feedback, 400)),
      })),
      feedback_history: (feedbackRes.data || []).map((f: any) => ({
        month: f.month, calls: f.calls_received, messages: f.messages_received, bookings: f.bookings, sales_estimate: f.sales_estimate,
        feedback_text: stripPii(truncate(f.feedback_text, 600)),
        real_life_impact: stripPii(truncate(f.real_life_impact, 600)),
        promote_next_month: truncate(f.promote_next_month, 300),
      })),
      current_checkin: checkinRes.data ? {
        main_priority: checkinRes.data.main_priority,
        priority_custom: checkinRes.data.priority_custom,
        promoted_focus: checkinRes.data.promoted_focus,
        observed_real_results: checkinRes.data.observed_real_results,
        real_results_data: checkinRes.data.real_results_data,
        customer_feedback: stripPii(truncate(checkinRes.data.customer_feedback, 600)),
        important_notes: stripPii(truncate(checkinRes.data.important_notes, 600)),
        satisfaction_score: checkinRes.data.satisfaction_score,
        requested_direction_change: checkinRes.data.requested_direction_change,
        direction_change_custom: checkinRes.data.direction_change_custom,
      } : null,
      competitors: (competitorsRes.data || []).map((c: any) => ({ name: c.competitor_name, note: truncate(c.observation, 400) })),
      swipe_files: (swipeRes.data || []).map((s: any) => ({ title: s.title, why_it_works: truncate(s.why_it_works, 300), niche: s.niche })),
      ai_memory: (memoryRes.data || []).map((m: any) => ({ kind: m.kind, title: m.title, content: truncate(m.content, 400) })),
      period: { year, month },
    };

    const nicheGuidance =
      clientRow.niche === "hospitality"
        ? `\nNICHE GUIDANCE — hospitality (hotels, B&Bs, boutique hotels, resorts, villas, Airbnb, glamping, retreats, event venues with accommodation):
- Frame insights around bookings, reservation requests, occupancy/availability impact, room/package interest, guest messages, and reviews.
- Identify which content drives booking inquiries, which packages/rooms attract interest, which low-occupancy periods need promotion, and which reviews can become content (UGC/testimonial).
- Suggest seasonal campaigns to test and CTAs that lift DIRECT bookings (vs OTA dependence).
- If bookings, occupancy_rate, or revenue are missing, add explicit entries to missing_data — never invent them.`
        : "";

    const systemPrompt = `You are an analyst that builds a per-month "Client Dashboard Context" for a marketing agency portal.
LANGUAGE RULE (MANDATORY): The ENTIRE output (generated_summary, ai_priorities title+why, recommended_widgets titles, missing_data field+where_to_fill, client_friendly_insights title+body_plain_language, agency_internal_notes) MUST be in ROMANIAN (limba română). Tone: simple, plain, no jargon, no English words, no agency lingo. Use diacritics (ă, â, î, ș, ț). NEVER output English.
Rules you MUST follow:
- Use ONLY the data provided. Do NOT invent metrics, numbers, dates, or facts.
- If a number/metric is missing, do not guess. Add an explicit entry to "missing_data" describing what is missing and where it could be filled — in Romanian.
- "client_friendly_insights" must be plain Romanian addressed directly to the business owner (tu/dvs).
- "agency_internal_notes" can be more technical but still in Romanian.
- "ai_priorities" must reflect the client's current_checkin priority and promoted_focus when present.
- "recommended_widgets" maps to KPI keys present in kpi_schema.kpi_fields or kpi_schema.business_impact_fields ONLY (the "key" field stays as the schema key; only "title" is translated).
- confidence_score in [0,1] reflects how grounded the output is in the supplied data.${nicheGuidance}
Return STRICT JSON matching the requested schema. No prose outside JSON.`;

    const userPrompt = `Build the dashboard context for this client (year=${year}, month=${month}).

CLIENT CONTEXT JSON:
${JSON.stringify(ctx).slice(0, 24000)}

Return JSON with this exact shape:
{
  "generated_summary": "2-4 sentences plain language",
  "ai_priorities": [{"title":"...","why":"...","owner":"agency"|"client"}],
  "recommended_widgets": [{"key":"<kpi key from schema>","title":"...","props":{}}],
  "missing_data": [{"field":"...","where_to_fill":"...","blocks":"summary"|"kpi"|"insight"}],
  "client_friendly_insights": [{"title":"...","body_plain_language":"...","tone":"good"|"neutral"|"warning"}],
  "agency_internal_notes": "string",
  "confidence_score": 0.0
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json(429, { error: "Rate limit hit. Try again shortly." });
      if (aiRes.status === 402) return json(402, { error: "AI credits exhausted." });
      return json(502, { error: "AI gateway error", detail: txt.slice(0, 500) });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const cap = (s: any, n: number) => (typeof s === "string" && s.length > n ? s.slice(0, n) : s);
    const arr = (v: any) => (Array.isArray(v) ? v.slice(0, 12) : []);
    const context = {
      generated_summary: cap(parsed.generated_summary, 2000) || null,
      ai_priorities: arr(parsed.ai_priorities),
      recommended_widgets: arr(parsed.recommended_widgets),
      missing_data: arr(parsed.missing_data),
      client_friendly_insights: arr(parsed.client_friendly_insights),
      agency_internal_notes: cap(parsed.agency_internal_notes, 4000) || null,
      confidence_score: typeof parsed.confidence_score === "number"
        ? Math.max(0, Math.min(1, parsed.confidence_score)) : null,
    };

    // Persist AI output
    const { data: outRow } = await admin.from("ai_outputs").insert({
      agency_id, client_id, user_id: uid,
      feature: "client_dashboard_context",
      model: "google/gemini-2.5-flash",
      input_payload: { year, month },
      output_json: context,
      status: "success",
      missing_data: context.missing_data,
      confidence_score: context.confidence_score ?? undefined,
    }).select("id").maybeSingle().then(r => r, () => ({ data: null }));

    // Upsert dashboard context
    const { data: stored, error: upErr } = await admin
      .from("client_dashboard_contexts")
      .upsert({
        agency_id, client_id, year, month,
        generated_summary: context.generated_summary,
        ai_priorities: context.ai_priorities,
        recommended_widgets: context.recommended_widgets,
        missing_data: context.missing_data,
        client_friendly_insights: context.client_friendly_insights,
        agency_internal_notes: context.agency_internal_notes,
        confidence_score: context.confidence_score,
        generated_by_ai_output_id: outRow?.id ?? null,
      }, { onConflict: "client_id,year,month" })
      .select("*")
      .maybeSingle();

    if (upErr) return json(500, { error: "Persist failed", detail: upErr.message });

    // Mark check-in processed
    if (checkinRes.data) {
      await admin.from("client_checkins").update({ ai_processed: true }).eq("id", checkinRes.data.id);
    }

    return json(200, { context: stored });
  } catch (e) {
    return json(500, { error: "Unexpected", detail: String((e as Error).message || e) });
  }
});
