"use client";

import { motion } from "framer-motion";

interface TeamStreakIndicatorProps {
  streak: number;
  comboLevel: number;
}

const COMBO_CONFIG = [
  { label: "", emoji: "", bg: "", border: "" },
  { label: "Warming up!", emoji: "\u2728", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "Team is hot!", emoji: "\u{1F525}", bg: "bg-orange-50", border: "border-orange-300" },
  { label: "Team on FIRE!", emoji: "\u{1F525}\u{1F525}\u{1F525}", bg: "bg-red-50", border: "border-red-300" },
];

export default function TeamStreakIndicator({ streak, comboLevel }: TeamStreakIndicatorProps) {
  if (comboLevel <= 0 || streak < 2) return null;
  const config = COMBO_CONFIG[comboLevel] ?? COMBO_CONFIG[1]!;
  const isOnFire = comboLevel >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 ${config.bg} ${config.border} ${isOnFire ? "animate-streak-fire" : ""}`}
    >
      <motion.span
        className="text-lg"
        animate={isOnFire ? { scale: [1, 1.15, 1] } : {}}
        transition={isOnFire ? { duration: 0.8, repeat: Infinity } : {}}
      >
        {config.emoji}
      </motion.span>
      <span className="text-xs font-bold text-amber-700">{config.label}</span>
      <span className="rounded-lg bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        &times;{streak}
      </span>
    </motion.div>
  );
}
