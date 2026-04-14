"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Trophy, LayoutDashboard, User, Shield, LogOut, Menu, X, MessageSquare, Sun, Moon, Settings, BarChart2 } from "lucide-react";
import { useState } from "react";

function Avatar({ user, size = "sm" }: { user: { username: string; avatarUrl?: string }; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (user.avatarUrl) {
    return (
      <img src={user.avatarUrl} alt={user.username} className={`${dim} rounded-full object-cover border border-emerald-500/30`} />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400`}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

export default function Navbar() {
  const { currentUser, siteSettings, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); router.push("/login"); setMenuOpen(false); };

  const navLinks = [
    { href: "/dashboard",   label: "Dashboard",  icon: <LayoutDashboard size={15} /> },
    { href: "/markets",     label: "Tahminler",  icon: <BarChart2 size={15} /> },
    { href: "/leaderboard", label: "Sıralama",   icon: <Trophy size={15} /> },
    { href: "/chat",        label: "Sohbet",      icon: <MessageSquare size={15} /> },
    { href: "/profile",     label: "Profil",      icon: <User size={15} /> },
    ...(currentUser?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: <Shield size={15} /> }]
      : []),
  ];

  if (!currentUser) return null;

  const logoUrl = siteSettings.customLogoUrl;

  return (
    <nav className="navbar">
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "10px",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
              overflow: "hidden",
            }}>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{siteSettings.logoEmoji}</span>
              }
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
                {siteSettings.title}<span style={{ color: "#10b981" }}>.</span>
              </span>
              {siteSettings.subtitle && (
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1, marginTop: "1px" }}>
                  {siteSettings.subtitle}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop Nav */}
          <div style={{ alignItems: "center", gap: "2px" }} className="hidden md:flex">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 500,
                  textDecoration: "none", transition: "all 0.2s",
                  background: pathname.startsWith(link.href) ? "rgba(16,185,129,0.12)" : "transparent",
                  color: pathname.startsWith(link.href) ? "#34d399" : "var(--text-muted)",
                  border: pathname.startsWith(link.href) ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent",
                }}
              >
                {link.icon}{link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Credit badge */}
            <div className="hidden sm:flex" style={{
              alignItems: "center", gap: "6px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)",
              borderRadius: "10px", padding: "5px 12px",
            }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Kredi</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.9rem" }}>
                {currentUser.credits.toLocaleString("tr-TR")}
              </span>
            </div>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              style={{
                background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "8px",
                color: "var(--text-muted)", padding: "6px", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", transition: "all 0.2s",
              }}
              title={theme === "dark" ? "Açık mod" : "Koyu mod"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User avatar (desktop) */}
            <div className="hidden sm:flex" style={{ alignItems: "center", gap: "8px" }}>
              <Avatar user={currentUser} />
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {currentUser.username}
              </span>
            </div>

            {/* Logout (desktop) */}
            <button onClick={handleLogout} className="hidden sm:flex"
              style={{ background: "none", border: "none", color: "var(--text-subtle)", cursor: "pointer",
                padding: "6px", borderRadius: "8px", alignItems: "center", transition: "color 0.2s" }}
              title="Çıkış Yap"
            >
              <LogOut size={15} />
            </button>

            {/* Mobile burger */}
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: "60px", left: 0, width: "100%",
          borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
          background: "var(--surface)", padding: "12px 16px 16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)", zIndex: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
            paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <Avatar user={currentUser} size="md" />
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>{currentUser.username}</p>
              <p style={{ fontSize: "0.75rem", color: "#34d399" }}>{currentUser.credits.toLocaleString("tr-TR")} kredi</p>
            </div>
          </div>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
                borderRadius: "10px", fontSize: "0.88rem", fontWeight: 500, textDecoration: "none",
                marginBottom: "2px", transition: "all 0.2s",
                background: pathname.startsWith(link.href) ? "rgba(16,185,129,0.12)" : "transparent",
                color: pathname.startsWith(link.href) ? "#34d399" : "var(--text-muted)",
              }}
            >
              {link.icon}{link.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            style={{
              display: "flex", width: "100%", alignItems: "center", gap: "8px",
              padding: "10px 12px", borderRadius: "10px", fontSize: "0.88rem", fontWeight: 500,
              marginTop: "8px", background: "rgba(239,68,68,0.08)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
            }}
          >
            <LogOut size={16} />Çıkış Yap
          </button>
        </div>
      )}
    </nav>
  );
}
