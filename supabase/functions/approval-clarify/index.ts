import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { approval_id } = await req.json();
    if (!approval_id) {
      return new Response(JSON.stringify({ error: "approval_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: approval, error: aErr } = await supabase
      .from("content_approvals")
      .select("feedback, comment, content_post_id")
      .eq("id", approval_id)
      .single();
    if (aErr || !approval) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post } = await supabase
      .from("content_posts")
      .select("title, hook, caption, script, platform, content_type")
      .eq("id", approval.content_post_id)
      .single();

    const feedback = (approval.feedback || approval.comment || "").trim();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const sys = `Ești un strateg de conținut. Clientul unei agenții a lăsat feedback vag despre o postare. Generează 3-5 întrebări scurte de clarificare (în română, prietenoase, concrete) pe care agenția să i le trimită. Răspunde STRICT JSON: { "questions": string[], "interpretation": string }. "interpretation" e o frază scurtă cu cea mai probabilă cauză a nemulțumirii.`;

    const userPrompt = `POSTARE:\nTitlu: ${post?.title || "-"}\nPlatformă: ${post?.platform || "-"}\nTip: ${post?.content_type || "-"}\nHook: ${post?.hook || "-"}\nCaption: ${post?.caption || "-"}\nScript: ${(post?.script || "").slice(0, 500)}\n\nFEEDBACK CLIENT: "${feedback || "(gol)"}"`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { questions: [], interpretation: "" };
    }

    return new Response(
      JSON.stringify({
        questions: parsed.questions || [],
        interpretation: parsed.interpretation || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
