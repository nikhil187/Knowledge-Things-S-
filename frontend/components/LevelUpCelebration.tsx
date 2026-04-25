"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface LevelUpCelebrationProps {
  show: boolean;
  newLevel: number;
  subject: string;
  onComplete: () => void;
}

export default function LevelUpCelebration({ show, newLevel, subject, onComplete }: LevelUpCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        const end = Date.now() + 2000;
        const interval = setInterval(() => {
          if (Date.now() > end) { clearInterval(interval); return; }
          confetti({
            particleCount: 30,
            spread: 80,
            origin: { x: Math.random(), y: Math.random() * 0.4 },
            colors: ["#7c3aed", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"],
          });
        }, 300);
      }

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 400);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-md p-6"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="bg-white rounded-3xl shadow-2xl p-10 sm:p-12 text-center max-w-md border-2 border-violet-300"
            style={{ boxShadow: "0 8px 60px rgba(124, 58, 237, 0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-8xl sm:text-9xl mb-6"
            >
              {"\u{1F3C6}"}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl font-bold text-slate-800 mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              LEVEL UP!
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <p className="text-2xl text-slate-800 font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>{subject}</p>
              <p className="text-3xl sm:text-4xl text-violet-600 font-bold" style={{ fontFamily: "var(--font-display)" }}>Level {newLevel}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-1 mb-6"
            >
              {Array.from({ length: Math.min(newLevel, 10) }, (_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="text-2xl sm:text-3xl"
                >
                  {"\u2B50"}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-slate-600 text-lg"
            >
              Amazing progress! Keep learning!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
