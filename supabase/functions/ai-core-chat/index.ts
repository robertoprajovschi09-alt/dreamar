// AI Core Engine - chat (streaming) via OpenAI.
// Grounds answers in agency/client context, applies safety, logs every run.
import {
  corsHeaders, jsonResponse, userClient, serviceClient, requireUser,
  getActivePrompt, OPENAI_MODEL, OPENAI_API_KEY, OPENAI_BASE_URL,
  runSafety, logRun, logEvent, estimateCost,
} from "../_shared/openai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) return jsonResponse({ error: "OPENAI_API_KEY missing" }, 500);
    const supa = userClient(req);
    const svc = serviceClient();
    const { userId } = await requireUser(supa, req);

    const { messages, agency_id, client_id, model: modelOverride, prompt_key = "agency_assistant" } = await req.json();
    if (!Array.isArray(messages) || !agency_id) return jsonResponse({ error: "Bad request" }, 400);

    // membership check
    const { data: mem } = await supa.from("agency_members").select("role").eq("agency_id", agency_id).eq("user_id", userId).maybeSingle();
    if (!mem) return jsonResponse({ error: "Forbidden" }, 403);

    // Build context
    let context = "";
    const { data: agency } = await supa.from("agencies").select("name").eq("id", agency_id).maybeSingle();
    context += `Agency: ${agency?.name ?? "?"}\n`;
    if (client_id) {
      const { data: client } = await supa.from("clients").select("name,niche,city,objectives,target_audience,tone_of_voice").eq("id", client_id).maybeSingle();
      if (client) context += `Client: ${JSON.stringify(client)}\n`;
      const { data: goals } = await supa.from("monthly_goals").select("month,objective,metric,target,progress,status").eq("client_id", client_id).order("month", { ascending: false }).limit(6);
      if (goals?.length) context += `Goals: ${JSON.stringify(goals)}\n`;
      const { data: ana } = await supa.from("analytics_entries").select("platform,month,year,views,reach,engagement_rate,leads,revenue").eq("client_id", client_id).order("created_at", { ascending: false }).limit(20);
      if (ana?.length) context += `Analytics: ${JSON.stringify(ana)}\n`;
    } else {
      const { data: clients } = await supa.from("clients").select("name,niche,status,objectives").eq("agency_id", agency_id).limit(50);
      context += `Clients: ${JSON.stringify(clients || [])}\n`;
    }
    // RAG: pull memory
    const { data: mem_facts } = await supa.from("ai_memory")
      .select("title,content,scope,kind")
      .eq("agency_id", agency_id)
      .or(`client_id.is.null${client_id ? `,client_id.eq.${client_id}` : ""}`)
      .order("updated_at", { ascending: false }).limit(20);
    if (mem_facts?.length) context += `\nKnowledge base:\n${mem_facts.map(m => `- [${m.kind}] ${m.title}: ${m.content}`).join("\n")}\n`;

    const promptRow = await getActivePrompt(svc, prompt_key, agency_id);
    const systemPrompt = `${promptRow?.content || "You are a helpful AI assistant."}\n\nCONTEXT:\n${context}`;

    // Safety: scan latest user message
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const safetyIn = await runSafety(svc, agency_id, lastUser);
    if (safetyIn.action === "block") {
      await logEvent(svc, agency_id, "warn", "ai_input_blocked", { flags: safetyIn.flags }, userId);
      return jsonResponse({ error: "Input blocked by safety rules", flags: safetyIn.flags }, 422);
    }

    const model = modelOverride || promptRow?.model || OPENAI_MODEL;
    const t0 = Date.now();
    const aiResp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: promptRow?.temperature ?? 0.4,
      }),
    });

    if (!aiResp.ok || !aiResp.body) {
      const t = await aiResp.text();
      await logEvent(svc, agency_id, "error", "openai_error", { status: aiResp.status, body: t.slice(0, 500) }, userId);
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limit. Try again later." }, 429);
      return jsonResponse({ error: `OpenAI error: ${t.slice(0, 200)}` }, 500);
    }

    // We stream and also accumulate to log + safety scan output.
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let acc = "";
    const reader = aiResp.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
            buf += chunk;
            let i;
            while ((i = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, i).replace(/\r$/, "");
              buf = buf.slice(i + 1);
              if (!line.startsWith("data: ")) continue;
              const j = line.slice(6).trim();
              if (j === "[DONE]") continue;
              try {
                const p = JSON.parse(j);
                const d = p.choices?.[0]?.delta?.content;
                if (d) acc += d;
              } catch { /* partial */ }
            }
          }
        } finally {
          controller.close();
          const latency = Date.now() - t0;
          const safetyOut = await runSafety(svc, agency_id, acc);
          // Approx token count (OpenAI doesn't return tokens in streaming; rough estimate)
          const tokensIn = Math.ceil((systemPrompt.length + JSON.stringify(messages).length) / 4);
          const tokensOut = Math.ceil(acc.length / 4);
          await logRun(svc, {
            agency_id, client_id: client_id ?? null, user_id: userId,
            prompt_key, prompt_version: promptRow?.version ?? null,
            model, input_messages: messages, output_text: acc,
            tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: latency,
            cost_usd: estimateCost(model, tokensIn, tokensOut),
            status: "success",
            safety_flags: [...safetyIn.flags, ...safetyOut.flags],
          });
        }
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("ai-core-chat error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
