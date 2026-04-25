"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import AppHeader from "./AppHeader";
import { InstallPrompt } from "./InstallPrompt";

const FLOATING_EMOJIS = [
  { emoji: "\u2B50", top: "10%", left: "4%" },
  { emoji: "\u{1F4DA}", top: "20%", right: "6%" },
  { emoji: "\u{1F3AF}", top: "50%", left: "3%" },
  { emoji: "\u{1F52C}", top: "65%", right: "4%" },
  { emoji: "\u{1F30D}", top: "80%", left: "7%" },
  { emoji: "\u{1F3C6}", top: "35%", right: "3%" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col">
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-violet-700 focus:rounded-xl focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </Link>
      <AppHeader />
      <main id="main-content" className="flex-1 flex flex-col min-h-0 w-full overflow-x-hidden overflow-y-auto safe-bottom relative">
        {/* Floating decorative emojis */}
        {FLOATING_EMOJIS.map((d, i) => (
          <span
            key={i}
            className="floating-deco hidden sm:block"
            style={{ top: d.top, left: d.left, right: d.right }}
            aria-hidden="true"
          >
            {d.emoji}
          </span>
        ))}
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
}
