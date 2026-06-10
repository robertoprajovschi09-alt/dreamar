import { supabase } from "@/integrations/supabase/client";

type Sub = {
  table: string;
  filter?: string; // e.g. "client_id=eq.<uuid>"
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

/**
 * Subscribe to one or more tables via Supabase Realtime.
 * Returns a cleanup function safe to call in useEffect.
 */
export function subscribeTables(channelName: string, subs: Sub[], onChange: () => void) {
  let ch = supabase.channel(channelName);
  for (const s of subs) {
    ch = ch.on(
      "postgres_changes" as any,
      { event: s.event ?? "*", schema: "public", table: s.table, filter: s.filter } as any,
      () => onChange(),
    );
  }
  ch.subscribe();
  return () => {
    try { supabase.removeChannel(ch); } catch { /* noop */ }
  };
}
