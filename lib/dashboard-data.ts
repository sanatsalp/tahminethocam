import { supabase } from "@/lib/supabase";
import { Match } from "@/lib/mock-data";

const DASHBOARD_MATCHES_SELECT =
  "id,title,player_a,player_b,player_a_img,player_b_img,odds_a,odds_b,status,winner,tournament,scheduled_at";

export async function getActiveMatchCount(): Promise<number> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export async function getOpenMatches(): Promise<Match[]> {
  const { data } = await supabase
    .from("matches")
    .select(DASHBOARD_MATCHES_SELECT)
    .eq("status", "open")
    .order("scheduled_at", { ascending: true });
  return (data || []) as Match[];
}
