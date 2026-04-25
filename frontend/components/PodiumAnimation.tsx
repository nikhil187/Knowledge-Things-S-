"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Player } from "@/utils/types";
import PlayerAvatar from "./PlayerAvatar";
import confetti from "canvas-confetti";

interface PodiumAnimationProps {
  players: Player[];
  onComplete: () => void;
}

export default function PodiumAnimation({ players, onComplete }: PodiumAnimationProps) {
  const humanPlayers = players.filter((p) => !p.isBot);
  const sorted = [...humanPlayers].sort((a, b) => (b.contributionCount ?? 0) - (a.contributionCount ?? 0));
  const top3 = sorted.slice(0, 3);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  const heights = ["h-24", "h-32", "h-20"];
  const colors = ["bg-slate-200", "bg-amber-300", "bg-amber-100"];
  const labels = ["2nd", "1st", "3rd"];

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      confetti({ particleCount: 60, spread: 90, origin: { x: 0.5, y: 0.5 }, colors: ["#7c3aed", "#f59e0b", "#10b981"] });
    }
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-8"
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-2xl font-bold text-slate-800 mb-8"
      >
        Team Results!
      </motion.h2>

      <div className="flex items-end justify-center gap-3" style={{ perspective: "800px" }}>
        {podiumOrder.map((player, i) => {
          if (!player) return null;
          const actualIndex = top3.length >= 3 ? [1, 0, 2][i]! : i;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.3, type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center"
            >
              <PlayerAvatar emoji={player.avatar} size="lg" />
              <p className="text-sm font-bold text-slate-800 mt-2 truncate max-w-[80px]">{player.name}</p>
              <p className="text-xs text-slate-500">{player.contributionCount ?? 0} helped</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                transition={{ delay: 0.8 + i * 0.3, duration: 0.5 }}
                className={`${heights[actualIndex]} w-20 ${colors[actualIndex]} rounded-t-xl mt-2 flex items-start justify-center pt-2`}
              >
                <span className="text-xs font-bold text-slate-600">{labels[actualIndex]}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
