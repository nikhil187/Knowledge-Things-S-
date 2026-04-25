"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PowerUpState, ActiveEffects, PowerUpType } from "@/utils/types";

interface PowerUpBarProps {
  powerUps?: PowerUpState;
  activeEffects?: ActiveEffects;
  onActivate: (type: PowerUpType) => void;
  disabled?: boolean;
  isMCQ?: boolean;
}

const POWER_UP_CONFIG: { type: PowerUpType; emoji: string; label: string; desc: string; ariaLabel: string }[] = [
  { type: "team_shield", emoji: "🛡️", label: "Shield", desc: "Remove 2 wrong answers for everyone", ariaLabel: "Use Team Shield - removes two wrong answers" },
  { type: "time_boost", emoji: "⏰", label: "+10s", desc: "Add 10 seconds to the timer", ariaLabel: "Use Time Boost - adds 10 extra seconds" },
  { type: "bonus_round", emoji: "2️⃣", label: "2× Pts", desc: "Double team points this question", ariaLabel: "Use Bonus Round - double points for this question" },
];

export default function PowerUpBar({ powerUps, activeEffects, onActivate, disabled, isMCQ }: PowerUpBarProps) {
  if (!powerUps) return null;

  const hasAny = POWER_UP_CONFIG.some((c) => {
    const slot = powerUps[c.type];
    return slot && (slot.available || slot.used);
  });
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-medium text-slate-500 shrink-0">Power-ups:</span>
      <div className="flex gap-1.5" role="toolbar" aria-label="Power-ups">
        <AnimatePresence>
          {POWER_UP_CONFIG.map((config) => {
            const slot = powerUps[config.type];
            if (!slot) return null;
            const isActive = config.type === "bonus_round" && activeEffects?.bonusRoundActive;
            const isShieldActive = config.type === "team_shield" && activeEffects?.shieldRemovedOptions?.length;
            const isUsed = slot.used;
            const isAvailable = slot.available && !isUsed;
            const cantUseShield = config.type === "team_shield" && !isMCQ;

            if (!isAvailable && !isUsed && !isActive && !isShieldActive) return null;

            return (
              <motion.button
                key={config.type}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                type="button"
                disabled={disabled || isUsed || !isAvailable || cantUseShield}
                onClick={() => isAvailable && !cantUseShield && onActivate(config.type)}
                aria-label={isUsed ? `${config.label} — Used` : config.ariaLabel}
                title={isUsed ? `${config.label} — Used` : cantUseShield ? "Only for multiple choice" : config.desc}
                className={`flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-xs font-bold transition-all min-h-[32px] ${
                  isActive || isShieldActive
                    ? "border-amber-400 bg-amber-50 text-amber-800 animate-combo-fire"
                    : isUsed
                      ? "border-slate-200 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                      : isAvailable && !cantUseShield
                        ? "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:scale-105 cursor-pointer"
                        : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
