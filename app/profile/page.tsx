"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Wallet, History, CheckCircle, XCircle, Clock, Camera, TrendingUp, TrendingDown, Minus } from "lucide-react";

function ResultBadge({ result }: { result: string }) {
  if (result === "won") return <span className="badge-won"><CheckCircle size={10} />Kazandı</span>;
  if (result === "lost") return <span className="badge-lost"><XCircle size={10} />Kaybetti</span>;
  return <span className="badge-pending"><Clock size={10} />Bekliyor</span>;
}

function TxIcon({ type }: { type: string }) {
  if (type === "win") return <TrendingUp size={14} color="#34d399" />;
  if (type === "prediction") return <TrendingDown size={14} color="#f87171" />;
  return <TrendingUp size={14} color="#60a5fa" />;
}

export default function ProfilePage() {
  const { currentUser, getUserPredictions, transactions, setUserAvatar } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!currentUser) router.replace("/login"); }, [currentUser, router]);
  if (!currentUser) return null;

  const myPredictions = getUserPredictions(currentUser.id);
  const myTxs = transactions
    .filter(t => t.user_id === currentUser.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const wonCount = myPredictions.filter(p => p.result === "won").length;
  const lostCount = myPredictions.filter(p => p.result === "lost").length;
  const settled = myPredictions.filter(p => p.result !== "pending").length;
  const winRate = settled > 0 ? Math.round((wonCount / settled) * 100) : 0;
  const totalWon = myTxs.filter(t => t.type === "win").reduce((s, t) => s + t.amount, 0);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!currentUser?.id) return;
    const userId = currentUser.id;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setUserAvatar(userId, reader.result as string); };
    reader.readAsDataURL(file);
  }

  const statCards = [
    { label: "Toplam Tahmin", value: myPredictions.length, color: "var(--text)" },
    { label: "Kazanılan",     value: wonCount,              color: "#34d399" },
    { label: "Kaybedilen",    value: lostCount,             color: "#f87171" },
    { label: "Kazanma %",     value: `%${winRate}`,         color: winRate >= 50 ? "#34d399" : "#f87171" },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Profile Card */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
              background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentUser.avatarUrl
                ? <img src={currentUser.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399" }}>
                    {currentUser.username[0].toUpperCase()}
                  </span>}
            </div>
            <button onClick={() => fileRef.current?.click()}
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: "24px", height: "24px", borderRadius: "50%",
                background: "#10b981", border: "2px solid var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }} title="Fotoğraf değiştir">
              <Camera size={11} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)" }}>{currentUser.username}</h1>
              <span className={currentUser.role === "admin" ? "badge-admin" : "badge-user"}>
                {currentUser.role === "admin" ? "🛡️ Admin" : "🎾 Kullanıcı"}
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>{currentUser.email}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)",
              borderRadius: "10px", padding: "8px 14px", width: "fit-content" }}>
              <Wallet size={15} color="#34d399" />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bakiye</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: "1rem" }}>
                {currentUser.credits.toLocaleString("tr-TR")}
              </span>
              <span style={{ color: "var(--text-subtle)", fontSize: "0.8rem" }}>kredi</span>
            </div>
          </div>

          {/* Total won */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Toplam Kazanç</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#34d399" }}>+{totalWon.toLocaleString("tr-TR")}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "1.25rem" }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Prediction History */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <History size={16} color="var(--text-muted)" />
          <h2 style={{ fontWeight: 600, color: "var(--text)" }}>Tahmin Geçmişi</h2>
        </div>
        {myPredictions.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-subtle)", padding: "2.5rem", fontSize: "0.875rem" }}>
            Henüz tahmin yapmadınız.
          </p>
        ) : (
          myPredictions.map(pred => (
            <div key={pred.id} style={{ display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: pred.result === "won" ? "rgba(16,185,129,0.12)" : pred.result === "lost" ? "rgba(239,68,68,0.12)" : "var(--surface-3)",
                border: `1px solid ${pred.result === "won" ? "rgba(16,185,129,0.25)" : pred.result === "lost" ? "rgba(239,68,68,0.25)" : "var(--border)"}`,
              }}>
                {pred.result === "won" ? <CheckCircle size={16} color="#34d399" /> :
                 pred.result === "lost" ? <XCircle size={16} color="#f87171" /> :
                 <Clock size={16} color="var(--text-subtle)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pred.match?.player_a} vs {pred.match?.player_b}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {pred.choice === "A" ? pred.match?.player_a : pred.match?.player_b} — {pred.amount.toLocaleString("tr-TR")} kredi
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <ResultBadge result={pred.result} />
                {pred.result === "won" && (
                  <p style={{ fontSize: "0.72rem", color: "#34d399", marginTop: "3px" }}>+{pred.potential_win.toLocaleString("tr-TR")}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transactions */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <Wallet size={16} color="var(--text-muted)" />
          <h2 style={{ fontWeight: 600, color: "var(--text)" }}>Kredi Hareketleri</h2>
        </div>
        {myTxs.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-subtle)", padding: "2.5rem", fontSize: "0.875rem" }}>Hareket yok.</p>
        ) : myTxs.map(tx => (
          <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px",
            padding: "11px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--surface-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TxIcon type={tx.type} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{new Date(tx.created_at).toLocaleDateString("tr-TR")}</p>
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", flexShrink: 0, color: tx.amount > 0 ? "#34d399" : "#f87171" }}>
              {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
