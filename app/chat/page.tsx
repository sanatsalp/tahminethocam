"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { Send, MessageSquareOff, Ban, Trash2, Pin } from "lucide-react";

function Avatar({ username, avatarUrl, size = 32 }: { username: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-str)", flexShrink: 0 }} />;
  }
  const colors = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];
  const color = colors[username.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4,
      color, flexShrink: 0 }}>
      {username[0].toUpperCase()}
    </div>
  );
}

export default function ChatPage() {
  const { currentUser, chatMessages, chatEnabled, sendChatMessage, deleteChatMessage,
    pinChatMessage, unpinChatMessage, users } = useApp();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!currentUser) router.replace("/login"); }, [currentUser, router]);

  // Poll for new messages (simulated real-time)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, tick]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const currentUserData = users.find(u => u.id === currentUser.id);
  const isChatBlocked = currentUserData?.chatBlocked;
  const pinnedMsg = chatMessages.find(m => m.pinned);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = sendChatMessage(text.trim());
    if (result.success) { setText(""); inputRef.current?.focus(); }
    else setError(result.error || "Hata");
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const diff = today.getDate() - d.getDate();
    if (diff === 0) return "Bugün";
    if (diff === 1) return "Dün";
    return d.toLocaleDateString("tr-TR");
  }

  // Group messages by date
  const groupedByDate: { date: string; messages: typeof chatMessages }[] = [];
  chatMessages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = groupedByDate[groupedByDate.length - 1];
    if (!last || last.date !== date) groupedByDate.push({ date, messages: [msg] });
    else last.messages.push(msg);
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: "760px", margin: "0 auto", padding: "1.5rem 1rem",
      display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>

      {/* Header */}
      <div style={{ marginBottom: "1rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>💬 Topluluk Sohbeti</h1>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {chatMessages.length} mesaj · {users.filter(u => u.role === "user" || u.role === "admin").length} aktif üye
            </p>
          </div>
          {!chatEnabled && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "10px", padding: "6px 12px", fontSize: "0.78rem", color: "#f87171" }}>
              <MessageSquareOff size={13} /> Sohbet kapalı
            </div>
          )}
        </div>
      </div>

      {/* Pinned message */}
      {pinnedMsg && (
        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "0.8rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Pin size={12} color="#fbbf24" />
            <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: "0.72rem" }}>Sabitlenmiş Mesaj</span>
          </div>
          <span style={{ color: "var(--text)" }}>{pinnedMsg.text}</span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", borderRadius: "14px",
        background: "var(--surface)", border: "1px solid var(--border)",
        padding: "1rem", display: "flex", flexDirection: "column", gap: "4px" }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-subtle)", margin: "auto" }}>
            <p>Henüz mesaj yok. İlk mesajı sen gönder!</p>
          </div>
        )}

        {groupedByDate.map(({ date, messages }) => (
          <div key={date}>
            <div style={{ textAlign: "center", margin: "12px 0 8px" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", background: "var(--surface-3)",
                padding: "3px 10px", borderRadius: "20px", display: "inline-block" }}>{date}</span>
            </div>

            {messages.map(msg => {
              const isOwn = msg.user_id === currentUser.id;
              return (
                <div key={msg.id} style={{
                  display: "flex", flexDirection: isOwn ? "row-reverse" : "row",
                  gap: "8px", alignItems: "flex-end", marginBottom: "8px",
                }}>
                  {!isOwn && <Avatar username={msg.username} avatarUrl={msg.avatarUrl} size={30} />}

                  <div style={{ maxWidth: "70%", minWidth: "80px" }}>
                    {!isOwn && (
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "3px",
                        fontWeight: 600, paddingLeft: "4px" }}>{msg.username}</p>
                    )}
                    <div style={{ position: "relative" }}>
                      <div style={{
                        padding: "8px 12px", borderRadius: isOwn ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                        background: isOwn ? "#10b981" : "var(--surface-3)",
                        color: isOwn ? "white" : "var(--text)",
                        border: isOwn ? "none" : "1px solid var(--border)",
                        fontSize: "0.875rem", lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}>
                        {msg.pinned && <Pin size={10} style={{ display: "inline", marginRight: "4px", opacity: 0.7 }} />}
                        {msg.text}
                      </div>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-subtle)", marginTop: "2px",
                        textAlign: isOwn ? "left" : "right", paddingLeft: "4px", paddingRight: "4px" }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", opacity: 0.5 }}
                      className="admin-msg-actions">
                      <button onClick={() => deleteChatMessage(msg.id)} title="Sil"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#f87171" }}>
                        <Trash2 size={11} />
                      </button>
                      {!msg.pinned
                        ? <button onClick={() => pinChatMessage(msg.id)} title="Sabitle" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#fbbf24" }}>
                            <Pin size={11} />
                          </button>
                        : <button onClick={() => unpinChatMessage(msg.id)} title="Sabitlemeyi kaldır" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-subtle)" }}>
                            <Pin size={11} />
                          </button>
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ marginTop: "12px", flexShrink: 0 }}>
        {!chatEnabled ? (
          <div style={{ textAlign: "center", padding: "12px", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", color: "#f87171", fontSize: "0.82rem" }}>
            <MessageSquareOff size={14} style={{ display: "inline", marginRight: "6px" }} />
            Sohbet şu an devre dışı. Admin tarafından kapatılmıştır.
          </div>
        ) : isChatBlocked ? (
          <div style={{ textAlign: "center", padding: "12px", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", color: "#f87171", fontSize: "0.82rem" }}>
            <Ban size={14} style={{ display: "inline", marginRight: "6px" }} />
            Sohbet gönderme yetkiniz kaldırılmış.
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ display: "flex", gap: "8px" }}>
            <input ref={inputRef} type="text" className="input" placeholder="Mesaj yaz..."
              value={text} onChange={e => setText(e.target.value)}
              maxLength={500} style={{ flex: 1 }} id="chat-input" />
            <button type="submit" className="btn-primary" disabled={!text.trim()} id="chat-send"
              style={{ padding: "0 1.25rem", flexShrink: 0 }}>
              <Send size={16} />
            </button>
          </form>
        )}
        {error && (
          <p style={{ fontSize: "0.78rem", color: "#f87171", marginTop: "6px" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
