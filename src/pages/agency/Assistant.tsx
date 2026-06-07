import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Send, Loader2, User, Bot, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string | null; client_id: string | null; updated_at: string };

export default function Assistant() {
  const { agency } = useUser();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scopeClient, setScopeClient] = useState<string>("none");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agency) return;
    (async () => {
      const [{ data: c }, { data: conv }] = await Promise.all([
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
        supabase.from("ai_conversations").select("id,title,client_id,updated_at").eq("agency_id", agency.id).order("updated_at", { ascending: false }),
      ]);
      setClients(c || []);
      setConvs(conv || []);
    })();
  }, [agency]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", activeId).order("created_at");
      setMessages((data || []) as Msg[]);
      const conv = convs.find((c) => c.id === activeId);
      if (conv) setScopeClient(conv.client_id || "none");
    })();
  }, [activeId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, streaming]);

  async function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  async function ensureConversation(): Promise<string> {
    if (activeId) return activeId;
    const { data, error } = await supabase.from("ai_conversations").insert({
      agency_id: agency!.id,
      client_id: scopeClient === "none" ? null : scopeClient,
      user_id: (await supabase.auth.getUser()).data.user!.id,
      title: input.slice(0, 60) || "New chat",
    }).select("id").single();
    if (error) throw error;
    setActiveId(data.id);
    setConvs((p) => [{ id: data.id, title: input.slice(0, 60), client_id: scopeClient === "none" ? null : scopeClient, updated_at: new Date().toISOString() }, ...p]);
    return data.id;
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || !agency) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "" }]);
    setStreaming(true);

    let convId: string;
    try {
      convId = await ensureConversation();
    } catch (e: any) {
      toast.error(e.message);
      setStreaming(false);
      return;
    }

    await supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content: text });

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          agency_id: agency.id,
          client_id: scopeClient === "none" ? null : scopeClient,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      await supabase.from("ai_messages").insert({ conversation_id: convId, role: "assistant", content: acc });
      await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    } catch (e: any) {
      toast.error(e.message || "AI error");
      setMessages((p) => p.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  const clientName = useMemo(() => (id: string | null) => id ? clients.find((c) => c.id === id)?.name ?? "—" : null, [clients]);

  const suggestions = scopeClient !== "none"
    ? [
        "Rezumă performanța din ultimele 30 de zile pentru acest client.",
        "Propune 5 hook-uri pentru următorul reel.",
        "Care sunt principalele recomandări pentru a crește engagement-ul?",
        "Schițează un calendar de conținut pentru săptămâna următoare.",
      ]
    : [
        "Care clienți performează slab luna aceasta?",
        "Dă-mi o listă săptămânală de priorități pentru toți clienții.",
        "Care sunt tiparele comune de engagement din portofoliul meu?",
      ];

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r border-border hidden lg:flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={newChat} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Conversație nouă
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {convs.length === 0 && <div className="text-xs text-muted-foreground px-3 py-6 text-center">Nicio conversație încă</div>}
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full text-left px-2 py-2 rounded-md text-sm truncate hover:bg-sidebar-accent transition-colors flex items-center gap-2",
                activeId === c.id && "bg-sidebar-accent"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate">{c.title || "Fără titlu"}</div>
                {c.client_id && <div className="text-[10px] text-muted-foreground truncate">{clientName(c.client_id)}</div>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-lg font-semibold">Asistent AI</h1>
          </div>
          <Select value={scopeClient} onValueChange={setScopeClient} disabled={!!activeId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Context" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Toată agenția</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-4 md:px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-accent/10">
                <Sparkles className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Cu ce te pot ajuta?</h2>
                <p className="text-sm text-muted-foreground mt-1">Întreabă orice despre clienți, conținut sau performanță.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-left">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="border border-border rounded-md p-3 text-sm hover:border-accent/40 hover:bg-accent/5 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "")}>
                  {m.role === "assistant" && (
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
                  )}
                  <div className={cn(
                    "rounded-lg px-4 py-2.5 max-w-[80%] whitespace-pre-wrap text-sm",
                    m.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted"
                  )}>
                    {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                  </div>
                  {m.role === "user" && (
                    <Avatar className="h-8 w-8"><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 md:p-4">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Întreabă despre performanță, planifică conținut, schițează hook-uri…"
              rows={2}
              className="resize-none"
              disabled={streaming}
            />
            <Button onClick={send} disabled={streaming || !input.trim()} size="icon" className="h-[60px] w-12">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
