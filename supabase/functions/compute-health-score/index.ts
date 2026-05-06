// Compute Client Health Score for a given client + month/year.
// Deterministic, server-side. Stores result in client_health_scores (upsert).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n * 100) / 100;

function statusFor(score: number): string {
  if (score < 40) return "critical";
  if (score < 60) return "at_risk";
  if (score < 80) return "healthy";
  return "excellent";
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const client_id: string | undefined = body.client_id;
    const now = new Date();
    const month: number = body.month ?? (now.getUTCMonth() + 1);
    const year: number = body.year ?? now.getUTCFullYear();
    if (!client_id || month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is a member of the client's agency
    const { data: clientRow, error: clientErr } = await admin
      .from("clients").select("id, agency_id, name, niche").eq("id", client_id).maybeSingle();
    if (clientErr || !clientRow) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: membership } = await admin
      .from("agency_members").select("user_id").eq("agency_id", clientRow.agency_id).eq("user_id", user.id).maybeSingle();
    const { data: profile } = await admin.from("profiles").select("is_saas_admin").eq("id", user.id).maybeSingle();
    if (!membership && !profile?.is_saas_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { start, end } = monthRange(year, month);
    const prev = monthRange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const prevStartISO = prev.start.toISOString();
    const prevEndISO = prev.end.toISOString();
    const startDate = startISO.slice(0, 10);
    const endDate = endISO.slice(0, 10);
    const prevStartDate = prevStartISO.slice(0, 10);
    const prevEndDate = prevEndISO.slice(0, 10);

    const missing: string[] = [];
    const breakdown: Record<string, unknown> = {};

    // ---------- A) Content Consistency (20%) ----------
    const { data: posts } = await admin
      .from("content_posts")
      .select("id,status,scheduled_for,updated_at")
      .eq("client_id", client_id)
      .gte("scheduled_for", startISO).lt("scheduled_for", endISO);
    const planned = (posts || []).length;
    const published = (posts || []).filter((p) => p.status === "published").length;
    const late = (posts || []).filter((p) => p.status === "published" && p.scheduled_for && p.updated_at && new Date(p.updated_at) > new Date(p.scheduled_for)).length;
    let contentScore = 50;
    if (planned === 0) {
      missing.push("content_consistency");
    } else {
      contentScore = clamp(100 * (published / planned) - 30 * (late / planned));
    }
    breakdown.content = { planned, published, late };

    // ---------- B) Performance (25%) ----------
    const aggVideos = async (from: string, to: string) => {
      const { data } = await admin
        .from("videos")
        .select("views,reach,likes,comments,shares,saves")
        .eq("client_id", client_id)
        .gte("publish_date", from).lt("publish_date", to);
      const sum = (data || []).reduce((acc, v: any) => {
        acc.views += Number(v.views || 0);
        acc.reach += Number(v.reach || 0);
        acc.eng += Number(v.likes || 0) + Number(v.comments || 0) + Number(v.shares || 0) + Number(v.saves || 0);
        acc.count += 1;
        return acc;
      }, { views: 0, reach: 0, eng: 0, count: 0 });
      return sum;
    };
    const cur = await aggVideos(startDate, endDate);
    const prv = await aggVideos(prevStartDate, prevEndDate);
    let perfScore = 50;
    if (cur.count === 0 && prv.count === 0) {
      missing.push("performance");
    } else {
      const dViews = deltaPct(cur.views, prv.views);
      const dReach = deltaPct(cur.reach, prv.reach);
      const dEng = deltaPct(cur.eng, prv.eng);
      const deltas = [dViews, dReach, dEng].filter((d): d is number => d !== null);
      const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
      perfScore = clamp(50 + avg);
    }
    breakdown.performance = { current: cur, previous: prv };

    // ---------- C) Goal Progress (25%) ----------
    const { data: goals } = await admin
      .from("monthly_goals")
      .select("id,objective,target,progress,status")
      .eq("client_id", client_id)
      .gte("month", startDate).lt("month", endDate);
    let goalScore = 50;
    if (!goals || goals.length === 0) {
      missing.push("goal_progress");
    } else {
      const ratios = goals.map((g) => {
        if (!g.target || Number(g.target) === 0) return null;
        return clamp((Number(g.progress || 0) / Number(g.target)) * 100);
      }).filter((r): r is number => r !== null);
      goalScore = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 50;
      if (ratios.length === 0) missing.push("goal_progress");
    }
    breakdown.goals = { count: goals?.length || 0 };

    // ---------- D) Client Engagement (15%) ----------
    const { data: approvals } = await admin
      .from("content_approvals")
      .select("decision,created_at,updated_at")
      .eq("client_id", client_id)
      .gte("created_at", startISO).lt("created_at", endISO);
    let engagementScore = 50;
    const decided = (approvals || []).filter((a) => a.decision !== "pending");
    if (!approvals || approvals.length === 0) {
      missing.push("client_engagement");
    } else if (decided.length === 0) {
      missing.push("client_engagement");
    } else {
      const approved = decided.filter((a) => a.decision === "approved").length;
      const rate = approved / decided.length;
      const avgHours = decided.reduce((sum, a) => {
        const dt = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 36e5;
        return sum + Math.max(0, dt);
      }, 0) / decided.length;
      const speed = 1 - clamp(avgHours / 72, 0, 1);
      engagementScore = clamp(60 * rate + 40 * speed);
      breakdown.engagement = { approval_rate: round(rate), avg_response_hours: round(avgHours) };
    }

    // ---------- E) Business Impact (15%) ----------
    const sumImpact = (rows: any[]) => rows.reduce((acc, r) => {
      acc.calls += r.calls || 0; acc.dms += r.dms || 0; acc.bookings += r.bookings || 0;
      acc.sales += r.sales || 0; acc.appointments += r.appointments || 0;
      acc.revenue += Number(r.revenue_estimate || 0);
      return acc;
    }, { calls: 0, dms: 0, bookings: 0, sales: 0, appointments: 0, revenue: 0 });
    const { data: impCur } = await admin.from("business_impact_entries").select("*")
      .eq("client_id", client_id).gte("entry_date", startDate).lt("entry_date", endDate);
    const { data: impPrv } = await admin.from("business_impact_entries").select("*")
      .eq("client_id", client_id).gte("entry_date", prevStartDate).lt("entry_date", prevEndDate);
    let impactScore = 50;
    if ((impCur?.length || 0) === 0) {
      missing.push("business_impact");
    } else {
      const c = sumImpact(impCur);
      const p = sumImpact(impPrv || []);
      const totalCur = c.calls + c.dms + c.bookings + c.sales + c.appointments;
      const totalPrv = p.calls + p.dms + p.bookings + p.sales + p.appointments;
      const d = deltaPct(totalCur, totalPrv);
      impactScore = clamp(50 + (d ?? 0));
      breakdown.impact = { current: c, previous: p };
    }

    // ---------- Total ----------
    const total = round(0.20 * contentScore + 0.25 * perfScore + 0.25 * goalScore + 0.15 * engagementScore + 0.15 * impactScore);
    const status = statusFor(total);

    // Summary template
    const labelMap: Record<string, string> = {
      content_consistency: "publishing rhythm", performance: "video performance",
      goal_progress: "monthly goals", client_engagement: "approval activity", business_impact: "business outcomes",
    };
    const missingTxt = missing.length ? ` Missing data: ${missing.map((m) => labelMap[m]).join(", ")}.` : "";
    const summary = `${status.replace("_", " ")} — ${total}/100.${missingTxt}`;

    const periodStart = startDate;
    const periodEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);

    const upsertPayload = {
      agency_id: clientRow.agency_id,
      client_id,
      month, year, period_start: periodStart, period_end: periodEnd,
      total_score: total,
      content_consistency_score: round(contentScore),
      performance_score: round(perfScore),
      goal_progress_score: round(goalScore),
      client_engagement_score: round(engagementScore),
      business_impact_score: round(impactScore),
      score_status: status,
      summary,
      missing_data: missing,
      breakdown,
    };

    const { data: existing } = await admin
      .from("client_health_scores").select("id,ai_recommendation,ai_generated_at")
      .eq("client_id", client_id).eq("year", year).eq("month", month).maybeSingle();

    let row;
    if (existing) {
      const { data, error } = await admin
        .from("client_health_scores").update(upsertPayload).eq("id", existing.id).select().single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await admin
        .from("client_health_scores").insert(upsertPayload).select().single();
      if (error) throw error;
      row = data;
    }

    return new Response(JSON.stringify({ score: row }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-health-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
