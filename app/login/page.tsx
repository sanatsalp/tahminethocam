"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, siteSettings } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(username.trim(), password);
    setLoading(false);
    if (result.success) router.push("/dashboard");
    else setError(result.error || "Hata");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Glow */}
      <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "500px", background: "rgba(16,185,129,0.04)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />

      <div className="animate-slide-up" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "18px",
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
            fontSize: "28px", marginBottom: "1rem",
            overflow: "hidden",
          }}>
            {siteSettings.customLogoUrl
              ? <img src={siteSettings.customLogoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : siteSettings.logoEmoji}
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>
            {siteSettings.title}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            {siteSettings.subtitle}
          </p>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text)" }}>Giriş Yap</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>Kullanıcı Adı</label>
              <input id="username" type="text" className="input" placeholder="kullanici_adi"
                value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>Şifre</label>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPw ? "text" : "password"} className="input"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  required style={{ paddingRight: "2.75rem" }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-subtle)", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <button id="login-submit" type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              {loading ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} className="animate-spin" /> Giriş yapılıyor...</> : "Giriş Yap"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
            Hesabın yok mu?{" "}
            <Link href="/register" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>Kayıt Ol</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
