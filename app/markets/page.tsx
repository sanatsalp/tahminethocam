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
  computeProbability,
  formatProbability,
} from "@/lib/markets-types";
import {
  getMarkets,
  getActiveMarketsCount,
  MarketsFilter,
  getMarketsLeaderboard,
} from "@/app/markets/actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (status === "open")   return <span className="badge-open">🟢 Açık</span>;
  if (status === "closed") return <span className="badge-closed">🟡 Kapalı</span>;
  return <span className="badge-resolved">⚪ Çözüldü</span>;
}

// ─── Tahmin Kartı ─────────────────────────────────────────────────────────────

function TahminCard({ market }: { market: PredictionMarket }) {
  const options = market.options ?? [];
  const topOptions = options.slice(0, 3);

  return (
    <Link href={`/markets/${market.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        className="card market-card-hover"
        style={{ padding: "1.1rem", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(16,185,129,0.3)";
          el.style.boxShadow = "0 0 24px rgba(16,185,129,0.08)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "none";
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px",
                borderRadius: "20px", background: `${categoryColor(market.category)}18`,
                color: categoryColor(market.category), border: `1px solid ${categoryColor(market.category)}30`,
                flexShrink: 0,
              }}>{market.category}</span>
              {statusBadge(market.status)}
            </div>
            <p style={{
              fontWeight: 600, fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.35,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {market.title}
            </p>
          </div>
        </div>

        {/* Seçenekler */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
          {topOptions.map((opt) => {
            const prob = computeProbability(opt, options, market.liquidity_constant);
            const barColor = prob > 0.5 ? "#10b981" : "#60a5fa";
            return (
              <div key={opt.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "6px" }}>{opt.label}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: barColor, flexShrink: 0 }}>
                    {formatProbability(prob)}
                  </span>
                </div>
                <div className="market-bar">
                  <div className="market-bar-fill" style={{ width: `${(prob * 100).toFixed(1)}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
          {options.length > 3 && (
            <p style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>
              +{options.length - 3} seçenek daha
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "8px", borderTop: "1px solid var(--border)", gap: "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.68rem", color: "var(--text-muted)", minWidth: 0 }}>
            <Users size={10} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {market.total_pool.toLocaleString("tr-TR")} kredi
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.68rem", color: "var(--text-subtle)", flexShrink: 0 }}>
            <Clock size={10} />
            <span>{timeLeft(market.end_time)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TahminCardSkeleton() {
  return (
    <div className="card" style={{ padding: "1.1rem" }}>
      <div style={{ height: "11px", width: "35%", borderRadius: "6px", background: "var(--surface-3)", marginBottom: "8px" }} />
      <div style={{ height: "34px", borderRadius: "7px", background: "var(--surface-3)", marginBottom: "10px" }} />
      <div style={{ height: "7px", borderRadius: "5px", background: "var(--surface-3)", marginBottom: "5px" }} />
      <div style={{ height: "7px", borderRadius: "5px", background: "var(--surface-3)", width: "75%", marginBottom: "5px" }} />
      <div style={{ height: "7px", borderRadius: "5px", background: "var(--surface-3)", width: "55%" }} />
    </div>
  );
}

// ─── Liderlik Tablosu ─────────────────────────────────────────────────────────

function LiderlikTablosu() {
  const [leaders, setLeaders] = useState<Awaited<ReturnType<typeof getMarketsLeaderboard>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketsLeaderboard().then((data) => {
      setLeaders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="card" style={{ padding: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "0.9rem" }}>
        <TrendingUp size={15} color="#34d399" />
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Tahmin Liderleri</h3>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: "32px", background: "var(--surface-3)", borderRadius: "7px" }} />)}
        </div>
      ) : leaders.length === 0 ? (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Henüz kazanım yok.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {leaders.slice(0, 10).map((l, i) => (
            <div key={l.username} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "5px 7px", borderRadius: "7px",
              background: i === 0 ? "rgba(16,185,129,0.06)" : "transparent",
            }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: i === 0 ? "#34d399" : "var(--text-subtle)", minWidth: "16px" }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.username}</p>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{l.wins} kazanım</p>
              </div>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", flexShrink: 0 }}>+{l.total_payout.toLocaleString("tr-TR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const FILTER_TABS: { id: MarketsFilter; label: string; icon: React.ReactNode }[] = [
  { id: "all",         label: "Tümü",            icon: <BarChart2 size={12} /> },
  { id: "trending",    label: "Popüler",          icon: <Flame size={12} /> },
  { id: "ending_soon", label: "Yakında Bitiyor",  icon: <Clock size={12} /> },
  { id: "resolved",    label: "Çözüldü",          icon: <CheckCircle size={12} /> },
];

function TahminlerInner() {
  const { currentUser } = useApp();
  const [filter, setFilter]   = useState<MarketsFilter>("all");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (f: MarketsFilter) => {
    setLoading(true);
    // Fetch filtered list AND the true active count in parallel
    const [data, count] = await Promise.all([
      getMarkets(f),
      getActiveMarketsCount(),
    ]);
    setMarkets(data);
    setActiveCount(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(filter);
  }, [filter, fetchData]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>

      {/* Disclaimer */}
      <div style={{
        background: "rgba(249,115,22,0.06)",
        border: "1px solid rgba(249,115,22,0.18)",
        borderRadius: "10px",
        padding: "8px 14px",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
      }}>
        <AlertCircle size={14} color="#fb923c" style={{ flexShrink: 0, marginTop: "1px" }} />
        <p style={{ fontSize: "0.75rem", color: "#fb923c", lineHeight: 1.5 }}>
          <strong>Bu sistem yalnızca eğlence amaçlıdır.</strong> Gerçek para kullanılmamaktadır.
          Fiyatlar dinamik olarak güncellenir. Tahminler sanal kredi ile yapılır.
        </p>
      </div>

      {/* Hero Banner */}
      <div style={{
        borderRadius: "16px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.07) 60%, var(--surface) 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        padding: "1.25rem",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, width: "200px", height: "100%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "11px",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <BarChart2 size={18} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Kampüs Tahminleri
              </h1>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Sanal kredi ile tahmin yap, havuzdan pay al
              </p>
            </div>
          </div>
          {currentUser?.role === "admin" && (
            <Link href="/admin" style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "7px 14px" }}>
                <PlusCircle size={13} />
                Yeni Tahmin
              </button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "8px", marginTop: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "9px", padding: "5px 12px" }}>
            <BarChart2 size={12} color="#818cf8" />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Toplam</span>
            <span style={{ color: "#818cf8", fontWeight: 700, fontSize: "0.82rem" }}>
              {loading ? "—" : markets.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "9px", padding: "5px 12px" }}>
            <TrendingUp size={12} color="#34d399" />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Aktif Tahmin</span>
            <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.82rem" }}>
              {loading ? "—" : activeCount}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="markets-layout">
        {/* Sol sütun */}
        <div>
          {/* Filtre sekmeleri */}
          <div style={{
            display: "flex", gap: "3px", padding: "3px",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "11px", marginBottom: "1rem", overflowX: "auto",
          }}>
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                id={`tahmin-filter-${t.id}`}
                onClick={() => setFilter(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "6px 12px", borderRadius: "8px", fontSize: "0.76rem", fontWeight: 500,
                  border: filter === t.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  background: filter === t.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: filter === t.id ? "#818cf8" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <TahminCardSkeleton key={i} />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <BarChart2 size={28} color="var(--text-subtle)" style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Bu filtre için tahmin alanı bulunamadı.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {markets.map((m) => <TahminCard key={m.id} market={m} />)}
            </div>
          )}
        </div>

        {/* Sağ sütun — liderlik */}
        <div className="markets-sidebar">
          <LiderlikTablosu />
        </div>
      </div>
    </div>
  );
}

export default function TahminlerPage() {
  return (
    <AuthGuard>
      <TahminlerInner />
    </AuthGuard>
  );
}
