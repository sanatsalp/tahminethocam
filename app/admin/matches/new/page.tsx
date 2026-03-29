"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, PlusCircle, Upload } from "lucide-react";

export default function NewMatchPage() {
  const { currentUser, createMatch } = useApp();
  const router = useRouter();
  const imgARef = useRef<HTMLInputElement>(null);
  const imgBRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", player_a: "", player_b: "",
    odds_a: "1.80", odds_b: "2.00",
    tournament: "ODTÜ Open 2024",
    scheduled_at: "",
    player_a_img: "" as string | undefined,
    player_b_img: "" as string | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "admin") return null;

  function handleImgUpload(side: "a" | "b") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const key = side === "a" ? "player_a_img" : "player_b_img";
        setForm(f => ({ ...f, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    createMatch({
      title: form.title || `${form.player_a} vs ${form.player_b}`,
      player_a: form.player_a, player_b: form.player_b,
      odds_a: Number(form.odds_a), odds_b: Number(form.odds_b),
      tournament: form.tournament,
      scheduled_at: form.scheduled_at || new Date().toISOString(),
      player_a_img: form.player_a_img || undefined,
      player_b_img: form.player_b_img || undefined,
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push("/admin"), 1400);
  }

  function PlayerImgField({ side }: { side: "a" | "b" }) {
    const ref = side === "a" ? imgARef : imgBRef;
    const img = side === "a" ? form.player_a_img : form.player_b_img;
    const name = side === "a" ? form.player_a : form.player_b;
    const color = side === "a" ? "#10b981" : "#3b82f6";

    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
          background: `${color}12`, border: `2px solid ${color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 8px", cursor: "pointer" }}
          onClick={() => ref.current?.click()}>
          {img
            ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ textAlign: "center" }}>
                <Upload size={18} color={color} style={{ opacity: 0.6 }} />
                {name && <p style={{ fontSize: "1rem", fontWeight: 700, color, marginTop: "2px" }}>{name[0]}</p>}
              </div>}
        </div>
        <button type="button" onClick={() => ref.current?.click()}
          style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
          {img ? "Değiştir" : "Fotoğraf ekle"}
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImgUpload(side)} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "580px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/admin"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px",
          color: "var(--text-muted)", textDecoration: "none", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
        <ArrowLeft size={15} /> Admin Paneli
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.75rem" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "12px",
          background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PlusCircle size={20} color="#34d399" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>Yeni Maç Oluştur</h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Tahmin etkinliği ekle</p>
        </div>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎾</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Maç Oluşturuldu!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Admin paneline yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Player images preview + upload */}
            {(form.player_a || form.player_b) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px",
                background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1rem" }}>
                <PlayerImgField side="a" />
                <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700 }}>VS</div>
                <PlayerImgField side="b" />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Oyuncu A *</label>
                <input id="player-a" type="text" className="input" placeholder="Ad Soyad"
                  value={form.player_a} onChange={e => setForm({ ...form, player_a: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Oyuncu B *</label>
                <input id="player-b" type="text" className="input" placeholder="Ad Soyad"
                  value={form.player_b} onChange={e => setForm({ ...form, player_b: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Oran A *</label>
                <input id="odds-a" type="number" step="0.01" min="1.01" max="20" className="input"
                  value={form.odds_a} onChange={e => setForm({ ...form, odds_a: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Oran B *</label>
                <input id="odds-b" type="number" step="0.01" min="1.01" max="20" className="input"
                  value={form.odds_b} onChange={e => setForm({ ...form, odds_b: e.target.value })} required />
              </div>
            </div>

            {/* Live preview */}
            {form.player_a && form.player_b && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "12px 16px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{form.player_a}</p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10b981" }}>{Number(form.odds_a).toFixed(2)}x</p>
                </div>
                <div style={{ color: "var(--text-subtle)", fontWeight: 700, fontSize: "0.72rem" }}>VS</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{form.player_b}</p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#3b82f6" }}>{Number(form.odds_b).toFixed(2)}x</p>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Maç Başlığı</label>
              <input id="match-title" type="text" className="input" placeholder="örn. Çeyrek Final - A Grubu"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Turnuva</label>
              <input id="tournament" type="text" className="input"
                value={form.tournament} onChange={e => setForm({ ...form, tournament: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Tarih / Saat</label>
              <input id="scheduled-at" type="datetime-local" className="input"
                value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>

            <button id="create-match-submit" type="submit" disabled={loading} className="btn-primary"
              style={{ padding: "0.8rem", marginTop: "4px", fontSize: "0.95rem" }}>
              {loading
                ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} className="animate-spin" />Oluşturuluyor...</>
                : <><PlusCircle size={16} />Maç Oluştur</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
