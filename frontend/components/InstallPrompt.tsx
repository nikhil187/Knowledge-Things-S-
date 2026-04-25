"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // On iOS, show the hint if not already in standalone mode
  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (ios && !isStandalone) {
      setTimeout(() => setVisible(true), 5000);
    }
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border-2 border-violet-200 p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">Add to Home Screen</p>
            <p className="text-xs text-gray-500">
              {isIOS
                ? "Tap share → Add to Home Screen"
                : "Install for the best experience"}
            </p>
          </div>
          {!isIOS && prompt && (
            <button
              onClick={async () => {
                await prompt.prompt();
                setVisible(false);
              }}
              className="bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-xl"
            >
              Install
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="text-gray-300 text-sm ml-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
