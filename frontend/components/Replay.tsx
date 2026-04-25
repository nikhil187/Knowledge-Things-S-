"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/app/context/GameContext";
import type { ReplayItem } from "@/utils/types";

export default function Replay() {
  const { socket, roomId } = useGame();
  const [replayData, setReplayData] = useState<{
    problemHistory: ReplayItem[];
    teamScore: number;
    problemsSolved: number;
  } | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!socket || !roomId) return;
    const onReplay = (data: { problemHistory: ReplayItem[]; teamScore: number; problemsSolved: number }) => {
      setReplayData(data);
      setIndex(0);
    };
    socket.on("replay_data", onReplay);
    socket.emit("replay", roomId);
    return () => {
      socket.off("replay_data", onReplay);
    };
  }, [socket, roomId]);

  if (!replayData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-soft max-w-md w-full text-center"
      >
        <p className="text-slate-600">Loading replay…</p>
      </motion.div>
    );
  }

  const { problemHistory } = replayData;
  const current = problemHistory[index];
  const hasNext = index < problemHistory.length - 1;
  const hasPrev = index > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-soft max-w-md w-full"
    >
      <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
        Session replay
      </h2>
      <p className="mb-6 text-slate-600" aria-live="polite" aria-atomic="true">
        Problem {index + 1} of {problemHistory.length}
      </p>
      <div aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-6 rounded-2xl bg-violet-50 p-6"
            >
              <p className="mb-4 text-lg font-semibold text-[var(--color-text)]">{current.problem.question}</p>
            <p className="text-slate-600">
              Answer: <strong>
                {current.problem.options && /^[A-D]$/i.test(String(current.problem.correctAnswer))
                  ? current.problem.options["ABCD".indexOf(String(current.problem.correctAnswer).toUpperCase())] ?? current.problem.correctAnswer
                  : current.problem.correctAnswer}
              </strong>
            </p>
            <p className="mt-2">
              {current.correct ? (
                <span className="text-emerald-600">✓ Correct</span>
              ) : (
                <span className="text-amber-600">Needed another try</span>
              )}
            </p>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex gap-4">
        <motion.button
          className="btn-secondary flex-1"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={!hasPrev}
          aria-label="Previous question"
          whileHover={hasPrev ? { scale: 1.02 } : {}}
          whileTap={hasPrev ? { scale: 0.98 } : {}}
        >
          Previous
        </motion.button>
        <motion.button
          className="btn-secondary flex-1"
          onClick={() => setIndex((i) => Math.min(problemHistory.length - 1, i + 1))}
          disabled={!hasNext}
          aria-label="Next question"
          whileHover={hasNext ? { scale: 1.02 } : {}}
          whileTap={hasNext ? { scale: 0.98 } : {}}
        >
          Next
        </motion.button>
      </div>
      <Link
        href="/"
        className="btn-primary w-full min-h-[48px] text-white flex items-center justify-center no-underline mt-6 block"
      >
        Back to home
      </Link>
    </motion.div>
  );
}
