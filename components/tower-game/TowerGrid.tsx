"use client";

import { useMemo } from "react";
import { TOWER_GAME } from "@/lib/tower-game";

type TowerGridProps = {
  currentLevel: number; // 0..MAX_LEVEL
  pickedIndices: number[]; // length === currentLevel (+ optional last wrong)
  pickResults: boolean[]; // length === pickedIndices.length (true for correct, false for wrong)
  disabled?: boolean;
  busy?: boolean;
  onPick?: (index: number) => void;
};

export default function TowerGrid({
  currentLevel,
  pickedIndices,
  pickResults,
  disabled = false,
  busy = false,
  onPick,
}: TowerGridProps) {
  const tileStyle = useMemo(() => {
    return {
      width: "clamp(34px, 8vw, 56px)",
      height: "clamp(34px, 8vw, 56px)",
      borderRadius: "14px",
      border: "1px solid var(--border)",
      background: "var(--surface-3)",
      color: "var(--text)",
      fontWeight: 800,
      fontSize: "0.95rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.15s",
      userSelect: "none" as const,
    };
  }, []);

  const isAlive = !disabled;
  const nextRowIndex = currentLevel; // row to interact with is currentLevel (0-indexed picks)

  return (
    <div
      className="card"
      style={{
        padding: "14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Array.from({ length: TOWER_GAME.MAX_LEVEL }).map((_, rowIdx) => {
          const isCompleted = rowIdx < pickedIndices.length;
          const isCurrent = rowIdx === nextRowIndex && isAlive;

          return (
            <div key={rowIdx} style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              {Array.from({ length: TOWER_GAME.TILE_COUNT }).map((__, tileIdx) => {
                const chosenAtThisRow = pickedIndices[rowIdx] === tileIdx;
                const resultAtThisRow = pickResults[rowIdx];

                let bg = "var(--surface-3)";
                let border = "1px solid var(--border)";
                let opacity = 1;

                if (isCompleted && chosenAtThisRow) {
                  // Completed row: show chosen outcome.
                  if (resultAtThisRow) {
                    bg = "rgba(16,185,129,0.18)";
                    border = "1px solid rgba(16,185,129,0.35)";
                  } else {
                    bg = "rgba(239,68,68,0.18)";
                    border = "1px solid rgba(239,68,68,0.35)";
                  }
                } else if (isCompleted) {
                  opacity = chosenAtThisRow ? 1 : 0.6;
                } else if (!isCurrent && rowIdx > nextRowIndex) {
                  opacity = 0.55;
                }

                const canClick = Boolean(isCurrent && onPick && !busy && !disabled);
                return (
                  <button
                    key={tileIdx}
                    type="button"
                    disabled={!canClick}
                    onClick={() => canClick && onPick?.(tileIdx)}
                    style={{
                      ...tileStyle,
                      opacity,
                      background: bg,
                      border,
                      cursor: canClick ? "pointer" : "default",
                      boxShadow: canClick ? "0 0 0 rgba(0,0,0,0)" : undefined,
                      transform: canClick ? "translateY(-1px)" : undefined,
                    }}
                    aria-label={`Tile ${tileIdx + 1} at level ${rowIdx + 1}`}
                  >
                    {tileIdx + 1}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

