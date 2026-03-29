"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { Shield, Users, Trophy, PlusCircle, CheckCircle, XCircle, Trash2, Ban, RotateCcw, Coins, MinusCircle, MessageSquare, MessageSquareOff, Settings } from "lucide-react";
import { Profile, Match } from "@/lib/mock-data";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);
  if (!currentUser || currentUser.role !== "admin") return null;
  return <>{children}</>;
}

function Avatar({ user, size = 36 }: { user: Profile; size?: number }) {
  const colors = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444"];
  const color = colors[user.username.charCodeAt(0) % colors.length];
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.username}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-str)", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38,
      color, flexShrink: 0 }}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

function UserCard({ user }: { user: Profile }) {
  const { approveUser, rejectUser, deleteUser, blockUser, unblockUser, blockUserFromChat, unblockUserFromChat, addCredits, removeCredits } = useApp();
  const [creditAmt, setCreditAmt] = useState("");
  const [creditMode, setCreditMode] = useState<"add" | "remove" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleCredit = () => {
    const amt = Number(creditAmt);
    if (!amt || amt <= 0) return;
    if (creditMode === "add") addCredits(user.id, amt);
    else if (creditMode === "remove") removeCredits(user.id, amt);
    setCreditAmt(""); setCreditMode(null);
  };

  const roleBadge = () => {
    if (user.role === "admin")   return <span className="badge-admin">🛡️ Admin</span>;
    if (user.role === "pending") return <span className="badge-pending">⏳ Bekliyor</span>;
    if (user.role === "blocked") return <span className="badge-blocked">🚫 Engelli</span>;
    return <span className="badge-user">✓ Kullanıcı</span>;
  };

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px",
      padding: "14px", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Avatar user={user} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>{user.username}</span>
            {roleBadge()}
            {user.chatBlocked && <span style={{ fontSize: "0.65rem", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px", padding: "1px 7px" }}>chat yasak</span>}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>{user.email}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontWeight: 700, color: "#34d399", fontSize: "0.95rem" }}>{user.credits.toLocaleString("tr-TR")}</p>
          <p style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>kredi</p>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "8px",
            padding: "5px 10px", cursor: "pointer", fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
          {expanded ? "Kapat" : "İşlemler"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {user.role === "pending" && (
            <>
              <button onClick={() => approveUser(user.id)} id={`approve-${user.id}`}
                style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px", padding: "5px 12px",
                  color: "#34d399", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
                <CheckCircle size={12} /> Onayla
              </button>
              <button onClick={() => rejectUser(user.id)} id={`reject-${user.id}`}
                style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "5px 12px",
                  color: "#f87171", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
                <XCircle size={12} /> Reddet
              </button>
            </>
          )}

          {user.role === "user" && (
            <button onClick={() => blockUser(user.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "5px 12px",
                color: "#f87171", cursor: "pointer", fontSize: "0.78rem" }}>
              <Ban size={12} /> Engelle (Site)
            </button>
          )}

          {user.role === "blocked" && (
            <button onClick={() => unblockUser(user.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "5px 12px",
                color: "#34d399", cursor: "pointer", fontSize: "0.78rem" }}>
              <RotateCcw size={12} /> Engeli Kaldır
            </button>
          )}

          {(user.role === "user" || user.role === "blocked") && !user.chatBlocked && (
            <button onClick={() => blockUserFromChat(user.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.2)", borderRadius: "8px", padding: "5px 12px",
                color: "#fb923c", cursor: "pointer", fontSize: "0.78rem" }}>
              <MessageSquareOff size={12} /> Chat Yasakla
            </button>
          )}
          {user.chatBlocked && (
            <button onClick={() => unblockUserFromChat(user.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "5px 12px",
                color: "#34d399", cursor: "pointer", fontSize: "0.78rem" }}>
              <MessageSquare size={12} /> Chat Yasağını Kaldır
            </button>
          )}

          <button onClick={() => setCreditMode(creditMode === "add" ? null : "add")}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", padding: "5px 12px",
              color: "#60a5fa", cursor: "pointer", fontSize: "0.78rem" }}>
            <Coins size={12} /> Kredi Ekle
          </button>
          <button onClick={() => setCreditMode(creditMode === "remove" ? null : "remove")}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "5px 12px",
              color: "#f87171", cursor: "pointer", fontSize: "0.78rem" }}>
            <MinusCircle size={12} /> Kredi Kes
          </button>
          <button onClick={() => { if (confirm(`${user.username} silinsin mi?`)) deleteUser(user.id); }}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "5px 12px",
              color: "#f87171", cursor: "pointer", fontSize: "0.78rem", marginLeft: "auto" }}>
            <Trash2 size={12} /> Sil
          </button>

          {creditMode && (
            <div style={{ width: "100%", display: "flex", gap: "6px", marginTop: "4px" }}>
              <input type="number" className="input" style={{ flex: 1, padding: "6px 10px", fontSize: "0.82rem" }}
                placeholder={creditMode === "add" ? "Eklenecek miktar..." : "Kesilecek miktar..."}
                value={creditAmt} onChange={e => setCreditAmt(e.target.value)} />
              <button onClick={handleCredit} className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                {creditMode === "add" ? "Ekle" : "Kes"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const { closeMatch, deleteMatch } = useApp();
  const [showWinner, setShowWinner] = useState(false);
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>
            {match.player_a} vs {match.player_b}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{match.tournament} · {match.title}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
          {match.status === "open"     && <span className="badge-open">Açık</span>}
          {match.status === "closed"   && <span className="badge-closed">Kapalı</span>}
          {match.status === "finished" && <span className="badge-finished">Bitti</span>}
          {match.winner && <span style={{ fontSize: "0.72rem", color: "#34d399" }}>
            🏆 {match.winner === "A" ? match.player_a : match.player_b}
          </span>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          A: <strong style={{ color: "var(--text)" }}>{match.odds_a.toFixed(2)}</strong> &nbsp;
          B: <strong style={{ color: "var(--text)" }}>{match.odds_b.toFixed(2)}</strong>
        </span>
        {match.status !== "finished" && !showWinner && (
          <button onClick={() => setShowWinner(true)}
            style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)", borderRadius: "7px", padding: "4px 10px",
              color: "#fb923c", cursor: "pointer", fontSize: "0.75rem" }}>
            🏆 Maçı Bitir
          </button>
        )}
        {showWinner && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: 1 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Kazanan:</span>
            <button onClick={() => { closeMatch(match.id, "A"); setShowWinner(false); }}
              style={{ flex: 1, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: "7px", padding: "4px 8px", color: "#34d399", cursor: "pointer", fontSize: "0.75rem" }}>
              {match.player_a}
            </button>
            <button onClick={() => { closeMatch(match.id, "B"); setShowWinner(false); }}
              style={{ flex: 1, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: "7px", padding: "4px 8px", color: "#60a5fa", cursor: "pointer", fontSize: "0.75rem" }}>
              {match.player_b}
            </button>
            <button onClick={() => setShowWinner(false)}
              style={{ background: "none", border: "none", color: "var(--text-subtle)", cursor: "pointer", fontSize: "0.75rem" }}>
              İptal
            </button>
          </div>
        )}
        <button onClick={() => { if (confirm("Maç silinsin mi?")) deleteMatch(match.id); }}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-subtle)",
            cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
          title="Maçı sil">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ChatModPanel() {
  const { chatMessages, chatEnabled, toggleChatEnabled, deleteChatMessage, blockUserFromChat, unblockUserFromChat, users } = useApp();

  const chatBlockedUsers = users.filter(u => u.chatBlocked);

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px",
        padding: "14px", marginBottom: "12px" }}>
        <div>
          <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>Sohbet Durumu</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {chatEnabled ? "Sohbet aktif — tüm kullanıcılar mesaj gönderebilir" : "Sohbet kapalı — kimse mesaj gönderemiyor"}
          </p>
        </div>
        <button onClick={toggleChatEnabled} className="btn-primary" style={{
          background: chatEnabled ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
          color: chatEnabled ? "#f87171" : "#34d399",
          border: `1px solid ${chatEnabled ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          boxShadow: "none",
        }}>
          {chatEnabled ? <><MessageSquareOff size={14} /> Kapat</> : <><MessageSquare size={14} /> Aç</>}
        </button>
      </div>

      {/* Chat blocked users */}
      {chatBlockedUsers.length > 0 && (
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px",
          padding: "14px", marginBottom: "12px" }}>
          <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.88rem", marginBottom: "10px" }}>
            Chat Yasaklı Kullanıcılar ({chatBlockedUsers.length})
          </p>
          {chatBlockedUsers.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{u.username}</span>
              <button onClick={() => unblockUserFromChat(u.id)}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)", borderRadius: "7px", padding: "4px 10px",
                  color: "#34d399", cursor: "pointer", fontSize: "0.75rem" }}>
                <RotateCcw size={11} /> Yasağı Kaldır
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent messages */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.88rem", marginBottom: "10px" }}>
          Tüm Mesajlar ({chatMessages.length})
        </p>
        <div style={{ maxHeight: "400px", overflow: "auto" }}>
          {chatMessages.length === 0 && <p style={{ color: "var(--text-subtle)", fontSize: "0.82rem" }}>Mesaj yok.</p>}
          {[...chatMessages].reverse().map(msg => (
            <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px",
              padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#34d399" }}>{msg.username}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>
                    {new Date(msg.created_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text)", marginTop: "2px", wordBreak: "break-word" }}>{msg.text}</p>
              </div>
              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <button onClick={() => { const u = users.find(u => u.id === msg.user_id); if (u) blockUserFromChat(u.id); }}
                  title="Kullanıcıyı chat'ten engelle"
                  style={{ background: "none", border: "none", color: "var(--text-subtle)", cursor: "pointer", padding: "3px" }}>
                  <Ban size={12} />
                </button>
                <button onClick={() => deleteChatMessage(msg.id)} title="Mesajı sil"
                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "3px" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type TabId = "users" | "matches" | "chat";

export default function AdminPage() {
  const { users, matches, chatMessages, chatEnabled } = useApp();
  const [tab, setTab] = useState<TabId>("users");

  const pendingUsers = users.filter(u => u.role === "pending");
  const allUsers = users.filter(u => u.role !== "admin");

  const tabs: { id: TabId; label: string; badge?: number; icon: React.ReactNode }[] = [
    { id: "users",   label: "Kullanıcılar", badge: pendingUsers.length || undefined, icon: <Users size={14} /> },
    { id: "matches", label: "Maçlar",       icon: <Trophy size={14} /> },
    { id: "chat",    label: "Sohbet",        icon: <MessageSquare size={14} /> },
  ];

  return (
    <AdminGuard>
      <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px",
              background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={22} color="#c084fc" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)" }}>Admin Paneli</h1>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Kullanıcı, maç ve sohbet yönetimi</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/admin/settings" style={{ display: "flex", alignItems: "center", gap: "6px",
              background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "10px",
              padding: "8px 14px", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 500 }}>
              <Settings size={14} /> Ayarlar
            </Link>
            <Link href="/admin/matches/new" id="create-match-btn"
              className="btn-primary" style={{ padding: "8px 16px" }}>
              <PlusCircle size={15} /> Yeni Maç
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.25rem" }}>
          {[
            { icon: <Users size={18} color="#60a5fa" />, label: "Toplam Kullanıcı", value: allUsers.length, color: "#60a5fa" },
            { icon: <Shield size={18} color="#fb923c" />, label: "Onay Bekleyen", value: pendingUsers.length, color: "#fb923c" },
            { icon: <Trophy size={18} color="#34d399" />, label: "Toplam Maç", value: matches.length, color: "#34d399" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "1.1rem" }}>
              <div style={{ marginBottom: "8px" }}>{s.icon}</div>
              <p style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending alert */}
        {pendingUsers.length > 0 && (
          <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: "12px", padding: "12px 16px", marginBottom: "1.25rem",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fb923c", fontSize: "0.88rem" }}>
              <Shield size={15} style={{ flexShrink: 0 }} />
              <span><strong>{pendingUsers.length}</strong> kullanıcı onay bekliyor</span>
            </div>
            <button onClick={() => setTab("users")}
              style={{ background: "none", border: "none", color: "#fb923c", cursor: "pointer", fontSize: "0.78rem" }}>
              Görüntüle →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--surface-2)",
          border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "1.25rem" }}>
          {tabs.map(t => (
            <button key={t.id} id={`admin-tab-${t.id}`} onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px 12px", borderRadius: "9px", fontSize: "0.82rem", fontWeight: 500,
                border: tab === t.id ? "1px solid rgba(168,85,247,0.3)" : "1px solid transparent",
                background: tab === t.id ? "rgba(168,85,247,0.12)" : "transparent",
                color: tab === t.id ? "#c084fc" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s",
                position: "relative",
              }}>
              {t.icon}{t.label}
              {t.badge ? (
                <span style={{ background: "#fb923c", color: "white", borderRadius: "20px",
                  padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700, marginLeft: "2px" }}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingUsers.length > 0 && (
              <>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fb923c", marginBottom: "4px" }}>⏳ Onay Bekleyen</p>
                {pendingUsers.map(u => <UserCard key={u.id} user={u} />)}
                <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              </>
            )}
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>Tüm Kullanıcılar</p>
            {allUsers.filter(u => u.role !== "pending").map(u => <UserCard key={u.id} user={u} />)}
          </div>
        )}

        {tab === "matches" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {matches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        )}

        {tab === "chat" && <ChatModPanel />}
      </div>
    </AdminGuard>
  );
}
