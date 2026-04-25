"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionBadges } from "@/utils/types";
import { ACHIEVEMENTS } from "@/utils/achievements";

interface RewardChestProps {
  badges: SessionBadges | undefined;
  newAchievements: string[];
}

const BADGE_DEFS = [
  { key: "starTeam", label: "Star Team", emoji: "⭐" },
  { key: "helpingHand", label: "Helping Hand", emoji: "🤝" },
  { key: "fullHouse", label: "Full House", emoji: "🎯" },
  { key: "teamOnFire", label: "Team on Fire", emoji: "🔥" },
  { key: "perfectTeam", label: "Perfect Team", emoji: "💎" },
  { key: "everyoneContributed", label: "Everyone Helped", emoji: "🌟" },
  { key: "comebackTeam", label: "Comeback Team", emoji: "💪" },
  { key: "helpingHeroes", label: "Helping Heroes", emoji: "🦸" },
];

export default function RewardChest({ badges, newAchievements }: RewardChestProps) {
  const [opened, setOpened] = useState(false);
  const earnedBadges = BADGE_DEFS.filter((b) => badges?.[b.key as keyof SessionBadges]);
  const earnedAchievementDefs = newAchievements
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean) as { id: string; label: string; emoji: string }[];
  const allRewards = [
    ...earnedBadges.map((b) => ({ emoji: b.emoji, label: b.label })),
    ...earnedAchievementDefs.map((a) => ({ emoji: a.emoji, label: a.label })),
  ];

  useEffect(() => {
    const timer = setTimeout(() => setOpened(true), 600);
    return () => clearTimeout(timer);
  }, []);

  if (allRewards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center py-4"
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Rewards Earned</p>

      {/* Chest */}
      <motion.div
        animate={opened ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 0.6 }}
        className="text-5xl mb-4"
      >
        {opened ? "🎁" : "🎁"}
      </motion.div>

      {/* Rewards */}
      <AnimatePresence>
        {opened && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-wrap justify-center gap-2"
          >
            {allRewards.map((reward, i) => (
              <motion.span
                key={`${reward.label}-${i}`}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 400, damping: 20 }}
                className="rounded-lg border-2 border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 flex items-center gap-1.5"
              >
                <span className="text-base">{reward.emoji}</span>
                {reward.label}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
