"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import AuthGuard from "@/components/AuthGuard";
import {
  Clock,
  AlertCircle,
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import {
  PredictionMarket,
  PredictionOption,
  computeProbability,
  formatProbability,
  estimatePayout,
} from "@/lib/markets-types";
import {
  getMarketDetail,
  placeBet,
  getPriceHistory,
} from "@/app/markets/actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Sona erdi";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}g ${h % 24}s`;
  if (h > 0) return `${h}s ${m}d`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s} saniye`;
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Spor: "#10b981", Akademik: "#3b82f6", Kampüs: "#f59e0b",
    Teknoloji: "#8b5cf6", Eğlence: "#ec4899", Diğer: "#6b7280",
  };
  return map[cat] ?? "#6b7280";
}

// ─── Price Sparkline (pure SVG, no deps) ─────────────────────────────────────

function PriceSparkline({ history, color }: { history: number[]; color: string }) {
  if (history.length < 2) {
    return <div style={{ height: "40px", display: "flex", alignItems: "center" }}>
      <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>Veri yok</span>
    </div>;
  }

  const w = 120, h = 40;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 0.01;

  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ opacity: 0.8 }}
      />
    </svg>
  );
}

// ─── Option Panel ─────────────────────────────────────────────────────────────

function OptionRow({
  option,
  options,
  liquidityConstant,
  isWinner,
  isMyChoice,
  onSelect,
  selected,
  disabled,
  priceHistory,
}: {
  option: PredictionOption;
  options: PredictionOption[];
  liquidityConstant: number;
  isWinner: boolean;
  isMyChoice: boolean;
  onSelect: () => void;
  selected: boolean;
  disabled: boolean;
  priceHistory: number[];
}) {
  const prob = computeProbability(option, options, liquidityConstant);
  const color = prob > 0.5 ? "#10b981" : "#60a5fa";

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        width: "100%",
        background: selected
          ? "rgba(16,185,129,0.08)"
          : isMyChoice
          ? "rgba(99,102,241,0.06)"
          : "var(--surface-2)",
        border: selected
          ? "1px solid rgba(16,185,129,0.35)"
          : isMyChoice
          ? "1px solid rgba(99,102,241,0.3)"
          : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>
              {option.label}
            </span>
            {isWinner && <span className="badge-won">🏆 Kazanan</span>}
            {isMyChoice && !isWinner && <span style={{ fontSize: "0.65rem", color: "#818cf8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "20px", padding: "1px 6px" }}>Seçiminiz</span>}
          </div>

          {/* Probability bar */}
          <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {option.pool.toLocaleString("tr-TR")} kredi
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>
                {formatProbability(prob)}
              </span>
            </div>
            <div className="market-bar">
              <div
                className="market-bar-fill"
                style={{ width: `${(prob * 100).toFixed(1)}%`, background: color, transition: "width 0.5s ease" }}
              />
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ flexShrink: 0, opacity: 0.7 }}>
          <PriceSparkline history={priceHistory} color={color} />
        </div>

        {/* Selection indicator */}
        {!disabled && (
          <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
            border: selected ? "none" : "2px solid var(--border)",
            background: selected ? "#10b981" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {selected && <CheckCircle2 size={14} color="white" />}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Bet Form ─────────────────────────────────────────────────────────────────

function BetForm({
  market,
  selectedOptionId,
  onSuccess,
}: {
  market: PredictionMarket;
  selectedOptionId: string | null;
  onSuccess: () => void;
}) {
  const { currentUser } = useApp();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedOption = market.options?.find((o) => o.id === selectedOptionId);
  const estimatedPayout = selectedOption && Number(amount) > 0
    ? estimatePayout(selectedOption, market.options ?? [], Number(amount))
    : 0;

  const handleBet = async () => {
    if (!selectedOptionId || !amount || Number(amount) < 10) {
      setError("Minimum bahis 10 kredidir");
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    const result = await placeBet(market.id, selectedOptionId, Number(amount));
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Bir hata oluştu");
    } else {
      setSuccess(true);
      onSuccess();
    }
  };

  if (success) {
    return (
      <div style={{
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: "12px", padding: "1.25rem", textAlign: "center",
      }}>
        <CheckCircle2 size={32} color="#34d399" style={{ margin: "0 auto 8px" }} />
        <p style={{ fontWeight: 700, color: "#34d399", marginBottom: "4px" }}>Tahmin alındı!</p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Pozisyonunuz kaydedildi. Sonuç açıklandığında krediniz otomatik olarak güncellenir.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "1rem" }}>
        Tahmin Yap
      </h3>

      {!selectedOptionId ? (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>
          ↑ Tahmin etmek istediğiniz seçeneği seçin
        </p>
      ) : (
        <>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Kredi miktarı
            </label>
            <input
              type="number"
              className="input"
              id="bet-amount-input"
              min={10}
              max={5000}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              placeholder="Min: 10 — Maks: 5000"
            />
          </div>

          {/* Quick amounts */}
          <div style={{ display: "flex", gap: "5px", marginBottom: "12px", flexWrap: "wrap" }}>
            {[25, 50, 100, 250, 500].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))}
                style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "8px",
                  background: amount === String(v) ? "rgba(16,185,129,0.15)" : "var(--surface-3)",
                  border: amount === String(v) ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--border)",
                  color: amount === String(v) ? "#34d399" : "var(--text-muted)", cursor: "pointer" }}
              >{v}</button>
            ))}
          </div>

          {/* Payout preview */}
          {estimatedPayout > 0 && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Tahmini kazanç</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#34d399" }}>
                  ~{estimatedPayout.toLocaleString("tr-TR")} kredi
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>Seçenek</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {selectedOption?.label}
                </span>
              </div>
              <p style={{ fontSize: "0.65rem", color: "var(--text-subtle)", marginTop: "6px" }}>
                * Orantılı havuz sistemi — nihai kazanç gerçek katılıma göre değişebilir
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontSize: "0.78rem", marginBottom: "10px" }}>
              <XCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Bakiye:</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399" }}>
              {(currentUser?.credits ?? 0).toLocaleString("tr-TR")} kredi
            </span>
          </div>

          <button
            className="btn-primary"
            id="confirm-bet-btn"
            style={{ width: "100%", padding: "0.7rem" }}
            onClick={handleBet}
            disabled={loading || !amount || Number(amount) < 10}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> İşleniyor...</> : "Tahmin Onayla"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Market Detail Inner ───────────────────────────────────────────────────────

