"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    emoji: "🧠",
    title: "Welcome to Knowledge Things!",
    desc: "Answer quiz questions together as a team. The more you play, the harder it gets!",
    color: "from-violet-500 to-purple-600",
  },
  {
    emoji: "🎯",
    title: "Pick your subject",
    desc: "Choose Math, Science, English, History, Geography, or General Knowledge — then pick a topic and grade.",
    color: "from-sky-500 to-blue-600",
  },
  {
    emoji: "🔗",
    title: "Invite your friends",
    desc: "You get a 6-letter room code. Share it! Up to 4 players can join and play together.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    emoji: "⚡",
    title: "Answer fast, earn stars",
    desc: "30 seconds per question. Get 4+ stars to level up. Answer quickly together for bonus points!",
    color: "from-amber-500 to-orange-600",
  },
  {
    emoji: "🚀",
    title: "Two ways to play",
    desc: "Standard: one chance, levels up your score. Learn Slowly: hints and retries, perfect for practice.",
    color: "from-rose-500 to-pink-600",
  },
];

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step]!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm px-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="how-to-play-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Coloured header */}
            <div className={`bg-gradient-to-br ${slide.color} px-5 pt-6 pb-5 text-center relative`}>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 rounded-xl p-1.5 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-4xl mb-2">{slide.emoji}</div>
                  <h2
                    id="how-to-play-title"
                    className="text-lg font-bold text-white leading-tight break-words"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {slide.title}
                  </h2>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-600 text-center text-sm leading-relaxed min-h-[40px] break-words"
                >
                  {slide.desc}
                </motion.p>
              </AnimatePresence>

              {/* Dots */}
              <div className="flex justify-center gap-1.5 my-4">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`rounded-full transition-all duration-200 ${
                      i === step
                        ? "w-6 h-2 bg-violet-500"
                        : "w-2 h-2 bg-slate-200 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors min-h-[48px]"
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={isLast ? onClose : () => setStep((s) => s + 1)}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all min-h-[48px] ${
                    isLast
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-violet-500 hover:bg-violet-600"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {isLast ? "Let's play! 🚀" : "Next →"}
                </button>
              </div>

              {!isLast && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-500 mt-2 py-2 transition-colors min-h-[36px]"
                >
                  Skip tutorial
                </button>
              )}
            </div>

            {/* For parents note — last slide only */}
            {isLast && (
              <p className="px-5 pb-4 text-center text-xs text-slate-400">
                For parents & teachers: Grades 3–5 · No account needed
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
