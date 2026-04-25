"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EncouragementOverlayProps {
  message: string | null; // null = hidden
  variant: "success" | "encourage"; // success = green, encourage = warm
}

export default function EncouragementOverlay({ message, variant }: EncouragementOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [message]);

  const bgClass = variant === "success"
    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
    : "bg-amber-50 border-amber-300 text-amber-800";

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl border-2 px-6 py-3 text-center font-display text-base font-bold shadow-lg ${bgClass}`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
