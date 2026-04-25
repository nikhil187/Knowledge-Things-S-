"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useGame } from "@/app/context/GameContext";
import { SUBJECTS, getSubjectConfig } from "@/utils/subjects";
import type { Grade, Subject } from "@/utils/types";
import ErrorBanner from "@/components/ErrorBanner";
import LoadingSpinner from "@/components/LoadingSpinner";
import HowToPlayModal from "@/components/HowToPlayModal";
import ProfileNudge from "@/components/ProfileNudge";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";

// ── helpers ──────────────────────────────────────────────────────────────────
function getSavedUsername(): string {
  try { return localStorage.getItem("kt_username") ?? ""; } catch { return ""; }
}
function getBestScore(): number | null {
  try {
    const v = localStorage.getItem("kt_best_score");
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

// ── Daily Challenge seeding ───────────────────────────────────────────────────
function getDailySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface DailyChoice { subject: Subject; topic: string; seed: string }

function getDailyChoice(): DailyChoice {
  const cacheKey = `kt_daily_${getDailySeed()}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as DailyChoice;
  } catch { /* fall through */ }

  // Deterministic daily pick: rotate through all subject+topic combos
  const d = new Date();
  const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) %
    SUBJECTS.reduce((sum, s) => sum + s.topics.length, 0);
  let cursor = 0;
  let chosen: DailyChoice = { subject: "General Knowledge", topic: "Mixed", seed: getDailySeed() };
  for (const s of SUBJECTS) {
    if (idx < cursor + s.topics.length) {
      chosen = { subject: s.label, topic: s.topics[idx - cursor]!, seed: getDailySeed() };
      break;
    }
    cursor += s.topics.length;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(chosen));
    // Clean up yesterday's cache
    const yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `kt_daily_${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    localStorage.removeItem(yesterdayKey);
  } catch { /* ignore */ }

  return chosen;
}

const slide = {
  enter: { x: 24, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { x: -24, opacity: 0, transition: { duration: 0.25 } },
};

const slideReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

const staggerReduced = {
  hidden: { opacity: 0 },
  show: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.03, duration: 0.15 },
  }),
};

