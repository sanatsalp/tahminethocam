"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Calendar, Trophy, TrendingUp, Zap } from "lucide-react";
import { Match } from "@/lib/mock-data";

function StatusBadge({ status }: { status: string }) {
  if (status === "open")     return <span className="badge-open">🟢 Açık</span>;
  if (status === "closed")   return <span className="badge-closed">🟡 Kapalı</span>;
  return <span className="badge-finished">⚪ Bitti</span>;
}

function MatchCard({ match }: { match: Match }) {
  const { predictions, currentUser } = useApp();
  const myPred = predictions.find(p => p.match_id === match.id && p.user_id === currentUser?.id);

  function PlayerAvatar({ img, name, side }: { img?: string; name: string; side: "a" | "b" }) {
    const color = side === "a" ? "#10b981" : "#3b82f6";
    return (
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 8px",
        background: `${color}18`, border: `2px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img
          ? <img src={img} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{name[0]}</span>}
      </div>
    );
  }

  return (
    <Link href={`/matches/${match.id}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{ padding: "1.25rem", cursor: "pointer", transition: "all 0.25s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(16,185,129,0.3)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 24px rgba(16,185,129,0.07)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Trophy size={12} color="#34d399" style={{ opacity: 0.6 }} />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{match.tournament}</span>
          </div>
          <StatusBadge status={match.status} />
        </div>

        {/* Players */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <PlayerAvatar img={match.player_a_img} name={match.player_a} side="a" />
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{match.player_a}</p>
            <div style={{ marginTop: "6px", display: "inline-block", padding: "3px 10px", borderRadius: "8px",
              background: match.winner === "A" ? "rgba(16,185,129,0.2)" : "var(--surface-3)",
              color: match.winner === "A" ? "#34d399" : "var(--text)", fontWeight: 700, fontSize: "0.9rem" }}>
              {match.odds_a.toFixed(2)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%",
              background: "var(--surface-3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)" }}>VS</div>
            {match.winner && (
              <span style={{ fontSize: "0.62rem", color: "#34d399", fontWeight: 600, textAlign: "center" }}>
                {match.winner === "A" ? match.player_a : match.player_b} kazandı
              </span>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <PlayerAvatar img={match.player_b_img} name={match.player_b} side="b" />
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{match.player_b}</p>
            <div style={{ marginTop: "6px", display: "inline-block", padding: "3px 10px", borderRadius: "8px",
              background: match.winner === "B" ? "rgba(16,185,129,0.2)" : "var(--surface-3)",
              color: match.winner === "B" ? "#34d399" : "var(--text)", fontWeight: 700, fontSize: "0.9rem" }}>
              {match.odds_b.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <Calendar size={11} />
            {new Date(match.scheduled_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
          {myPred
            ? <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#34d399",
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                padding: "2px 8px", borderRadius: "20px" }}>✓ Tahmin yapıldı</span>
            : match.status === "open"
            ? <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tahmin yap →</span>
            : null}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { currentUser, matches } = useApp();
  const router = useRouter();

  useEffect(() => { if (!currentUser) router.replace("/login"); }, [currentUser, router]);
  if (!currentUser) return null;

  const openMatches     = matches.filter(m => m.status === "open");
  const closedMatches   = matches.filter(m => m.status === "closed");
  const finishedMatches = matches.filter(m => m.status === "finished");

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.75rem 1rem" }}>
      {/* Welcome Banner */}
      <div style={{
        borderRadius: "18px",
        background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, var(--surface) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
        padding: "1.5rem", marginBottom: "2rem", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, width: "200px", height: "100%",
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "4px", color: "var(--text)" }}>
          Merhaba, <span style={{ color: "#34d399" }}>{currentUser.username}</span> 👋
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
          Tahminlerini yap, sıralamada yüksel!
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px",
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "12px", padding: "8px 16px" }}>
            <Zap size={15} color="#34d399" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bakiyeniz</span>
            <span style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem" }}>
              {currentUser.credits.toLocaleString("tr-TR")}
            </span>
            <span style={{ color: "var(--text-subtle)", fontSize: "0.8rem" }}>kredi</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px",
            background: "var(--surface-3)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "8px 16px" }}>
            <TrendingUp size={15} color="var(--text-muted)" />
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{openMatches.length} aktif maç</span>
          </div>
        </div>
      </div>

      {/* Open Matches */}
      {openMatches.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399" }} className="animate-pulse" />
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Açık Maçlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {closedMatches.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fbbf24" }} />
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Kapalı Maçlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {closedMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {finishedMatches.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-subtle)" }} />
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-muted)" }}>Biten Maçlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
