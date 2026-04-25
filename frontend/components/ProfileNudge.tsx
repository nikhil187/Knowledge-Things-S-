"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/app/context/GameContext";

const DISMISSED_KEY = "kt_nudge_dismissed";

interface ProfileNudgeProps {
  tutorialComplete?: boolean;
}

export default function ProfileNudge({ tutorialComplete = true }: ProfileNudgeProps) {
  const { username } = useGame();
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Only show for guests who haven't dismissed it this session,
    // and only after the tutorial modal is done
    if (username) return;
    if (!tutorialComplete) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [username, tutorialComplete]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  // Don't render at all for logged-in users
  if (username) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: isMobile ? 16 : -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: isMobile ? 16 : -16 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className={`fixed z-50 w-[85vw] max-w-[260px] rounded-2xl bg-white border-2 border-violet-300 shadow-2xl${
            isMobile
              ? " bottom-6 left-1/2 -translate-x-1/2"
              : " top-[68px] right-36"
          }`}
          role="dialog"
          aria-label="Create a profile"
        >
          {/* Arrow pointing up toward My Progress nav — desktop only */}
          {!isMobile && (
            <div className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t-2 border-l-2 border-violet-300 rotate-45" />
          )}

          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="px-4 pt-4 pb-3"
          >
            <p className="text-sm font-bold text-violet-700" style={{ fontFamily: "var(--font-display)" }}>
              ✨ Save your progress!
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Create a free profile to track your badges &amp; levels
            </p>
            <a
              href="/profile"
              onClick={dismiss}
              className="mt-2.5 block w-full text-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Create Profile →
            </a>
          </motion.div>

          <button
            type="button"
            onClick={dismiss}
            className="absolute top-2 right-2.5 text-slate-300 hover:text-slate-500 text-sm leading-none transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
