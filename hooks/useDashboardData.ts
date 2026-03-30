"use client";

import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { Match } from "@/lib/mock-data";

export function useDashboardData() {
  const {
    matches,
    openMatches,
    openMatchesLoading,
    activeMatchCount,
    activeMatchCountLoading,
  } = useApp();

  return useMemo(() => {
    const baseMatches = matches.length > 0 ? matches : openMatches;
    const mergedOpenById = new Map<string, Match>();
    openMatches.forEach((m) => mergedOpenById.set(m.id, m));
    baseMatches.filter((m) => m.status === "open").forEach((m) => mergedOpenById.set(m.id, m));

    const open = Array.from(mergedOpenById.values()).sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

    const closed = matches.filter((m) => m.status === "closed");
    const finished = matches.filter((m) => m.status === "finished");

    return {
      openMatches: open,
      closedMatches: closed,
      finishedMatches: finished,
      openMatchesLoading,
      activeMatchCount,
      activeMatchCountLoading,
    };
  }, [matches, openMatches, openMatchesLoading, activeMatchCount, activeMatchCountLoading]);
}
