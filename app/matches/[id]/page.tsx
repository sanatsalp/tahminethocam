"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Trophy, Calendar, ArrowLeft, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

export default function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { currentUser, matches, predictions, placePrediction, ensureMatchDetailData } = useApp();
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    setMatchLoading(true);
    void ensureMatchDetailData(params.id)
      .catch(() => {})
      .finally(() => {
        if (alive) setMatchLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentUser, params.id, ensureMatchDetailData]);

  const match = matches.find(m => m.id === params.id);
  if (!currentUser) return <AuthGuard><></></AuthGuard>;
  if (!match && matchLoading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: "640px", margin: "0 auto", padding: "1.75rem 1rem" }}>
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ height: "14px", width: "60%", background: "var(--surface-3)", borderRadius: "8px", marginBottom: "12px" }} />
          <div style={{ height: "22px", width: "85%", background: "var(--surface-3)", borderRadius: "8px", marginBottom: "24px" }} />
          <div style={{ height: "140px", background: "var(--surface-3)", borderRadius: "14px" }} />
          <div style={{ height: "12px", width: "40%", background: "var(--surface-3)", borderRadius: "8px", marginTop: "18px" }} />
        </div>
      </div>
    );
  }
  if (!match) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: "640px", margin: "0 auto", padding: "1.75rem 1rem" }}>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Maç bulunamadı.</p>
        </div>
      </div>
    );
  }

  const myPred = predictions.find(p => p.match_id === params.id && p.user_id === currentUser.id);
  const odds = selected === "A" ? match.odds_a : selected === "B" ? match.odds_b : null;
  const potentialWin = odds && amount ? Math.round(Number(amount) * odds) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError("Bir oyuncu seçin"); return; }
    const amt = Number(amount);
    if (!amt || amt < 10) { setError("En az 10 kredi giriniz"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const result = await placePrediction(params.id, selected, amt);
    setLoading(false);
    if (result.success) { setSuccess(true); setError(""); }
    else setError(result.error || "Hata");
  }

  function PlayerCard({ side }: { side: "A" | "B" }) {
    const name = side === "A" ? match!.player_a : match!.player_b;
    const img  = side === "A" ? match!.player_a_img : match!.player_b_img;
    const ods  = side === "A" ? match!.odds_a : match!.odds_b;
    const color = side === "A" ? "#10b981" : "#3b82f6";
    const isSelected = selected === side;
    const isWinner = match!.winner === side;
    const canSelect = match!.status === "open" && !myPred;

    return (
      <button onClick={() => canSelect && setSelected(side)} disabled={!canSelect}
        style={{
          flex: 1, borderRadius: "18px", padding: "1.5rem 1rem", textAlign: "center",
          border: `2px solid ${isSelected ? color : isWinner ? `${color}60` : "var(--border)"}`,
          background: isSelected ? `${color}12` : isWinner ? `${color}08` : "var(--surface-2)",
          cursor: canSelect ? "pointer" : "default", transition: "all 0.2s",
          boxShadow: isSelected ? `0 0 24px ${color}25` : "none",
        }}>
        {/* Avatar */}
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden",
          margin: "0 auto 12px", background: `${color}18`, border: `2px solid ${color}35`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {img
            ? <img src={img} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.75rem", fontWeight: 700, color }}>{name[0]}</span>}
        </div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: "4px" }}>{name}</p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>Oran</p>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: isSelected ? color : "var(--text)" }}>
          {ods.toFixed(2)}<span style={{ fontSize: "1rem" }}>x</span>
        </div>
        {isWinner && (
          <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "5px", color: "#34d399", fontSize: "0.82rem", fontWeight: 600 }}>
            <CheckCircle size={14} /> Kazandı
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "640px", margin: "0 auto", padding: "1.75rem 1rem" }}>
      <Link href="/dashboard"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px",
          color: "var(--text-muted)", textDecoration: "none", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
        <ArrowLeft size={15} /> Geri Dön
      </Link>

      {/* Match card */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <Trophy size={13} color="#34d399" style={{ opacity: 0.7 }} />
            {match.tournament}
          </div>
          {match.status === "open"     && <span className="badge-open">🟢 Tahminler Açık</span>}
          {match.status === "closed"   && <span className="badge-closed">🟡 Kapalı</span>}
          {match.status === "finished" && <span className="badge-finished">⚪ Bitti</span>}
        </div>

        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem", color: "var(--text)" }}>
          {match.title}
        </h1>

        <div className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
          <PlayerCard side="A" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%",
              background: "var(--surface-3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>VS</div>
          </div>
          <PlayerCard side="B" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <Calendar size={13} />
          {new Date(match.scheduled_at).toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Prediction Form */}
      {match.status === "open" && !myPred && !success && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text)" }}>Tahmin Yap</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Seçimim</label>
              <div style={{
                padding: "10px 14px", borderRadius: "10px",
                background: selected ? "rgba(16,185,129,0.08)" : "var(--surface-2)",
                border: `1px solid ${selected ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                fontSize: "0.88rem", color: selected ? "#34d399" : "var(--text-subtle)",
              }}>
                {selected
                  ? `${selected === "A" ? match.player_a : match.player_b} (${(selected === "A" ? match.odds_a : match.odds_b).toFixed(2)}x)`
                  : "Yukarıdan bir oyuncu seçin"}
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Kredi Miktarı</label>
              <div style={{ position: "relative" }}>
                <input id="bet-amount" type="number" className="input" placeholder="100"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  min={10} max={currentUser.credits} style={{ paddingRight: "5rem" }} />
                <button type="button" onClick={() => setAmount(String(currentUser.credits))}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                    fontSize: "0.72rem", color: "#34d399", background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)", padding: "3px 8px", borderRadius: "7px",
                    cursor: "pointer" }}>Tümü</button>
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginTop: "4px" }}>
                Bakiye: {currentUser.credits.toLocaleString("tr-TR")} kredi
              </p>
            </div>

            {potentialWin && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "12px", padding: "12px 16px", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#34d399" }}>
                  <Zap size={14} /> Potansiyel Kazanç
                </div>
                <span style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem" }}>
                  {potentialWin.toLocaleString("tr-TR")} kredi
                </span>
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <button id="submit-prediction" type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              {loading
                ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} className="animate-spin" />Tahmin Yapılıyor...</>
                : "Tahmin Yap"}
            </button>
          </form>
        </div>
      )}

      {/* My prediction */}
      {myPred && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text)" }}>Tahmininiz</h2>
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "1rem" }}>
            {[
              { label: "Seçim",           value: myPred.choice === "A" ? match.player_a : match.player_b },
              { label: "Miktar",          value: `${myPred.amount.toLocaleString("tr-TR")} kredi` },
              { label: "Potansiyel Kazanç", value: `${myPred.potential_win.toLocaleString("tr-TR")} kredi`, color: "#34d399" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{r.label}</span>
                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: (r as any).color || "var(--text)" }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Durum</span>
              {myPred.result === "pending" && <span className="badge-pending"><Clock size={10} />Bekleniyor</span>}
              {myPred.result === "won"     && <span className="badge-won"><CheckCircle size={10} />Kazandı!</span>}
              {myPred.result === "lost"    && <span className="badge-lost"><XCircle size={10} />Kaybetti</span>}
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {success && (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%",
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <CheckCircle size={28} color="#34d399" />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "6px", color: "var(--text)" }}>Tahmin Yapıldı!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>Maç sonucunu bekleyin!</p>
          <Link href="/dashboard" className="btn-primary">Dashboard'a Dön</Link>
        </div>
      )}

      {match.status !== "open" && !myPred && !success && (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <XCircle size={22} color="var(--text-subtle)" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Bu maç için tahmin süresi dolmuş.</p>
        </div>
      )}
    </div>
  );
}