function formatJoinError(err: string | undefined): string {
  if (!err) return "Something went wrong.";
  if (err.toLowerCase().includes("room not found") || err.toLowerCase().includes("invalid")) return "Invalid room code. Check the code and try again.";
  if (err.toLowerCase().includes("full") || err.toLowerCase().includes("players")) return "This room is full. Try another room.";
  return err;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const slideVariants = reducedMotion ? slideReduced : slide;
  const staggerVariants = reducedMotion ? staggerReduced : stagger;
  const {
    createRoom, joinRoom, leaveRoom, setRoomId,
    setPlayerName: setCtxName, setGameSetup, connected,
  } = useGame();

  useEffect(() => leaveRoom(), [leaveRoom]);

  const [savedUsername, setSavedUsername] = useState("");
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [tutorialDone, setTutorialDone] = useState(false);

  useEffect(() => {
    setSavedUsername(getSavedUsername());
    setBestScore(getBestScore());
    // If user has already seen the onboarding tutorial, mark done immediately
    if (localStorage.getItem("knowledge_things_onboarding_seen")) {
      setTutorialDone(true);
    }
    // Pre-fill join nickname from saved login or guest nickname
    const loggedIn = localStorage.getItem("kt_username");
    if (loggedIn) {
      setName(loggedIn);
    } else {
      const guest = localStorage.getItem("kt_guest_nickname");
      if (guest) {
        setName(guest);
      } else {
        const generated = `Player${Math.floor(100 + Math.random() * 900)}`;
        localStorage.setItem("kt_guest_nickname", generated);
        setName(generated);
      }
    }
  }, []);

  const [tab, setTab] = useState<"new" | "join">("new");
  useEffect(() => {
    if (searchParams.get("tab") === "join") setTab("join");
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
      setTab("join");
    }
  }, [searchParams]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [howToPlay, setHowToPlay] = useState(false);

  const getOrGenNickname = () => {
    if (typeof window === "undefined") return "Player";
    const stored = localStorage.getItem("kt_username") || localStorage.getItem("kt_guest_nickname");
    if (stored) return stored;
    const generated = `Player${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem("kt_guest_nickname", generated);
    return generated;
  };

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = name.trim();
    if (trimmed && typeof window !== "undefined" && !localStorage.getItem("kt_username")) {
      localStorage.setItem("kt_guest_nickname", trimmed);
    }
  }, [name]);

  const pickSubject = useCallback((s: Subject) => {
    const c = getSubjectConfig(s);
    const defaultTopic = c.topics[0]!;
    const defaultGrade: Grade = 4;
    if (!connected) return;
    setLoading(true);
    setError("");
    const nickname = getOrGenNickname();
    setSubject(s);
    createRoom(undefined, "serious", (room) => {
      if ("error" in room && typeof room.error === "string" && room.error) {
        setLoading(false);
        setError(room.error);
        return;
      }
      setRoomId(room.roomId);
      setCtxName(nickname);
      setGameSetup(s, defaultTopic, defaultGrade);
      joinRoom(room.roomId, nickname, undefined, (res) => {
        setLoading(false);
        if (res.success) router.push(`/room/${room.roomId}`);
        else setError(res.error ?? "Could not create room. Please try again.");
      });
    }, { subject: s, topic: defaultTopic, grade: defaultGrade });
  }, [connected, createRoom, joinRoom, setRoomId, setCtxName, setGameSetup, router]);

  const handleDailyChallenge = useCallback(() => {
    if (!connected) return;
    const { subject, topic } = getDailyChoice();
    const grade: Grade = 4;
    setLoading(true);
    setError("");
    const nickname = getOrGenNickname();
    setSubject(subject);
    createRoom(undefined, "serious", (room) => {
      if ("error" in room && typeof room.error === "string" && room.error) {
        setLoading(false);
        setError(room.error);
        return;
      }
      setRoomId(room.roomId);
      setCtxName(nickname);
      setGameSetup(subject, topic, grade);
      joinRoom(room.roomId, nickname, undefined, (res) => {
        setLoading(false);
        if (res.success) router.push(`/room/${room.roomId}`);
        else setError(res.error ?? "Could not create room. Please try again.");
      });
    }, { subject, topic, grade });
  }, [connected, createRoom, joinRoom, setRoomId, setCtxName, setGameSetup, router]);

  const handleJoin = useCallback(() => {
    const trimName = name.trim();
    const trimCode = code.trim().toUpperCase();
    if (!trimName || !trimCode || !connected) return;
    // Close edit mode and persist guest nickname before joining
    setEditingName(false);
    if (typeof window !== "undefined" && !localStorage.getItem("kt_username")) {
      localStorage.setItem("kt_guest_nickname", trimName);
    }
    setLoading(true);
    setError("");
    setRoomId(trimCode);
    setCtxName(trimName);
    joinRoom(trimCode, trimName, undefined, (res) => {
      setLoading(false);
      if (res.success) router.push(`/room/${trimCode}`);
      else setError(formatJoinError(res.error));
    });
  }, [name, code, connected, joinRoom, setRoomId, setCtxName, router]);

  return (
    <div className="relative flex flex-col flex-1 min-h-screen">
      <div className="fixed inset-0 -z-20 animated-bg" />
      <WelcomeOnboarding onComplete={() => setTutorialDone(true)} />
      <HowToPlayModal isOpen={howToPlay} onClose={() => setHowToPlay(false)} />
      <ProfileNudge tutorialComplete={tutorialDone && !howToPlay} />

      <div className="flex flex-col container-touch py-4 sm:py-6 md:py-8 flex-1 relative">
        {/* Hero */}
        <AnimatePresence mode="wait">
          {(tab === "join" || true) ? (
            <motion.div
              key="hero-full"
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-4 sm:mb-6"
            >
              {/* Personalised welcome banner */}
              {savedUsername ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-100 border border-violet-200 px-4 py-1.5 mb-3 text-sm font-semibold text-violet-800"
                >
                  <span aria-hidden="true">👋</span>
                  Welcome back, {savedUsername}!
                  {bestScore != null && (
                    <span className="text-violet-600 font-normal">· Best: {bestScore} pts</span>
                  )}
                </motion.div>
              ) : null}

              <motion.span
                className="text-5xl sm:text-6xl mb-2 inline-block"
                aria-hidden="true"
                animate={{ rotate: [0, 14, -8, 14, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                {"👋"}
              </motion.span>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-text)] mb-3 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Quiz Time with Friends!
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-5 max-w-lg mx-auto leading-relaxed">
                Pick a subject, team up, and answer AI questions together.
              </p>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-3">
                {[
                  { icon: "\u2728", label: "AI Questions" },
                  { icon: "\u{1F465}", label: "1\u20134 Players" },
                  { icon: "\u{1F91D}", label: "Team Play" },
                  { icon: "\u{1F4CA}", label: "Grades 3\u20135" },
                ].map((f) => (
                  <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-slate-700 border border-white/80 shadow-sm">
                    <span aria-hidden="true">{f.icon}</span>
                    {f.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setHowToPlay(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-300 rounded-full px-5 py-2.5 shadow-sm hover:shadow transition-all min-h-[40px]"
                >
                  {"\u{1F3AE}"} How does it work?
                </button>

                {/* Daily Challenge badge */}
                <motion.button
                  type="button"
                  onClick={handleDailyChallenge}
                  disabled={loading}
                  whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                  className="inline-flex items-center gap-2 text-sm font-bold text-white rounded-full px-5 py-2.5 shadow-md hover:shadow-lg min-h-[40px] transition-shadow disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                  title={`Today: ${getDailyChoice().subject} — ${getDailyChoice().topic}`}
                >
                  <span aria-hidden="true">⚡</span>
                  Daily Challenge
                  <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">NEW</span>
                </motion.button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Tab switcher */}
        {(tab === "join" || true) && (
          <div className="text-center mb-4">
            <div
              className="inline-flex rounded-2xl bg-white/80 p-2 gap-1.5 shadow-md"
              role="tablist"
              aria-label="Create or join game"
            >
              {(["new", "join"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  id={`tab-${t}`}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`px-6 sm:px-8 py-3 rounded-xl text-base sm:text-lg font-bold transition-all duration-300 min-h-[48px] ${
                    tab === t
                      ? "text-white bg-[var(--color-primary)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/60"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t === "new" ? "New Game" : "Join Game"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="w-full max-w-4xl mx-auto flex-1">
          <AnimatePresence mode="wait">
            {tab === "new" && (
              <motion.div
                key="new"
                id="new-game-panel"
                role="tabpanel"
                aria-labelledby="tab-new"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Loading overlay — shown while creating room */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="text-5xl mb-4"
                    >
                      🚀
                    </motion.div>
                    <p className="text-xl font-bold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>
                      Creating your game...
                    </p>
                  </motion.div>
                )}

                {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

                {/* Subject grid */}
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: reducedMotion ? 0.03 : 0.08 } } }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                    {SUBJECTS.map((s, i) => (
                      <motion.button
                        key={s.label}
                        variants={staggerVariants}
                        custom={i}
                        onClick={() => pickSubject(s.label)}
                        disabled={loading}
                        animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
                        transition={reducedMotion ? undefined : {
                          duration: 2.4 + i * 0.3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.15,
                        }}
                        className={`card-subject ${s.gradientClass} flex flex-col items-center justify-center gap-3 p-5 sm:p-6 min-h-[120px] sm:min-h-[140px] text-white disabled:opacity-60`}
                      >
                        <span className="text-4xl sm:text-5xl drop-shadow-md">{s.emoji}</span>
                        <span className="font-bold text-lg sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                          {s.label}
                        </span>
                        <span className="text-sm text-white/90 leading-tight line-clamp-2 text-center">
                          {s.description}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {tab === "join" && (
              <motion.div
                key="join"
                id="join-game-panel"
                role="tabpanel"
                aria-labelledby="tab-join"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="card-game p-6 sm:p-8 max-w-md mx-auto"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    Join a Game
                  </h2>
                  <p className="text-slate-600 text-sm">Enter the room code from your friend</p>
                </div>

                {/* Friendly join hint */}
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5 text-sm text-amber-800">
                  <span aria-hidden="true" className="text-base shrink-0 mt-0.5">🔗</span>
                  <div>
                    <p className="font-semibold">Ask your friend for their game link or code</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      They can share a link like <span className="font-mono bg-amber-100 rounded px-1">knowledgethings.app/join/ABC123</span> or just read you the code.
                    </p>
                  </div>
                </div>

                {/* Nickname — above room code, display/edit toggle */}
                <label className="block text-slate-700 font-semibold text-sm mb-2">
                  Your Display Name
                </label>
                {editingName ? (
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 20));
                        setError("");
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") commitName(); }}
                      onBlur={commitName}
                      placeholder="Your display name in this game"
                      className="input-soft flex-1"
                      maxLength={20}
                      aria-label="Enter your display name"
                    />
                    <button
                      type="button"
                      onClick={commitName}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-3 font-bold text-lg transition-colors"
                      aria-label="Confirm name"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="w-full flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50/40 transition-colors group mb-4"
                    aria-label="Edit display name"
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {savedUsername ? "😊" : "🎮"}
                    </span>
                    <span className="flex-1 font-semibold text-slate-800 truncate">
                      {name || "Set your name"}
                    </span>
                    <span className="text-slate-400 group-hover:text-violet-500 transition-colors" aria-hidden="true">✏️</span>
                  </button>
                )}
                <p className="text-xs text-slate-500 -mt-2 mb-4">
                  Letters, numbers, _ and - · max 20 characters
                </p>

                <label htmlFor="join-room-code" className="block text-slate-700 font-semibold text-sm mb-2">Room Code</label>
                <input
                  id="join-room-code"
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setError(""); }}
                  placeholder="ABC123"
                  className="input-soft text-center text-2xl font-mono tracking-[0.3em] mb-6"
                  maxLength={8}
                  autoComplete="off"
                />

                {error && <ErrorBanner message={error} onDismiss={() => setError("")} id="join-error" />}
                {!connected && (
                  <div className="mb-3 flex items-center gap-3 text-amber-700" role="status">
                    <LoadingSpinner size="sm" label="Connecting" />
                    <span className="font-medium">Connecting…</span>
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={!code.trim() || !name.trim() || !connected || loading}
                  className="w-full min-h-[56px] rounded-2xl px-6 py-4 text-lg font-bold transition-all bg-[#7c3aed] hover:bg-[#6d28d9] hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-200 text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96] flex items-center justify-center gap-2"
                  style={{ fontFamily: "var(--font-display)" }}
                  aria-busy={loading}
                >
                  {loading ? <><LoadingSpinner size="sm" label="Joining" /><span>Joining…</span></> : "Join Game"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
