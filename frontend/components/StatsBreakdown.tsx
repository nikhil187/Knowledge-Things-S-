"use client";

import { motion } from "framer-motion";
import type { ProblemHistoryEntry } from "@/utils/types";

interface StatsBreakdownProps {
  problemHistory: ProblemHistoryEntry[];
  bestTeamStreak: number;
}

export default function StatsBreakdown({ problemHistory, bestTeamStreak }: StatsBreakdownProps) {
  if (!problemHistory || problemHistory.length === 0) return null;

  // Find best streak segment
  let bestStart = 0;
  let bestLen = 0;
  let curStart = 0;
  let curLen = 0;
  for (let i = 0; i < problemHistory.length; i++) {
    if (problemHistory[i]!.correct) {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curLen = 0;
    }
  }

  const avgSpeed = Math.round(
    problemHistory
      .filter((e) => e.averageResponseMs != null)
      .reduce((sum, e) => sum + e.averageResponseMs!, 0) /
    Math.max(1, problemHistory.filter((e) => e.averageResponseMs != null).length) / 1000,
  );

  const allCorrectCount = problemHistory.filter((e) => e.allPlayersCorrect).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Question Timeline</p>

      {/* Timeline */}
      <div className="flex gap-1 items-center overflow-x-auto pb-2">
        {problemHistory.map((entry, i) => {
          const isInBestStreak = i >= bestStart && i < bestStart + bestLen && bestLen >= 2;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              title={`Q${i + 1}: ${entry.correct ? "Passed" : "Failed"}${entry.allPlayersCorrect ? " (everyone correct!)" : ""}`}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                entry.correct
                  ? isInBestStreak
                    ? "bg-amber-100 border-amber-400 text-amber-800"
                    : "bg-emerald-100 border-emerald-300 text-emerald-700"
                  : "bg-red-100 border-red-300 text-red-600"
              }`}
            >
              {entry.allPlayersCorrect ? "⭐" : entry.correct ? "✓" : "✗"}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        {bestTeamStreak >= 2 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-amber-800">🔥 {bestTeamStreak}</p>
            <p className="text-[10px] text-amber-600">Best Streak</p>
          </div>
        )}
        {avgSpeed > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-blue-800">{avgSpeed}s</p>
            <p className="text-[10px] text-blue-600">Avg Speed</p>
          </div>
        )}
        {allCorrectCount > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-violet-800">⭐ {allCorrectCount}</p>
            <p className="text-[10px] text-violet-600">Perfect Qs</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
