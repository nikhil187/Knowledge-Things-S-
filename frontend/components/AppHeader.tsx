"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGame } from "@/app/context/GameContext";
import { fetchUserProfile } from "@/utils/api";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function displayName(raw: string | null | undefined): string {
  if (!raw) return "";
  const idx = raw.indexOf(":");
  return idx >= 0 ? raw.slice(idx + 1) : raw;
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { username, setUsername, roomState } = useGame();
  const [profile, setProfile] = useState<{ overallLevel: number } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!username?.trim()) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchUserProfile(username).then((result) => {
      if (!cancelled && result.profile) setProfile({ overallLevel: result.profile.overallLevel });
      else if (!cancelled) setProfile(null);
    });
    return () => { cancelled = true; };
  }, [username]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  function handleSignOut() {
    setUsername(null);
    setDropdownOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 safe-top backdrop-blur-sm border-b transition-colors duration-300 bg-white/95 border-slate-200/60">
      <div className="mx-auto flex min-h-[56px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0 no-underline" onClick={() => setNavOpen(false)}>
          <span className="text-2xl" aria-hidden="true">{"\u{1F9E0}"}</span>
          <span className="font-bold text-lg sm:text-xl text-[var(--color-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Knowledge Things
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/"
            className={`min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold no-underline transition-all ${
              pathname === "/"
                ? "bg-[var(--color-primary)] text-white"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Home
          </Link>
          <Link
            href="/profile"
            className={`relative min-h-[44px] flex items-center px-4 rounded-xl text-sm font-semibold no-underline transition-all ${
              pathname === "/profile"
                ? "bg-[var(--color-primary)] text-white"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            My Progress
            {!username && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
              </span>
            )}
          </Link>
          {username && (
            <div className="relative ml-2 pl-4 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700 truncate max-w-[100px] sm:max-w-[140px]">
                  {displayName(username)}
                </span>
                {profile && (
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full shrink-0">
                    Lv.{profile.overallLevel}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
                        <p className="text-sm font-bold text-violet-700">{displayName(username)}</p>
                        <p className="text-xs text-gray-500">Level {profile?.overallLevel ?? 1}</p>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 font-medium"
                        >
                          🚪 Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setNavOpen((o) => !o)}
          className="md:hidden flex flex-col justify-center items-center w-12 h-12 rounded-xl gap-1.5 bg-slate-100 hover:bg-slate-200"
          aria-label={navOpen ? "Close menu" : "Open menu"}
        >
          <span className={`w-5 h-0.5 rounded transition-transform bg-slate-600 ${navOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`w-5 h-0.5 rounded transition-opacity bg-slate-600 ${navOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-0.5 rounded transition-transform bg-slate-600 ${navOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {navOpen && (
        <div className="md:hidden safe-bottom bg-white border-t border-slate-200">
          <nav className="px-4 py-4 flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setNavOpen(false)}
              className={`min-h-[48px] flex items-center px-4 rounded-xl text-base font-semibold no-underline ${
                pathname === "/" ? "bg-[var(--color-primary)] text-white" : "text-slate-700"
              }`}
            >
              Home
            </Link>
            <Link
              href="/profile"
              onClick={() => setNavOpen(false)}
              className={`relative min-h-[48px] flex items-center px-4 rounded-xl text-base font-semibold no-underline ${
                pathname === "/profile" ? "bg-[var(--color-primary)] text-white" : "text-slate-700"
              }`}
            >
              My Progress
              {!username && (
                <span className="ml-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                </span>
              )}
            </Link>
            {username && (
              <div className="mt-2 pt-3 border-t border-slate-200">
                <p className="px-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{displayName(username)}</span>
                  {profile && <span className="ml-2">&middot; Level {profile.overallLevel}</span>}
                </p>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
