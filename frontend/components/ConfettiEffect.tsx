"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger: boolean;
  big?: boolean; // bigger burst for "everyone correct"
}

export default function ConfettiEffect({ trigger, big }: ConfettiEffectProps) {
  const prevTrigger = useRef(false);

  useEffect(() => {
    // Only fire on rising edge (false → true)
    if (trigger && !prevTrigger.current) {
      // Respect reduced motion
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        prevTrigger.current = trigger;
        return;
      }

      if (big) {
        // Big celebration: confetti from both sides
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.2, y: 0.6 },
          colors: ["#7c3aed", "#10b981", "#f59e0b", "#3b82f6"],
          ticks: 150,
        });
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.8, y: 0.6 },
          colors: ["#7c3aed", "#10b981", "#f59e0b", "#3b82f6"],
          ticks: 150,
        });
      } else {
        // Normal celebration: center burst
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.5, y: 0.7 },
          colors: ["#7c3aed", "#10b981", "#f59e0b"],
          ticks: 150,
        });
      }

      // Stop confetti after 4 seconds so it doesn't linger or block interaction
      const stopTimer = setTimeout(() => confetti.reset(), 4000);
      // Apply pointer-events: none to the canvas-confetti canvas so it never blocks clicks
      const canvas = document.querySelector("canvas.confetti-canvas") as HTMLCanvasElement | null;
      if (canvas) canvas.style.pointerEvents = "none";

      prevTrigger.current = trigger;
      return () => clearTimeout(stopTimer);
    }
    prevTrigger.current = trigger;
  }, [trigger, big]);

  return null; // canvas-confetti creates its own canvas
}
