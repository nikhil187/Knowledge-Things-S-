"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENTS } from "@/utils/achievements";

interface AchievementToastProps {
  newAchievements: string[];
}

export default function AchievementToast({ newAchievements }: AchievementToastProps) {
  const [queue, setQueue] = useState<{ id: string; label: string; emoji: string }[]>([]);

  useEffect(() => {
    if (newAchievements.length === 0) return;
    const items = newAchievements
      .map((id) => {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        return def ? { id: def.id, label: def.label, emoji: def.emoji } : null;
      })
      .filter(Boolean) as { id: string; label: string; emoji: string }[];
    setQueue((prev) => [...prev, ...items]);
  }, [newAchievements]);

  useEffect(() => {
    if (queue.length === 0) return;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [queue]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {queue.slice(0, 3).map((item, i) => (
          <motion.div
            key={`${item.id}-${i}`}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-xl border-2 border-amber-300 bg-white px-4 py-3 shadow-lg flex items-center gap-3 pointer-events-auto"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
              className="text-2xl"
            >
              {item.emoji}
            </motion.span>
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Achievement Unlocked!</p>
              <p className="text-sm font-bold text-slate-800">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
