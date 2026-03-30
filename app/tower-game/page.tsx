"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { TOWER_GAME, computeTowerMultiplier } from "@/lib/tower-game";
import AuthGuard from "@/components/AuthGuard";
import TowerGrid from "@/components/tower-game/TowerGrid";
import { Trophy, ArrowLeft, Zap, Wallet, MessageSquareOff } from "lucide-react";

type TowerDailyStatus = {
  games_played: number;
  remaining_games: number;
  is_active_session: boolean;
};

export default function TowerGamePage() {
  const { currentUser, siteSettings } = useApp();

  const [status, setStatus] = useState<"idle" | "playing" | "lost" | "cashed_out">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);

  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [pickResults, setPickResults] = useState<boolean[]>([]);

  const [currentLevel, setCurrentLevel] = useState(0); // correct picks count
  const [multiplier, setMultiplier] = useState(1);

  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [lastFinalLevel, setLastFinalLevel] = useState<number | null>(null);

  const towerPlayable = useMemo(() => {
    return Boolean(siteSettings.towerGameEnabled) && Boolean(siteSettings.towerGameVisible) && !Boolean(siteSettings.towerGameMaintenance);
  }, [siteSettings.towerGameEnabled, siteSettings.towerGameVisible, siteSettings.towerGameMaintenance]);

  const towerUnavailableMessage = useMemo(() => {
    if (siteSettings.towerGameMaintenance) return "Tower Game is under maintenance";
    return "Tower Game is currently unavailable";
  }, [siteSettings.towerGameMaintenance]);

  const isCashOutDisabled = useMemo(() => {
    if (status !== "playing") return true;
    if (currentLevel < 1) return true;
    return busy || !towerPlayable;
  }, [status, currentLevel, busy, towerPlayable]);

  const maxBet = useMemo(() => siteSettings.towerGameMaxBetAmount ?? TOWER_GAME.MAX_BET, [siteSettings.towerGameMaxBetAmount]);
  const dailyPlayLimit = useMemo(
    () => siteSettings.towerGameDailyPlayLimit ?? TOWER_GAME.MAX_DAILY_GAMES,
    [siteSettings.towerGameDailyPlayLimit]
  );

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!currentUser) return;
      if (!towerPlayable) return;
      setError("");
      setDailyRemaining(null);
      try {
        const { data, error } = await supabase.rpc("tower_game_daily_status");
        if (error) throw error;
        const row = Array.isArray(data) ? (data[0] as TowerDailyStatus) : (data as TowerDailyStatus);
        if (!alive) return;
        setGamesPlayed(row.games_played ?? 0);
        setDailyRemaining(row.remaining_games ?? 0);
      } catch (e: any) {
        if (!alive) return;
        console.error("Tower daily status fetch error:", e);
        setError("Oyun durumu alınamadı. Lütfen sayfayı yenileyin.");
        setDailyRemaining(null);
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [currentUser, towerPlayable]);

  async function handleStart() {
    if (!currentUser) return;
    if (!towerPlayable) {
      setError(towerUnavailableMessage);
      return;
    }
    setError("");
    setLastPayout(null);
    setLastFinalLevel(null);

    const bet = Math.floor(Number(betAmount));
    if (!Number.isFinite(bet) || bet <= 0) {
      setError("Geçersiz bahis miktarı");
      return;
    }
    if (bet > maxBet) {
      setError(`Maksimum bahis ${maxBet} kredi`);
      return;
    }
    if (dailyRemaining !== null && dailyRemaining <= 0) {
      setError("Daily limit reached");
      return;
    }
    if (bet > currentUser.credits) {
      setError("Yetersiz kredi");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("tower_game_start", {
        p_bet_amount: bet,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const newSessionId = row.session_id as string;

      setSessionId(newSessionId);
      setPickedIndices([]);
      setPickResults([]);
      setCurrentLevel(0);
      setMultiplier(1);
      setStatus("playing");

      setLastPayout(null);
      setLastFinalLevel(null);
      setDailyRemaining(row.remaining_games ?? null);
      setGamesPlayed(row.games_played ?? 0);
    } catch (e: any) {
      console.error("Tower start error:", e);
      setError("Oyun başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPick(tileIndex: number, nextLevelGuess: number): Promise<{
    is_correct: boolean;
    next_level: number;
    next_multiplier: number;
  }> {
    if (!sessionId) throw new Error("Oyun oturumu bulunamadı");
    const { data, error } = await supabase.rpc("tower_game_pick_verify", {
      p_session_id: sessionId,
      p_current_level: nextLevelGuess,
      p_chosen_index: tileIndex,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      is_correct: Boolean(row.is_correct),
      next_level: Number(row.next_level ?? nextLevelGuess + 1),
      next_multiplier: Number(row.next_multiplier ?? computeTowerMultiplier(nextLevelGuess + 1)),
    };
  }

  async function settleLose(picks: number[]) {
    if (!sessionId) throw new Error("Oyun oturumu bulunamadı");
    const { error } = await supabase.rpc("tower_game_settle_lose", {
      p_session_id: sessionId,
      p_picked_indices: picks,
    });
    if (error) throw error;
  }

  async function cashOut(picks: number[]) {
    if (!sessionId) throw new Error("Oyun oturumu bulunamadı");
    const { data, error } = await supabase.rpc("tower_game_cashout", {
      p_session_id: sessionId,
      p_picked_indices: picks,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const payout = Number(row.payout ?? 0);
    const finalLevel = Number(row.final_level ?? 0);
    setLastPayout(payout);
    setLastFinalLevel(finalLevel);
  }

  async function handlePick(tileIndex: number) {
    if (!sessionId) return;
    if (status !== "playing") return;
    if (busy) return;
    if (!towerPlayable) {
      setError(towerUnavailableMessage);
      return;
    }
    if (currentLevel >= TOWER_GAME.MAX_LEVEL) return;
    if (pickedIndices.length !== currentLevel) return;

    setBusy(true);
    setError("");
    try {
      const nextLevelGuess = currentLevel; // server computes next_level = current_level + 1
      const res = await verifyPick(tileIndex, nextLevelGuess);

      const newPicked = [...pickedIndices, tileIndex];
      const newResults = [...pickResults, res.is_correct];

      setPickedIndices(newPicked);
      setPickResults(newResults);

      if (res.is_correct) {
        setCurrentLevel(res.next_level);
        setMultiplier(res.next_multiplier);
      } else {
        // Wrong tile: settle lose immediately.
        await settleLose(newPicked);
        setStatus("lost");
        setCurrentLevel(currentLevel); // correct picks count unchanged
        // multiplier remains at last correct level
        setMultiplier(computeTowerMultiplier(currentLevel));
      }
    } catch (e: any) {
      console.error("Tower pick error:", e);
      setError("Oyun durumu güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCashOut() {
    if (!sessionId) return;
    if (isCashOutDisabled) return;
    if (!towerPlayable) {
      setError(towerUnavailableMessage);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const picks = [...pickedIndices];
      await cashOut(picks);
      setStatus("cashed_out");
    } catch (e: any) {
      console.error("Tower cashout error:", e);
      setError("Coin çekme işlemi başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <div className="animate-fade-in" style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" }}>
        {!towerPlayable ? (
          <div className="card" style={{ padding: "16px", marginBottom: "1.25rem" }}>
            <p style={{ fontWeight: 900, color: "#fbbf24", marginBottom: "6px" }}>Tower Game</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{towerUnavailableMessage}</p>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: "0.82rem",
            }}
          >
            <ArrowLeft size={15} /> Geri
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {currentUser?.role === "admin" ? (
              <span className="badge-admin">🛡️ Admin</span>
            ) : (
              <span className="badge-user">🎾 Kullanıcı</span>
            )}
            {currentUser?.chatBlocked ? (
              <span className="badge-blocked" style={{ display: "inline-flex" }}>
                <MessageSquareOff size={12} /> Chat yasak
              </span>
            ) : null}
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                background: "rgba(251,191,36,0.10)",
                border: "1px solid rgba(251,191,36,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={20} color="#fbbf24" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)" }}>Tower Game</h1>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Eğlence amaçlı mini oyun (kredi ile oynanır)
              </p>
            </div>
          </div>

          <div className="divider" style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>Günlük kalan</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399" }}>
                {dailyRemaining === null ? "..." : `${Math.max(0, dailyRemaining)}/${dailyPlayLimit}`}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>Oynanan: {gamesPlayed}</p>
            </div>

            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>Çarpan</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24" }}>
                ×{multiplier.toFixed(2)}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                      Seviye: {status === "playing" ? currentLevel : lastFinalLevel ?? 0}/{TOWER_GAME.MAX_LEVEL}
              </p>
            </div>

            <div style={{ gridColumn: "1 / -1", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Wallet size={16} color="#34d399" />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>Bahis miktarı (max {maxBet})</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)" }}>
                      Bakiyen: {currentUser?.credits.toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    className="input"
                    style={{ width: "150px" }}
                    value={String(betAmount)}
                    onChange={(e) => setBetAmount(Math.max(0, Math.floor(Number(e.target.value || 0))))}
                    min={1}
                      max={maxBet}
                    step={1}
                    disabled={status === "playing" || busy}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleStart}
                    disabled={
                      !towerPlayable ||
                      busy ||
                      status === "playing" ||
                      (dailyRemaining !== null && dailyRemaining <= 0)
                    }
                    style={{ padding: "0.625rem 1rem" }}
                  >
                    <Zap size={16} /> Başlat
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <p style={{ marginTop: "12px", fontSize: "0.82rem", color: "#f87171" }}>{error}</p>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          <TowerGrid
            currentLevel={currentLevel}
            pickedIndices={pickedIndices}
            pickResults={pickResults}
            disabled={status !== "playing" || !towerPlayable}
            busy={busy}
            onPick={handlePick}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={isCashOutDisabled}
              onClick={handleCashOut}
              style={{ flex: 1, minWidth: "160px" }}
            >
              💰 Coin Çek ({multiplier.toFixed(2)}x)
            </button>
            <Link href="/dashboard" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 1.25rem" }}>
              Tahminlere Dön
            </Link>
          </div>

          {status === "lost" ? (
            <div className="card" style={{ padding: "14px" }}>
              <p style={{ fontWeight: 800, color: "#f87171", marginBottom: "6px" }}>Kaybettin</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Son seviye: {currentLevel}/{TOWER_GAME.MAX_LEVEL} · Çarpan: ×{computeTowerMultiplier(currentLevel).toFixed(2)}
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: "10px" }}
                disabled={busy || (dailyRemaining !== null && dailyRemaining <= 0)}
                onClick={() => {
                  setStatus("idle");
                  setSessionId(null);
                  setPickedIndices([]);
                  setPickResults([]);
                  setCurrentLevel(0);
                  setMultiplier(1);
                  setLastPayout(null);
                  setLastFinalLevel(null);
                }}
              >
                Tekrar Oyna
              </button>
            </div>
          ) : null}

          {status === "cashed_out" ? (
            <div className="card" style={{ padding: "14px" }}>
              <p style={{ fontWeight: 800, color: "#34d399", marginBottom: "6px" }}>Coin Çekildi!</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Kazanç: +{(lastPayout ?? 0).toLocaleString("tr-TR")} kredi · Seviye: {lastFinalLevel ?? 0}/{TOWER_GAME.MAX_LEVEL}
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: "10px" }}
                disabled={busy || (dailyRemaining !== null && dailyRemaining <= 0)}
                onClick={() => {
                  setStatus("idle");
                  setSessionId(null);
                  setPickedIndices([]);
                  setPickResults([]);
                  setCurrentLevel(0);
                  setMultiplier(1);
                  setLastPayout(null);
                  setLastFinalLevel(null);
                }}
              >
                Tekrar Oyna
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </AuthGuard>
  );
}

