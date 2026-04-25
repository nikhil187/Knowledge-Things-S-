/*
 * ============================================================
 * AUDIT NOTES — SessionSummary.tsx
 * Run: 2026-04-04  |  Auditor: Claude Code (pre-change pass)
 * ============================================================
 *
 * ── AUDIT 1: ACCESSIBILITY ──────────────────────────────────
 *
 * TOUCH TARGETS (min 48 × 48 px for kids)
 *   ❌ Player list <li> rows: py-3 ≈ 44 px — below 48 px minimum
 *   ❌ "Back to results" button: plain text ~32 px, no min-height
 *   ✅ "Share Results" / Home / "Play Again" buttons: h-14 = 56 px
 *
 * COLOR CONTRAST (WCAG AA: 4.5:1 normal text, 3:1 large text)
 *   ❌ text-amber-600 (#D97706) on white at text-xs  ≈ 3.0:1 (FAIL)
 *   ❌ text-emerald-600 (#059669) on white at text-xs/sm ≈ 3.6:1 (FAIL)
 *   ❌ text-slate-500 (#64748B) on white at text-xs/sm ≈ 3.7:1 (FAIL)
 *   ✅ text-violet-600 (#7C3AED) on white ≈ 5.9:1
 *   ✅ Badge colored text (amber-800, emerald-700, etc.) on tinted bg ✓
 *
 * FONT SIZES (min 16 px body, 20 px+ headings for ages 8–11)
 *   ❌ All stat card labels: text-xs = 12 px
 *   ❌ Badge labels: text-xs = 12 px
 *   ❌ Contribution sub-copy: text-xs = 12 px
 *   ❌ Most body prose: text-sm = 14 px
 *   ✅ Stat numbers, heading, streak text: 24 px+
 *
 * SCREEN READER LABELS
 *   ❌ Subject emoji: no aria-label
 *   ❌ Stat card emojis (🏆🎯⭐): no aria-label
 *   ❌ Streak 🔥 emoji: no aria-label
 *   ❌ Badge emojis: rendered as text, no aria-label
 *   ❌ Score counter updates live — no aria-live region
 *   ✅ Celebration 🎉: role="img" aria-label="Celebration" present
 *   ✅ Loading spinner: role="status" aria-live="polite" present
 *
 * KEYBOARD / FOCUS
 *   ⚠️  No explicit focus-visible ring styles — Tailwind default
 *       rings may not be visible enough on colored backgrounds
 *
 * ── AUDIT 2: DESIGN CRITIQUE ────────────────────────────────
 *
 * CARD STACK ORDER (original two-column)
 *   ❌ Level info appeared AFTER badges — users saw their badges
 *      before knowing whether they levelled up. Should be: level → badges.
 *
 * PADDING / SPACING INCONSISTENCY
 *   ❌ Three different padding rhythms:
 *      - Stat cards: p-4
 *      - Badge / contributions card: p-6
 *      - Level info / streak pill: px-6 py-4 / px-6 py-5
 *   Fix: normalise to p-5 for small cards, p-6 for main cards.
 *
 * CORNER RADIUS INCONSISTENCY
 *   ❌ rounded-2xl and rounded-3xl mixed without hierarchy logic.
 *   Fix: rounded-2xl for inline pills/rows, rounded-3xl for full cards.
 *
 * SHADOW SCALE
 *   ❌ shadow-md on stat cells vs shadow-lg on section cards — inverted.
 *      Primary section cards should be heavier visually.
 *   Fix: shadow-sm for stat cells (they're in a row, not cards), shadow-md
 *        for level info, shadow-lg for badges / contributions.
 *
 * BADGE LABEL WEIGHT
 *   ❌ text-4xl emoji + text-xs (12 px) label — visually unbalanced and
 *      illegible for kids. Fix: bump to text-sm (14 px) minimum.
 *
 * SHARE CTA INVISIBILITY
 *   ❌ bg-slate-100 "Share Results" button blends into page background.
 *      Needs higher-contrast treatment.
 *
 * ── AUDIT 3: UX COPY ────────────────────────────────────────
 *
 * ORIGINAL → PROBLEM → REWRITE
 *   "Accuracy"
 *     → Clinical lab word; ages 8-11 won't relate
 *     → "Got Right"
 *
 *   "Solved"
 *     → Flat; misses celebration opportunity
 *     → "Answered" (kept — short wins on mobile)
 *
 *   `Clutch ${N}x`
 *     → Kids won't know "clutch"
 *     → `Came through ${N}×`
 *
 *   "Need 4+ to pass."
 *     → Pass/fail framing is stressful for kids
 *     → "Need 4 stars to level up!"
 *
 *   "Stay at Level ${N}. Get 4+ stars next time!"
 *     → "Stay at" sounds like a penalty verdict
 *     → "You're still Level ${N} — go for 4 stars next time!"
 *
 *   "Save your nickname to track your level and advance."
 *     → "advance" = adult business language
 *     → "Add a nickname to save your level!"
 *
 *   "You all did amazing together!" (always shown)
 *     → Meaningless when team scored <40 % — needs to vary
 *     → ≥60 %: "You all did amazing together!"
 *        <60 %: "Every game makes you better — keep it up!"
 *
 * ============================================================
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useGame } from "@/app/context/GameContext";
import { getSubjectConfig } from "@/utils/subjects";
import { fetchUserProfile } from "@/utils/api";
import type { Subject } from "@/utils/types";
import type { UserProfile } from "@/utils/api";
import ConfettiEffect from "./ConfettiEffect";
import PlayerAvatar from "./PlayerAvatar";
import PodiumAnimation from "./PodiumAnimation";
import StatsBreakdown from "./StatsBreakdown";
import RewardChest from "./RewardChest";
import ShareCard from "./ShareCard";

type SummaryStep = "podium" | "stats" | "share";

// 100 ms stagger per card section (n = 0-based card index)
const cardDelay = (n: number) => n * 0.1;

const badgeContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: cardDelay(5) } },
};
const badgeItemVariants = {
  hidden: { scale: 0, opacity: 0, y: 10 },
  show: {
    scale: 1, opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 18 },
  },
};

export default function SessionSummary() {
  const router = useRouter();
  const { roomState, roomId, requestReplay, username, playerId, newAchievements } = useGame();
  const [step, setStep] = useState<SummaryStep>("stats");
  const handlePodiumComplete = useCallback(() => setStep("stats"), []);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!username?.trim()) { setUserProfile(null); return; }
    setProfileLoading(true);
    fetchUserProfile(username)
      .then((result) => setUserProfile(result.profile))
      .catch(() => setUserProfile(null))
      .finally(() => setProfileLoading(false));
  }, [username]);

  const solved       = roomState?.problemsSolved ?? 0;
  const players      = roomState?.players ?? [];
  const humanPlayers = players.filter((p) => !p.isBot);
  const teamScore    = roomState?.teamScore ?? 0;
  const teamStars    = roomState?.teamStars ?? 0;
  const teamAccuracy = roomState?.teamAccuracy ?? 0;
  const questionsTotal   = roomState?.questionsTotal ?? 10;
  const subject: Subject = roomState?.subject ?? "Math";
  const topic        = roomState?.topic ?? "";
  const grade        = roomState?.grade ?? 4;
  const gameMode     = roomState?.gameMode ?? "serious";
  const gameStageLevel   = roomState?.gameStageLevel ?? 1;
  const bestTeamStreak   = roomState?.bestTeamStreak ?? 0;
  const config       = getSubjectConfig(subject);
  const badges       = roomState?.sessionBadges;
  const totalStars   = roomState?.totalStars;
  const nextMilestone    = roomState?.nextMilestone;

  useEffect(() => {
    if (teamScore <= 0) { setDisplayScore(0); return; }
    const steps = 30;
    const duration = 1500;
    const increment = teamScore / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= teamScore) { setDisplayScore(teamScore); clearInterval(timer); }
      else { setDisplayScore(Math.round(current)); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [teamScore]);

  // Audit fix: vary sub-copy by accuracy instead of always celebrating
  const performanceMessage =
    teamAccuracy >= 80 ? "Outstanding teamwork!" :
    teamAccuracy >= 40 ? "Great team effort!" :
    "Keep learning together!";
  const encouragementLine =
    teamAccuracy >= 60
      ? "You all did amazing together!"
      : "Every game makes you better — keep it up!";

  const byContribution = useMemo(() =>
    [...humanPlayers].sort((a, b) => (b.contributionCount ?? 0) - (a.contributionCount ?? 0)),
    [humanPlayers]
  );
  const mostHelpful = useMemo(() =>
    [...humanPlayers].sort((a, b) => (b.helpedCount ?? 0) - (a.helpedCount ?? 0))[0],
    [humanPlayers]
  );
  const showMostHelpful = mostHelpful && (mostHelpful.helpedCount ?? 0) > 0 && humanPlayers.length > 1;

  const allBadges = [
    { key: "starTeam",            label: "Star Team",       emoji: "⭐",  show: badges?.starTeam,            bg: "bg-amber-50 border-amber-200 text-amber-800" },
    { key: "helpingHand",         label: "Helping Hand",    emoji: "🤝",  show: badges?.helpingHand,         bg: "bg-violet-50 border-violet-200 text-violet-800" },
    { key: "fullHouse",           label: "Full House",      emoji: "🎯",  show: badges?.fullHouse,           bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { key: "teamOnFire",          label: "Team on Fire",    emoji: "🔥",  show: badges?.teamOnFire,          bg: "bg-orange-50 border-orange-200 text-orange-800" },
    { key: "perfectTeam",         label: "Perfect Team",    emoji: "💎",  show: badges?.perfectTeam,         bg: "bg-blue-50 border-blue-200 text-blue-800" },
    { key: "everyoneContributed", label: "Everyone Helped", emoji: "🌟",  show: badges?.everyoneContributed, bg: "bg-amber-50 border-amber-200 text-amber-800" },
    { key: "comebackTeam",        label: "Comeback Team",   emoji: "💪",  show: badges?.comebackTeam,        bg: "bg-rose-50 border-rose-200 text-rose-800" },
    { key: "helpingHeroes",       label: "Helping Heroes",  emoji: "🦸",  show: badges?.helpingHeroes,       bg: "bg-violet-50 border-violet-200 text-violet-800" },
  ];
  const earnedBadges = allBadges.filter((b) => b.show);

  // Reusable card-enter animation props (100 ms stagger)
  const cardEnter = (n: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number], delay: cardDelay(n) },
  });

  // ── STATS VIEW ──────────────────────────────────────────────
  // Stack order: celebration(0) → subject(1) → score(2) → streak(3) →
  //              level(4) → badges(5) → contributions(6) → timeline(7) →
  //              rewards(8) → share(9)
  const statsView = (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[680px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-5"
    >
      <ConfettiEffect trigger={teamAccuracy >= 60} big={teamAccuracy >= 80} />

      {/* ── 0: Celebration header ── */}
      <motion.div {...cardEnter(0)} className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-7xl sm:text-8xl drop-shadow-md inline-block"
            role="img"
            aria-label="Celebration"
          >
            🎉
          </motion.span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-3xl sm:text-4xl font-bold text-slate-800 mt-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {performanceMessage}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-lg sm:text-xl text-violet-600 mt-2"
        >
          {encouragementLine}
        </motion.p>
      </motion.div>

      {/* ── 1: Subject banner ── */}
      <motion.div {...cardEnter(1)}
        className={`flex items-center gap-4 rounded-3xl px-6 py-5 ${config.gradientClass}`}
      >
        <span className="text-5xl sm:text-6xl" role="img" aria-label={config.label}>{config.emoji}</span>
        <div>
          <p className="font-semibold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
            {config.label} &mdash; {topic}
          </p>
          <p className="text-base text-white/90">Grade {grade}</p>
        </div>
      </motion.div>

      {/* ── 2: Stat cards row ── */}
      <motion.div {...cardEnter(2)} className="grid grid-cols-3 gap-3">
        {/* Team Score */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 text-center">
          <span className="text-3xl mb-2 block" role="img" aria-label="Trophy">🏆</span>
          <p className="text-amber-700 text-sm font-semibold mb-1">Team Score</p>
          <p
            className="text-2xl sm:text-3xl font-bold text-slate-800"
            style={{ fontFamily: "var(--font-display)" }}
            aria-live="polite"
            aria-atomic="true"
          >
            {displayScore}
          </p>
        </div>
        {/* Answered */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 text-center">
          <span className="text-3xl mb-2 block" role="img" aria-label="Target">🎯</span>
          <p className="text-emerald-700 text-sm font-semibold mb-1">Answered</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>
            {solved}/{questionsTotal}
          </p>
        </div>
        {/* Got Right */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 text-center">
          <span className="text-3xl mb-2 block" role="img" aria-label="Star">⭐</span>
          <p className="text-violet-700 text-sm font-semibold mb-1">Got Right</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>
            {teamAccuracy}%
          </p>
        </div>
      </motion.div>

      {/* ── 3: Best streak (conditional) ── */}
      {bestTeamStreak >= 2 && (
        <motion.div {...cardEnter(3)}
          className="flex items-center justify-center gap-3 rounded-3xl bg-amber-50 border border-amber-200 px-6 py-4"
        >
          <span className="text-2xl" role="img" aria-label="Fire">🔥</span>
          <span className="text-base font-bold text-amber-700" style={{ fontFamily: "var(--font-display)" }}>
            Best team streak: {bestTeamStreak} in a row!
          </span>
        </motion.div>
      )}

      {/* ── 4: Level info ── */}
      {username && profileLoading && (
        <motion.div {...cardEnter(4)}
          className="rounded-3xl bg-slate-50 border border-slate-200 px-6 py-5 flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="w-5 h-5 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" aria-hidden="true" />
          <span className="text-base text-slate-500">Loading your level&hellip;</span>
        </motion.div>
      )}
      {gameMode === "casual" && (
        <motion.div {...cardEnter(4)} className="rounded-3xl bg-slate-50 border border-slate-200 px-6 py-5">
          <p className="text-base font-semibold text-slate-700">Practice mode</p>
          <p className="text-base text-slate-500 mt-1">No level change &mdash; play for fun with hints and retries.</p>
        </motion.div>
      )}
      {gameMode === "serious" && username && userProfile && !profileLoading && (
        <motion.div {...cardEnter(4)} className="bg-white rounded-3xl shadow-md border border-slate-100 px-6 py-5">
          <p className="text-base font-semibold text-violet-600">{subject} level</p>
          <p className="text-2xl font-bold text-slate-800 mt-1" style={{ fontFamily: "var(--font-display)" }}>
            Level {userProfile.subjects[subject] ?? 1} of 10
          </p>
          <p className="text-base text-violet-600 mt-2">
            Your team got <strong className="text-slate-800">{teamStars}</strong> stars &mdash; need 4 stars to level up!
          </p>
          <p className="text-base font-semibold text-violet-700 mt-1">
            {teamStars >= 4
              ? `You levelled up! \u2192 Level ${Math.min(10, (userProfile.subjects[subject] ?? 1) + 1)} \uD83C\uDF89`
              : `You're still Level ${userProfile.subjects[subject] ?? 1} \u2014 go for 4 stars next time!`}
          </p>
        </motion.div>
      )}
      {gameMode === "serious" && !username && (
        <motion.div {...cardEnter(4)} className="bg-white rounded-3xl shadow-md border border-slate-100 px-6 py-5">
          <p className="text-base font-semibold text-violet-600">You played at Level {gameStageLevel} of 10</p>
          <p className="text-base text-slate-600 mt-1">
            Your team got <strong className="text-slate-800">{teamStars}</strong> stars &mdash; need 4 stars to level up!
          </p>
        </motion.div>
      )}
      {totalStars != null && nextMilestone != null && (
        <motion.div {...cardEnter(4)} className="rounded-3xl bg-slate-50 border border-slate-200 px-6 py-4">
          <p className="text-base text-slate-700">Group total: <strong className="text-slate-800">{totalStars}</strong> stars</p>
          <p className="text-sm text-slate-500 mt-0.5">Next milestone: {nextMilestone} stars</p>
        </motion.div>
      )}

      {/* ── 5: Badges — main celebration moment ── */}
      {earnedBadges.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
          <p className="text-lg font-bold text-slate-800 mb-1" style={{ fontFamily: "var(--font-display)" }}>
            🏅 Badges Earned
          </p>
          <p className="text-sm text-slate-500 mb-4">You unlocked {earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""} this game!</p>
          <motion.div
            variants={badgeContainerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {earnedBadges.map((badge) => (
              <motion.div
                key={badge.key}
                variants={badgeItemVariants}
                className={`rounded-2xl border-2 p-4 text-center ${badge.bg}`}
              >
                <div className="text-4xl mb-2" role="img" aria-label={badge.label}>{badge.emoji}</div>
                <div className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>{badge.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ── 6: Team contributions ── */}
      <motion.div {...cardEnter(6)} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
        <p className="text-lg font-bold text-slate-800 mb-4" style={{ fontFamily: "var(--font-display)" }}>
          🤝 Team Contributions
        </p>

        {showMostHelpful && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: cardDelay(6) + 0.1 }}
            className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 mb-4"
          >
            <p className="text-base font-bold text-emerald-700">🌟 Most Helpful Teammate: {mostHelpful.name}</p>
            <p className="text-sm text-emerald-600 mt-0.5">
              Helped the team pass {mostHelpful.helpedCount ?? 0} question{(mostHelpful.helpedCount ?? 0) !== 1 ? "s" : ""}!
            </p>
          </motion.div>
        )}

        <ul className="space-y-2">
          {byContribution.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: cardDelay(6) + 0.15 + i * 0.08 }}
              className={`flex items-center gap-4 rounded-2xl px-4 min-h-[52px] text-base font-medium ${
                p.id === playerId
                  ? "bg-violet-50 border border-violet-200"
                  : "bg-slate-50 border border-slate-100"
              }`}
            >
              <PlayerAvatar emoji={p.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="text-slate-800 block truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {p.name}
                </span>
                <span className="text-sm text-violet-600">
                  Helped team pass {p.contributionCount ?? 0} question{(p.contributionCount ?? 0) !== 1 ? "s" : ""}
                  {(p.helpedCount ?? 0) > 0 && ` · Came through ${p.helpedCount ?? 0}×`}
                </span>
              </div>
              <span className="text-2xl" role="img" aria-label="Star">⭐</span>
              {p.id === playerId && (
                <span className="text-sm text-violet-500 font-semibold shrink-0">You</span>
              )}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* ── 7: Stats timeline ── */}
      {roomState?.problemHistory && (
        <motion.div {...cardEnter(7)} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
          <StatsBreakdown
            problemHistory={roomState.problemHistory}
            bestTeamStreak={bestTeamStreak}
          />
        </motion.div>
      )}

      {/* ── 8: Rewards ── */}
      <motion.div {...cardEnter(8)}>
        <RewardChest badges={undefined} newAchievements={newAchievements} />
      </motion.div>

      {/* ── 9: Share CTA ── */}
      <motion.div {...cardEnter(9)} className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setStep("share")}
          className="flex-1 h-14 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl text-base font-bold shadow-md hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
          style={{ fontFamily: "var(--font-display)" }}
        >
          📤 Share Results
        </button>
      </motion.div>

      {/* ── 10: Play Again / View Progress ── */}
      <motion.div {...cardEnter(10)} className="flex flex-col gap-3 max-w-[680px] mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
          style={{ fontFamily: "var(--font-display)" }}
        >
          🎮 Play Again
        </button>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="w-full bg-white hover:bg-violet-50 text-violet-700 font-semibold py-3 rounded-2xl text-sm border-2 border-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
        >
          📊 View My Progress
        </button>
      </motion.div>
    </motion.div>
  );

  const shareView = (
    <motion.div
      key="share"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-[680px] w-full p-5 sm:p-8 mx-auto"
    >
      <ShareCard
        subject={subject}
        topic={topic}
        grade={grade}
        teamScore={teamScore}
        teamAccuracy={teamAccuracy}
        problemsSolved={solved}
        questionsTotal={questionsTotal}
        bestTeamStreak={bestTeamStreak}
        players={players}
      />
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          href="/"
          className="flex-1 h-14 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl text-base font-bold flex items-center justify-center text-center no-underline shadow-lg hover:shadow-violet-500/30 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
          style={{ fontFamily: "var(--font-display)" }}
        >
          🏠 Home
        </Link>
        {roomId && (
          <button
            className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl text-base font-bold shadow-lg hover:shadow-emerald-500/30 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
            style={{ fontFamily: "var(--font-display)" }}
            onClick={() => {
              requestReplay();
              router.push(`/room/${roomId}/replay`);
            }}
          >
            🎮 Play Again
          </button>
        )}
        <button
          type="button"
          onClick={() => setStep("stats")}
          className="h-12 px-6 text-base text-slate-500 hover:text-slate-700 transition-colors min-w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-xl"
        >
          &larr; Back to results
        </button>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {step === "podium" && (
        <motion.div key="podium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PodiumAnimation players={players} onComplete={handlePodiumComplete} />
        </motion.div>
      )}
      {step === "stats" && statsView}
      {step === "share" && shareView}
    </AnimatePresence>
  );
}
