"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Trophy, Crown, Medal } from "lucide-react";
import { Profile } from "@/lib/mock-data";

export default function LeaderboardPage() {
  const { currentUser, users } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => { if (!currentUser) router.replace("/login"); }, [currentUser, router]);
  if (!currentUser) return null;

  const ranked = [...users]
    .filter(u => u.role === "user" || u.role === "admin")
    .sort((a, b) => b.credits - a.credits);

  const myRank = ranked.findIndex(u => u.id === currentUser.id) + 1;

  const PERIOD_LABELS: Record<typeof period, string> = {
    all: "Tüm Zamanlar", month: "Bu Ay", week: "Bu Hafta",
  };

  function UserAvatar({ user }: { user: Profile }) {
    const colors = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];
    const color = colors[user.username.charCodeAt(0) % colors.length];
    if (user.avatarUrl) {
      return <img src={user.avatarUrl} alt={user.username}
        style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}40` }} />;
    }
    return (
      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}35`,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", color }}>
        {user.username[0].toUpperCase()}
      </div>
    );
  }

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  function MedalIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown size={16} color="#fbbf24" />;
    if (rank === 2) return <Medal size={16} color="#94a3b8" />;
    return <Medal size={16} color="#b45309" />;
  }

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = [160, 200, 140];
  const podiumColors  = ["#94a3b8", "#fbbf24", "#b45309"];

  return (
    <div className="animate-fade-in" style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "56px", height: "56px", borderRadius: "16px",
          background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", marginBottom: "1rem" }}>
          <Trophy size={24} color="#fbbf24" />
        </div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)" }}>Liderlik Tablosu</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "0.82rem" }}>
          En çok kredi kazanan tahminciler
        </p>
      </div>

      {/* Period tabs */}
      <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: "14px", marginBottom: "1.75rem" }}>
        {(["all","month","week"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 500,
              border: period === p ? "1px solid rgba(251,191,36,0.3)" : "1px solid transparent",
              background: period === p ? "rgba(251,191,36,0.1)" : "transparent",
              color: period === p ? "#fbbf24" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s",
            }}>{PERIOD_LABELS[p]}</button>
        ))}
      </div>

      {/* My rank banner */}
      {myRank > 0 && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "14px", padding: "14px 20px", marginBottom: "1.75rem",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <UserAvatar user={currentUser} />
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Senin Sıralaман</p>
              <p style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>#{myRank} / {ranked.length}</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Kredin</p>
            <p style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>{currentUser.credits.toLocaleString("tr-TR")}</p>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 2 && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "12px", marginBottom: "2rem" }}>
          {podiumOrder.map((user, i) => {
            const realRank = ranked.findIndex(u => u.id === user.id) + 1;
            const idx = i === 0 ? 1 : i === 1 ? 0 : 2; // reorder: 2,1,3
            return (
              <div key={user.id} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ marginBottom: "8px" }}>
                  <UserAvatar user={user} />
                </div>
                <p className="text-[0.78rem] font-semibold text-[color:var(--text)] mb-0.5 truncate max-w-[70px] sm:max-w-full mx-auto">
                  {user.username}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  {user.credits.toLocaleString("tr-TR")}
                </p>
                <div style={{
                  height: `${podiumHeights[idx]}px`,
                  borderRadius: "12px 12px 0 0",
                  background: `${podiumColors[idx]}18`,
                  border: `2px solid ${podiumColors[idx]}40`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                  paddingTop: "10px",
                }}>
                  <MedalIcon rank={realRank} />
                  <span style={{ fontWeight: 800, fontSize: "1.2rem", color: podiumColors[idx], marginTop: "4px" }}>
                    #{realRank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranking */}
      <div className="card">
        {ranked.map((user, i) => {
          const rank = i + 1;
          const isMe = user.id === currentUser.id;
          return (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "12px 20px", borderBottom: "1px solid var(--border)",
              background: isMe ? "rgba(16,185,129,0.04)" : "transparent",
            }}>
              <div style={{ width: "28px", textAlign: "center", flexShrink: 0 }}>
                {rank <= 3
                  ? <MedalIcon rank={rank} />
                  : <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>#{rank}</span>}
              </div>
              <UserAvatar user={user} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", color: isMe ? "#34d399" : "var(--text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.username} {isMe && <span style={{ fontSize: "0.7rem" }}>(sen)</span>}
                </p>
                {user.role === "admin" && <p style={{ fontSize: "0.68rem", color: "#c084fc" }}>Admin</p>}
              </div>
              <span style={{ fontWeight: 700, color: rank <= 3 ? "#fbbf24" : "var(--text)", fontSize: "0.95rem" }}>
                {user.credits.toLocaleString("tr-TR")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
