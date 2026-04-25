"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ONBOARDING_KEY = "knowledge_things_onboarding_seen";

const SLIDES = [
  {
    emoji: "🧠",
    title: "Welcome to Knowledge Things!",
    desc: "AI-powered quiz for Grades 3–5. Play solo or with friends.",
  },
  {
    emoji: "👥",
    title: "Create or join a room",
    desc: "Host creates a room and shares the code. Friends enter it to play together.",
  },
  {
    emoji: "⭐",
    title: "Get 4+ stars to advance",
    desc: "Answer questions as a team. Pass to unlock harder levels!",
  },
];

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

export default function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) setVisible(true);
  }, []);

  const handleNext = () => {
    if (slide < SLIDES.length - 1) {
      setSlide((s) => s + 1);
    } else {
      localStorage.setItem(ONBOARDING_KEY, "1");
      setVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setVisible(false);
    onComplete();
  };

  const current = SLIDES[slide]!;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-black/50 px-5"
          aria-modal="true"
          role="dialog"
          aria-labelledby="welcome-title"
        >
        <motion.div
          key={slide}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-[340px] bg-white rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 text-center">
            <span className="text-5xl block mb-4" aria-hidden="true">
              {current.emoji}
            </span>
            <h2 id="welcome-title" className="text-xl font-bold text-[var(--color-text)] mb-2 break-words overflow-hidden" style={{ fontFamily: "var(--font-display)" }}>
              {current.title}
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6 break-words overflow-hidden">{current.desc}</p>
            <div className="flex gap-2 justify-center">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === slide ? "bg-[var(--color-primary)]" : "bg-slate-200"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 btn-secondary text-sm py-2.5"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 btn-primary text-sm py-2.5"
              >
                {slide < SLIDES.length - 1 ? "Next" : "Get started"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
