"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  /** Use "polite" for non-critical, "assertive" for critical */
  ariaLive?: "polite" | "assertive";
  id?: string;
}

export default function ErrorBanner({ message, onDismiss, ariaLive = "assertive", id }: ErrorBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        id={id}
        role="alert"
        aria-live={ariaLive}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3"
      >
        <span className="text-red-600 text-lg flex-shrink-0" aria-hidden="true">
          ⚠️
        </span>
        <p className="text-red-700 font-medium flex-1">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 font-semibold text-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded-lg px-2 py-1"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
