"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import AuthGuard from "@/components/AuthGuard";
import {
  TrendingUp,
  Clock,
  BarChart2,
  PlusCircle,
  Users,
  Flame,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  PredictionMarket,
  PredictionOption,
  computeProbability,
  formatProbability,
} from "@/lib/markets-types";
import {
  getMarkets,
  MarketsFilter,
  getMarketsLeaderboard,
} from "@/app/markets/actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Sona erdi";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)} gün`;
  if (h > 0) return `${h}s ${m}d`;
  return `${m} dakika`;
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Spor: "#10b981",
    Akademik: "#3b82f6",
    Kampüs: "#f59e0b",
    Teknoloji: "#8b5cf6",
    Eğlence: "#ec4899",
    Diğer: "#6b7280",
  };
  return map[cat] ?? "#6b7280";
}

function statusBadge(status: string) {
  if (status === "open") return (
    <span className="badge-open">🟢 Açık</span>
  );
  if (status === "closed") return (
    <span className="badge-closed">🟡 Kapalı</span>
  );
  return <span className="badge-resolved">⚪ Çözüldü</span>;
}

// ─── Market Card ──────────────────────────────────────────────────────────────

function MarketCard({ market }: { market: PredictionMarket }) {
  const options = market.options ?? [];
  const topOptions = options.slice(0, 3);

  return (
    <Link href={`/markets/${market.id}`} style={{ textDecoration: "none" }}>
      <div
        className="card market-card-hover"
        style={{ padding: "1.25rem", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(16,185,129,0.3)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 24px rgba(16,185,129,0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px",
                borderRadius: "20px", background: `${categoryColor(market.category)}18`,
                color: categoryColor(market.category), border: `1px solid ${categoryColor(market.category)}30`
              }}>{market.category}</span>
              {statusBadge(market.status)}
            </div>
            <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.35 }}>
              {market.title}
            </p>
          </div>
        </div>

        {/* Options */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {topOptions.map((opt) => {
            const prob = computeProbability(opt, options, market.liquidity_constant);
            return (
              <div key={opt.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>{opt.label}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: prob > 0.5 ? "#34d399" : "var(--text)" }}>
                    {formatProbability(prob)}
                  </span>
                </div>
                <div className="market-bar">
                  <div
                    className="market-bar-fill"
                    style={{ width: `${(prob * 100).toFixed(1)}%`, background: prob > 0.5 ? "#10b981" : "#60a5fa" }}
                  />
                </div>
              </div>
            );
          })}
          {options.length > 3 && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "2px" }}>
              +{options.length - 3} seçenek daha
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "10px", borderTop: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <Users size={11} />
            <span>{market.total_pool.toLocaleString("tr-TR")} kredi havuzda</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
            <Clock size={11} />
            <span>{timeLeft(market.end_time)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ height: "12px", width: "35%", borderRadius: "6px", background: "var(--surface-3)", marginBottom: "10px" }} />
      <div style={{ height: "38px", borderRadius: "8px", background: "var(--surface-3)", marginBottom: "12px" }} />
      <div style={{ height: "8px", borderRadius: "6px", background: "var(--surface-3)", marginBottom: "6px" }} />
      <div style={{ height: "8px", borderRadius: "6px", background: "var(--surface-3)", marginBottom: "6px", width: "75%" }} />
      <div style={{ height: "8px", borderRadius: "6px", background: "var(--surface-3)", width: "60%" }} />
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function LeaderboardPanel() {
  const [leaders, setLeaders] = useState<Awaited<ReturnType<typeof getMarketsLeaderboard>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketsLeaderboard().then((data) => {
      setLeaders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
        <TrendingUp size={16} color="#34d399" />
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>Market Liderleri</h3>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: "36px", background: "var(--surface-3)", borderRadius: "8px" }} />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Henüz kazanım yok.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {leaders.slice(0, 10).map((l, i) => (
            <div key={l.username} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", borderRadius: "8px", background: i === 0 ? "rgba(16,185,129,0.06)" : "transparent" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: i === 0 ? "#34d399" : "var(--text-subtle)", minWidth: "18px" }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.username}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{l.wins} kazanım</p>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#34d399" }}>+{l.total_payout.toLocaleString("tr-TR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FILTER_TABS: { id: MarketsFilter; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Tümü", icon: <BarChart2 size={13} /> },
  { id: "trending", label: "Popüler", icon: <Flame size={13} /> },
  { id: "ending_soon", label: "Yakında Bitiyor", icon: <Clock size={13} /> },
  { id: "resolved", label: "Çözüldü", icon: <CheckCircle size={13} /> },
];

function MarketsInner() {
  const { currentUser } = useApp();
  const [filter, setFilter] = useState<MarketsFilter>("all");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async (f: MarketsFilter) => {
    setLoading(true);
    const data = await getMarkets(f);
    setMarkets(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMarkets(filter);
  }, [filter, fetchMarkets]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.75rem 1rem" }}>
      {/* Disclaimer */}
      <div style={{
        background: "rgba(249,115,22,0.06)",
        border: "1px solid rgba(249,115,22,0.18)",
        borderRadius: "12px",
        padding: "10px 16px",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <AlertCircle size={15} color="#fb923c" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: "0.78rem", color: "#fb923c", lineHeight: 1.5 }}>
          <strong>Bu sistem yalnızca eğlence amaçlıdır.</strong> Gerçek para kullanılmamaktadır.
          Fiyatlar dinamik olarak güncellenir. Tahminler sanal kredi ile yapılır.
        </p>
      </div>

      {/* Hero */}
      <div style={{
        borderRadius: "18px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.08) 60%, var(--surface) 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        padding: "1.5rem",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, width: "260px", height: "100%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <BarChart2 size={20} color="#818cf8" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                  Kampüs Tahmin Marketleri
                </h1>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Sanal kredi ile tahmin yap, havuzdan pay al
                </p>
              </div>
            </div>
          </div>
          {currentUser?.role === "admin" && (
            <Link href="/admin" style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ gap: "6px" }}>
                <PlusCircle size={14} />
                Yeni Market
              </button>
            </Link>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "1.1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "10px", padding: "6px 14px" }}>
            <BarChart2 size={13} color="#818cf8" />
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Toplam Market</span>
            <span style={{ color: "#818cf8", fontWeight: 700 }}>{markets.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "10px", padding: "6px 14px" }}>
            <TrendingUp size={13} color="#34d399" />
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Aktif</span>
            <span style={{ color: "#34d399", fontWeight: 700 }}>
              {markets.filter((m) => m.status === "open").length}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }}
        className="markets-layout">
        {/* Left — market grid */}
        <div>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "1.25rem", overflowX: "auto" }}>
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                id={`market-filter-${t.id}`}
                onClick={() => setFilter(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "7px 14px", borderRadius: "9px", fontSize: "0.8rem", fontWeight: 500,
                  border: filter === t.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  background: filter === t.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: filter === t.id ? "#818cf8" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <MarketCardSkeleton key={i} />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <BarChart2 size={32} color="var(--text-subtle)" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Bu filtre için market bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {markets.map((m) => <MarketCard key={m.id} market={m} />)}
            </div>
          )}
        </div>

        {/* Right — leaderboard */}
        <div className="markets-sidebar">
          <LeaderboardPanel />
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <AuthGuard>
      <MarketsInner />
    </AuthGuard>
  );
}
