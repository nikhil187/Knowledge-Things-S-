"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TeamScorePopupProps {
  teamScore: number;
  teamStreak: number;
  allCorrect: boolean;
}

export default function TeamScorePopup({ teamScore, teamStreak, allCorrect }: TeamScorePopupProps) {
  const [popups, setPopups] = useState<{ id: number; text: string; color: string }[]>([]);
  const [prevScore, setPrevScore] = useState(teamScore);

  useEffect(() => {
    if (teamScore > prevScore) {
      const diff = teamScore - prevScore;
      const newPopups: { id: number; text: string; color: string }[] = [];
      const baseId = Date.now();

      // Base team points
      newPopups.push({ id: baseId, text: `+${diff} Team!`, color: "text-emerald-600" });

      // Streak callout
      if (teamStreak >= 2) {
        newPopups.push({
          id: baseId + 1,
          text: `🔥 ${teamStreak} streak!`,
          color: "text-amber-600",
        });
      }

      // All correct callout
      if (allCorrect) {
        newPopups.push({
          id: baseId + 2,
          text: "Everyone got it! ⭐",
          color: "text-violet-600",
        });
      }

      setPopups((prev) => [...prev, ...newPopups]);

      // Remove after animation
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => !newPopups.some((np) => np.id === p.id)));
      }, 1500);
    }
    setPrevScore(teamScore);
  }, [teamScore, teamStreak, allCorrect, prevScore]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {popups.map((popup, i) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -40 - i * 28, scale: 1 }}
            exit={{ opacity: 0, y: -80 - i * 28 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-lg font-bold ${popup.color} drop-shadow-sm`}
          >
            {popup.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
