"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const { register } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Şifreler eşleşmiyor"); return; }
    if (form.password.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const result = await register(form.username, form.email, form.password);
    setLoading(false);
    if (result.success) setSuccess(true);
    else setError(result.error || "Hata");
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "var(--bg)" }}>
        <div className="animate-slide-up card" style={{ width: "100%", maxWidth: "420px", padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <CheckCircle size={28} color="#34d399" />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text)" }}>Kayıt Tamamlandı!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Hesabınız oluşturuldu. Giriş yapabilmek için bir admin tarafından onaylanmanız gerekiyor.
          </p>
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "12px", padding: "12px", fontSize: "0.82rem", color: "#fbbf24", marginBottom: "1.5rem" }}>
            ⏳ Hesabınız onay bekliyor.
          </div>
          <Link href="/login" className="btn-primary" style={{ display: "inline-flex" }}>Giriş Sayfasına Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "500px", background: "rgba(16,185,129,0.04)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
      <div className="animate-slide-up" style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>Hesap Oluştur</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>Platforma katıl</p>
        </div>
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "12px", padding: "12px", marginBottom: "1.25rem", fontSize: "0.8rem", color: "#93c5fd" }}>
            📋 Kayıt sonrası admin onayı gereklidir. Onaylandığında 1000 kredi kazanırsın!
          </div>
          <form onSubmit={handleSubmit}>
            {[
              { id: "reg-username", label: "Kullanıcı Adı", type: "text", placeholder: "kucuk_harf_ve_alt_cizgi", key: "username" },
              { id: "reg-email",    label: "E-posta",        type: "email", placeholder: "email@example.com",       key: "email"    },
              { id: "reg-password", label: "Şifre",          type: "password", placeholder: "En az 6 karakter",   key: "password" },
              { id: "reg-confirm",  label: "Şifre Tekrar",   type: "password", placeholder: "••••••••",            key: "confirm"  },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "6px" }}>{f.label}</label>
                <input id={f.id} type={f.type} className="input" placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  required autoFocus={f.key === "username"} />
              </div>
            ))}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <button id="register-submit" type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              {loading ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} className="animate-spin" />Kaydediliyor...</> : "Kayıt Ol"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
            Zaten hesabın var mı?{" "}
            <Link href="/login" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
