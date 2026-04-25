"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Player, Subject } from "@/utils/types";
import { getSubjectConfig } from "@/utils/subjects";
import PlayerAvatar from "./PlayerAvatar";

interface ShareCardProps {
  subject: Subject;
  topic: string;
  grade: number;
  teamScore: number;
  teamAccuracy: number;
  problemsSolved: number;
  questionsTotal: number;
  bestTeamStreak: number;
  players: Player[];
}

export default function ShareCard({
  subject,
  topic,
  grade,
  teamScore,
  teamAccuracy,
  problemsSolved,
  questionsTotal,
  bestTeamStreak,
  players,
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const config = getSubjectConfig(subject);
  const humanPlayers = players.filter((p) => !p.isBot);

  const statsText = [
    `Knowledge Things — ${subject}: ${topic} (Gr.${grade})`,
    `Team Score: ${teamScore} | Accuracy: ${teamAccuracy}%`,
    `Solved: ${problemsSolved}/${questionsTotal}`,
    bestTeamStreak >= 2 ? `Best Streak: ${bestTeamStreak}` : "",
    `Players: ${humanPlayers.map((p) => p.name).join(", ")}`,
  ].filter(Boolean).join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Card */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-lg">
        {/* Header */}
        <div className={`${config.gradientClass} px-4 py-3 flex items-center gap-3`}>
          <span className="text-3xl">{config.emoji}</span>
          <div>
            <p className="font-bold text-white">{config.label} — {topic}</p>
            <p className="text-xs text-white/80">Grade {grade}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-violet-800">{teamScore}</p>
              <p className="text-[10px] text-slate-500">Score</p>
            </div>
            <div>
              <p className="text-xl font-bold text-violet-800">{teamAccuracy}%</p>
              <p className="text-[10px] text-slate-500">Accuracy</p>
            </div>
            <div>
              <p className="text-xl font-bold text-violet-800">{problemsSolved}/{questionsTotal}</p>
              <p className="text-[10px] text-slate-500">Solved</p>
            </div>
          </div>

          {/* Players */}
          <div className="flex justify-center gap-2">
            {humanPlayers.map((p) => (
              <div key={p.id} className="flex flex-col items-center">
                <PlayerAvatar emoji={p.avatar} size="sm" />
                <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[48px]">{p.name}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-center text-slate-300">Knowledge Things</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="btn-secondary w-full min-h-[44px] text-sm"
      >
        {copied ? "Copied!" : "Copy Stats to Share"}
      </button>
    </motion.div>
  );
}