function MarketDetailInner({ marketId }: { marketId: string }) {
  const { currentUser } = useApp();
  const router = useRouter();

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Record<string, number[]>>({});
  const [countdown, setCountdown] = useState("");

  const loadMarket = useCallback(async () => {
    if (!currentUser) return;
    const data = await getMarketDetail(marketId, currentUser.id);
    setMarket(data);
    setLoading(false);

    // Preselect option if user already has a position
    if (data?.my_position) {
      setSelectedOptionId(data.my_position.option_id);
    }

    // Load price history
    const history = await getPriceHistory(marketId);
    const byOption: Record<string, number[]> = {};
    for (const h of history) {
      if (!byOption[h.option_id]) byOption[h.option_id] = [];
      byOption[h.option_id].push(h.probability);
    }
    setPriceHistoryMap(byOption);
  }, [currentUser, marketId]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  // Countdown timer
  useEffect(() => {
    if (!market) return;
    const update = () => setCountdown(timeLeft(market.end_time));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [market]);

  if (loading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ height: "28px", width: "55%", borderRadius: "8px", background: "var(--surface-3)", marginBottom: "16px" }} />
          <div style={{ height: "14px", width: "80%", borderRadius: "6px", background: "var(--surface-3)", marginBottom: "10px" }} />
          <div style={{ height: "14px", width: "60%", borderRadius: "6px", background: "var(--surface-3)" }} />
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Market bulunamadı.</p>
        <Link href="/markets"><button className="btn-secondary" style={{ marginTop: "12px" }}>← Marketlere Dön</button></Link>
      </div>
    );
  }

  const options = market.options ?? [];
  const isEnded = new Date(market.end_time) <= new Date();
  const canBet = market.status === "open" && !isEnded && !market.my_position;
  const catColor = categoryColor(market.category);

  return (
    <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto", padding: "1.75rem 1rem" }}>
      {/* Back */}
      <Link href="/markets" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
        <ArrowLeft size={14} /> Marketlere Dön
      </Link>

      {/* Disclaimer */}
      <div style={{
        background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)",
        borderRadius: "10px", padding: "8px 14px", marginBottom: "1.25rem",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <AlertCircle size={13} color="#fb923c" />
        <p style={{ fontSize: "0.72rem", color: "#fb923c" }}>
          Bu tahmin yalnızca eğlence amaçlıdır. Gerçek para kullanılmamaktadır.
        </p>
      </div>

      {/* Market Header */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30`
              }}>{market.category}</span>
              {market.status === "open" && !isEnded && <span className="badge-open">🟢 Açık</span>}
              {market.status === "closed" && <span className="badge-closed">🟡 Kapalı</span>}
              {market.status === "resolved" && <span className="badge-resolved">⚪ Çözüldü</span>}
              {isEnded && market.status === "open" && <span className="badge-closed">⏰ Süre Doldu</span>}
            </div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", lineHeight: 1.3, marginBottom: "8px" }}>
              {market.title}
            </h1>
            {market.description && (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                {market.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "10px", padding: "6px 12px" }}>
            <Users size={12} color="#34d399" />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Toplam Havuz</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399" }}>
              {market.total_pool.toLocaleString("tr-TR")} kredi
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "6px 12px" }}>
            <Clock size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {isEnded ? "Sona erdi" : countdown}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "6px 12px" }}>
            <TrendingUp size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Fiyatlar dinamik olarak güncellenir
            </span>
          </div>
        </div>
      </div>

      {/* Resolved result */}
      {market.status === "resolved" && market.winning_option_id && (
        <div style={{
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: "12px", padding: "14px 18px", marginBottom: "1.25rem",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <CheckCircle2 size={18} color="#34d399" />
          <div>
            <p style={{ fontWeight: 700, color: "#34d399" }}>Sonuç Açıklandı</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Kazanan: <strong style={{ color: "var(--text)" }}>{options.find((o) => o.id === market.winning_option_id)?.label}</strong>
            </p>
          </div>
        </div>
      )}

      {/* User position result */}
      {market.my_position?.result === "won" && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px", padding: "14px 18px", marginBottom: "1.25rem" }}>
          <p style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>🎉 Kazandınız!</p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {market.my_position.payout?.toLocaleString("tr-TR")} kredi hesabınıza yatırıldı.
          </p>
        </div>
      )}
      {market.my_position?.result === "lost" && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 18px", marginBottom: "1.25rem" }}>
          <p style={{ fontWeight: 700, color: "#f87171", fontSize: "1rem" }}>Kaybettiniz 😔</p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Bahsiniz ({market.my_position.amount.toLocaleString("tr-TR")} kredi) kazanan seçenekte değildi.
          </p>
        </div>
      )}

      {/* Options + bet form layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem", alignItems: "start" }}
        className="market-detail-layout">
        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Seçenekler</h2>
          {options.map((opt) => (
            <OptionRow
              key={opt.id}
              option={opt}
              options={options}
              liquidityConstant={market.liquidity_constant}
              isWinner={opt.id === market.winning_option_id}
              isMyChoice={opt.id === market.my_position?.option_id}
              selected={selectedOptionId === opt.id}
              onSelect={() => {
                if (!canBet) return;
                setSelectedOptionId((prev) => (prev === opt.id ? null : opt.id));
              }}
              disabled={!canBet}
              priceHistory={priceHistoryMap[opt.id] ?? []}
            />
          ))}

          {/* Status messages */}
          {market.status === "closed" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontSize: "0.8rem", marginTop: "4px" }}>
              <Info size={13} />
              <span>Market kapatıldı — sonuç bekleniyor.</span>
            </div>
          )}
          {isEnded && market.status === "open" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontSize: "0.8rem", marginTop: "4px" }}>
              <Clock size={13} />
              <span>Tahmin süresi doldu — admin kararı bekleniyor.</span>
            </div>
          )}
        </div>

        {/* Bet form or position display */}
        <div>
          {market.my_position && market.my_position.result === "pending" ? (
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "12px" }}>Pozisyonunuz</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Seçenek</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#818cf8" }}>
                    {options.find((o) => o.id === market.my_position?.option_id)?.label}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Bahis</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
                    {market.my_position.amount.toLocaleString("tr-TR")} kredi
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Kilitli olasılık</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#34d399" }}>
                    {formatProbability(market.my_position.locked_probability)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: "8px" }}>
                <p style={{ fontSize: "0.72rem", color: "#fb923c" }}>⏳ Sonuç bekleniyor...</p>
              </div>
            </div>
          ) : canBet ? (
            <BetForm
              market={market}
              selectedOptionId={selectedOptionId}
              onSuccess={loadMarket}
            />
          ) : market.status === "open" && !market.my_position ? (
            <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <Clock size={24} color="var(--text-subtle)" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Tahmin süresi sona erdi.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <MarketDetailInner marketId={id} />
    </AuthGuard>
  );
}
