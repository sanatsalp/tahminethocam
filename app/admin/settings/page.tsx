"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Settings, Save, Upload, MessageSquare, MessageSquareOff, Palette, Trophy, Eye, EyeOff, Wrench } from "lucide-react";

export default function AdminSettingsPage() {
  const { currentUser, siteSettings, updateSiteSettings, chatEnabled, toggleChatEnabled } = useApp();
  const router = useRouter();
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(siteSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);

  useEffect(() => { setForm(siteSettings); }, [siteSettings]);

  if (!currentUser || currentUser.role !== "admin") return null;

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setForm(f => ({ ...f, customLogoUrl: reader.result as string })); };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateSiteSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const EMOJI_OPTIONS = ["🎾","🏆","⚡","🔥","🎯","🌟","🏅","🎪","🎮","🎲"];

  return (
    <div className="animate-fade-in" style={{ maxWidth: "680px", margin: "0 auto", padding: "2rem 1rem" }}>
      <Link href="/admin"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px",
          color: "var(--text-muted)", textDecoration: "none", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
        <ArrowLeft size={15} /> Admin Paneli
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "2rem" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "14px",
          background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Settings size={22} color="#c084fc" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)" }}>Site Ayarları</h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Marka, logo ve genel ayarlar</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Branding */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
            <Palette size={16} color="#c084fc" />
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Marka & Logo</h2>
          </div>

          {/* Live preview */}
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "14px", marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px",
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", overflow: "hidden" }}>
              {form.customLogoUrl
                ? <img src={form.customLogoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : form.logoEmoji}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>
                {form.title || "tahminethocam"}<span style={{ color: "#10b981" }}>.</span>
              </p>
              {form.subtitle && <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{form.subtitle}</p>}
            </div>
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-subtle)" }}>Önizleme</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Site Adı
              </label>
              <input type="text" className="input" placeholder="tahminethocam"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Alt Başlık
              </label>
              <input type="text" className="input" placeholder="ODTÜ Tahmin Platformu"
                value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
            </div>
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Logo Emojisi
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} type="button" onClick={() => setForm(f => ({ ...f, logoEmoji: emoji, customLogoUrl: undefined }))}
                  style={{
                    width: "38px", height: "38px", borderRadius: "10px", fontSize: "18px",
                    border: form.logoEmoji === emoji && !form.customLogoUrl
                      ? "2px solid #10b981" : "1px solid var(--border)",
                    background: form.logoEmoji === emoji && !form.customLogoUrl
                      ? "rgba(16,185,129,0.12)" : "var(--surface-3)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Özel Logo (PNG/JPG)
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="button" onClick={() => logoFileRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-3)",
                  border: "1px solid var(--border)", borderRadius: "10px", padding: "8px 14px",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem" }}>
                <Upload size={14} /> Logo Yükle
              </button>
              {form.customLogoUrl && (
                <>
                  <img src={form.customLogoUrl} alt="logo preview"
                    style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)" }} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, customLogoUrl: undefined }))}
                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.78rem" }}>
                    Kaldır
                  </button>
                </>
              )}
            </div>
            <input ref={logoFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Chat settings */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <MessageSquare size={16} color="#c084fc" />
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Sohbet Ayarları</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
            <div>
              <p style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>Topluluk Sohbeti</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {chatEnabled ? "✅ Aktif" : "❌ Kapalı"}
              </p>
            </div>
            <button type="button" onClick={toggleChatEnabled}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "10px", fontWeight: 600, fontSize: "0.82rem",
                cursor: "pointer", transition: "all 0.2s",
                background: chatEnabled ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                border: `1px solid ${chatEnabled ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
                color: chatEnabled ? "#f87171" : "#34d399",
              }}>
              {chatEnabled ? <><MessageSquareOff size={14} />Kapat</> : <><MessageSquare size={14} />Aç</>}
            </button>
          </div>
        </div>

        {/* Tower Game settings */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <Trophy size={16} color="#fbbf24" />
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Tower Game Ayarları</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
              <div>
                <p style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>Tower Game Aktif</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {form.towerGameEnabled ? "✅ Aktif" : "❌ Kapalı"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !form.towerGameEnabled;
                  setForm((f) => ({ ...f, towerGameEnabled: next }));
                  await updateSiteSettings({ towerGameEnabled: next });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: form.towerGameEnabled ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${form.towerGameEnabled ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                  color: form.towerGameEnabled ? "#34d399" : "#f87171",
                }}
              >
                {form.towerGameEnabled ? "Kapat" : "Aç"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
              <div>
                <p style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>Görünürlük</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {form.towerGameVisible ? "👁️ Görünür" : "🙈 Gizli"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !form.towerGameVisible;
                  setForm((f) => ({ ...f, towerGameVisible: next }));
                  await updateSiteSettings({ towerGameVisible: next });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: form.towerGameVisible ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.12)",
                  border: `1px solid ${form.towerGameVisible ? "rgba(16,185,129,0.25)" : "rgba(148,163,184,0.25)"}`,
                  color: form.towerGameVisible ? "#34d399" : "var(--text-muted)",
                }}
              >
                {form.towerGameVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                {form.towerGameVisible ? "Gizle" : "Göster"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
              <div>
                <p style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>Bakım Modu</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {form.towerGameMaintenance ? "🛠️ Bakımda" : "✅ Aktif"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !form.towerGameMaintenance;
                  setForm((f) => ({ ...f, towerGameMaintenance: next }));
                  await updateSiteSettings({ towerGameMaintenance: next });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: form.towerGameMaintenance ? "rgba(249,115,22,0.12)" : "rgba(16,185,129,0.1)",
                  border: `1px solid ${form.towerGameMaintenance ? "rgba(249,115,22,0.25)" : "rgba(16,185,129,0.25)"}`,
                  color: form.towerGameMaintenance ? "#fb923c" : "#34d399",
                }}
              >
                <Wrench size={14} />
                {form.towerGameMaintenance ? "Kapat" : "Aç"}
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Maksimum Bahis (kredi)
              </label>
              <input
                type="number"
                className="input"
                min={1}
                value={form.towerGameMaxBetAmount ?? 50}
                onChange={(e) => setForm((f) => ({ ...f, towerGameMaxBetAmount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Günlük Oyun Limiti
              </label>
              <input
                type="number"
                className="input"
                min={1}
                value={form.towerGameDailyPlayLimit ?? 3}
                onChange={(e) => setForm((f) => ({ ...f, towerGameDailyPlayLimit: Number(e.target.value) }))}
              />
            </div>
          </div>

          <p style={{ marginTop: "10px", fontSize: "0.75rem", color: "var(--text-subtle)" }}>
            Not: Tower Game, ana tahmin sistemini etkilemez. Kazançlar limitli çarpanla kısıtlanır.
          </p>
        </div>

        {/* Save */}
        <button type="submit" className="btn-primary" style={{ padding: "0.875rem", fontSize: "0.95rem" }}>
          {saved
            ? <><span>✅</span> Kaydedildi!</>
            : <><Save size={16} /> Değişiklikleri Kaydet</>}
        </button>
      </form>
    </div>
  );
}
