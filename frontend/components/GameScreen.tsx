"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/app/context/GameContext";
import { getSubjectConfig } from "@/utils/subjects";
import { QUESTION_TIME_SEC, TIMER_DANGER_SEC, TIMER_WARN_SEC } from "@/utils/gameConstants";
import type { Player, Subject } from "@/utils/types";
import ConfettiEffect from "./ConfettiEffect";
import TeamScorePopup from "./TeamScorePopup";
import EncouragementOverlay from "./EncouragementOverlay";
import PowerUpBar from "./PowerUpBar";
import AchievementToast from "./AchievementToast";
import PlayerAvatar from "./PlayerAvatar";

const OPT_LETTERS = ["A", "B", "C", "D"];
const OPT_CLASSES = ["game-opt-a-light", "game-opt-b-light", "game-opt-c-light", "game-opt-d-light"];
const LETTER_COLORS = ["bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600"];

const GameTimer = React.memo(function GameTimer({ seconds, accentColor }: { seconds: number; accentColor: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const fraction = Math.max(0, seconds / QUESTION_TIME_SEC);
  const dash = fraction * circ;
  const gap = circ - dash;
  const danger = seconds <= TIMER_DANGER_SEC;
  const warn = seconds <= TIMER_WARN_SEC && seconds > TIMER_DANGER_SEC;
  const strokeColor = danger ? "#ef4444" : warn ? "#f59e0b" : accentColor;
  const emoji = danger ? "\u{1F630}" : warn ? "\u{1F914}" : "\u{1F60A}";

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 ${danger ? "animate-timer-danger" : ""}`}>
      <div className="absolute inset-0 rounded-full bg-white shadow-lg border-2 border-slate-100" />
      <svg className="w-20 h-20 sm:w-24 sm:h-24 relative" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-base sm:text-lg"
          aria-hidden="true"
          animate={danger ? { scale: [1, 1.2, 1] } : {}}
          transition={danger ? { duration: 0.5, repeat: Infinity } : {}}
        >
          {emoji}
        </motion.span>
        <span className={`text-xl sm:text-2xl font-bold ${danger ? "text-red-500" : "text-slate-800"}`} style={{ fontFamily: "var(--font-display)" }}>
          {seconds}
        </span>
      </div>
    </div>
  );
});

const TeamSidebar = React.memo(function TeamSidebar({
  players, playerId, teamScore, teamStreak, teamComboLevel, gameMode, accentColor,
}: {
  players: Player[]; playerId: string | null; teamScore: number; teamStreak: number; teamComboLevel: number; gameMode?: "casual" | "serious"; accentColor: string;
}) {
  const humanPlayers = players.filter((p) => !p.isBot);
  const hasStreak = teamComboLevel > 0 && teamStreak >= 2;

  return (
    <div className="rounded-3xl w-full lg:w-56 xl:w-60 p-4 sm:p-5 shrink-0 flex flex-col bg-white/90 backdrop-blur-lg border-2 border-slate-100 shadow-lg">
      <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-4">Team</h3>

      <div className="mb-4 text-center py-3 rounded-xl bg-slate-50 border border-slate-100">
        <p className="text-slate-400 text-xs mb-1">Score</p>
        <motion.p
          key={teamScore}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-4xl font-bold text-slate-800"
          style={{ fontFamily: "var(--font-display)", color: accentColor }}
        >
          {teamScore}
        </motion.p>
      </div>

      {hasStreak && (
        <div className="mb-4 text-center py-2 px-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-xs font-bold text-amber-700">{"\u{1F525}"} Streak {teamStreak}</span>
        </div>
      )}

      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Players</p>
      <ul className="space-y-1.5 flex-1 min-h-0">
        {humanPlayers.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all ${
              p.id === playerId ? "bg-violet-50 border border-violet-200" : "bg-transparent"
            }`}
          >
            <PlayerAvatar emoji={p.avatar} size="sm" />
            <span className="truncate flex-1 font-semibold text-slate-700 text-sm">{p.name}</span>
            {p.isCorrect && <span className="text-emerald-500 text-sm font-bold">{"\u2713"}</span>}
            {!p.isCorrect && (p.attempts ?? 0) > 0 && <span className="text-slate-400 text-sm">...</span>}
            {p.id === playerId && <span className="text-xs font-bold text-violet-600 bg-violet-100 rounded-md px-1.5 py-0.5">you</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3 pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">
          {gameMode === "casual" ? "Practice \u00B7 Hints on" : "Standard \u00B7 One chance"}
        </p>
      </div>
    </div>
  );
});

export default function GameScreen() {
  const { roomState, submitAnswer, playerId, lastAnswerResult, usePowerUp, newAchievements, lastPowerUpActivation } = useGame();
  const [textInput, setTextInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<{ correct: boolean; hint?: string; explanation?: string } | null>(null);
  const [shakeCard, setShakeCard] = useState(false);
  const [encourageMsg, setEncourageMsg] = useState<{ text: string; variant: "success" | "encourage" } | null>(null);
  const prevRound = useRef(roomState?.round ?? 1);

  const problem = roomState?.currentProblem;
  const players = roomState?.players ?? [];
  const humanPlayers = useMemo(() => players.filter((p) => !p.isBot), [players]);
  const myPlayer = useMemo(() => players.find((p) => p.id === playerId), [players, playerId]);
  const myWrongAnswers = myPlayer?.wrongAnswers ?? [];
  const iAmCorrect = myPlayer?.isCorrect ?? false;
  const allCorrect = humanPlayers.length > 0 && humanPlayers.every((p) => p.isCorrect);
  const timerSeconds = roomState?.timerSeconds ?? 30;
  const round = roomState?.round ?? 1;
  const subject: Subject = roomState?.subject ?? "Math";
  const topic = roomState?.topic ?? "";
  const grade = roomState?.grade ?? 4;
  const questionsTotal = roomState?.questionsTotal ?? 10;
  const teamScore = roomState?.teamScore ?? 0;
  const teamStars = roomState?.teamStars ?? 0;
  const encouragement = roomState?.encouragement ?? "";
  const gameMode = roomState?.gameMode ?? "casual";
  const gameStageLevel = roomState?.gameStageLevel ?? 1;
  const teamStreak = roomState?.teamStreak ?? 0;
  const teamComboLevel = roomState?.teamComboLevel ?? 0;
  const isMCQ = (problem?.options?.length ?? 0) >= 2;
  const config = getSubjectConfig(subject);
  const isSerious = gameMode === "serious";

  useEffect(() => {
    setSelected(null);
    setLocalFeedback(null);
    setTextInput("");
    setShakeCard(false);
  }, [problem?.id]);

  useEffect(() => {
    if (round > 1 && round !== prevRound.current) {
      if (teamStreak >= 3) {
        setEncourageMsg({ text: "Amazing teamwork! Keep it up!", variant: "success" });
      } else if (allCorrect) {
        setEncourageMsg({ text: "Everyone got it!", variant: "success" });
      }
    }
    prevRound.current = round;
  }, [round, teamStreak, allCorrect]);

  useEffect(() => {
    if (!lastAnswerResult) return;
    if (lastAnswerResult.correct) {
      setLocalFeedback({ correct: true });
    } else {
      setLocalFeedback({ correct: false, hint: lastAnswerResult.hint, explanation: lastAnswerResult.explanation });
      setSelected(null);
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 500);
    }
  }, [lastAnswerResult]);

  const handleMCQ = useCallback((letter: string) => {
    if (iAmCorrect) return;
    setSelected(letter);
    setLocalFeedback(null);
    submitAnswer(letter);
  }, [iAmCorrect, submitAnswer]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const val = textInput.trim();
    if (!val || iAmCorrect) return;
    setLocalFeedback(null);
    const num = parseFloat(val);
    submitAnswer(Number.isNaN(num) ? val : num);
  }, [textInput, iAmCorrect, submitAnswer]);

  if (!problem) return null;

  return (
    <div className="relative flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 w-full max-w-7xl flex-1 min-h-0 pb-safe">
      <ConfettiEffect trigger={iAmCorrect} big={allCorrect} />
      <TeamScorePopup teamScore={teamScore} teamStreak={teamStreak} allCorrect={allCorrect} />
      <EncouragementOverlay message={encourageMsg?.text ?? null} variant={encourageMsg?.variant ?? "success"} />
      <AchievementToast newAchievements={newAchievements} />
      <EncouragementOverlay
        message={lastPowerUpActivation ? `${lastPowerUpActivation.activatedBy} used ${lastPowerUpActivation.type === "team_shield" ? "Shield" : lastPowerUpActivation.type === "time_boost" ? "+10s" : "2x Pts"}!` : null}
        variant="success"
      />

      {/* Mobile score bar — replaces sidebar on small screens */}
      <div className="flex lg:hidden items-center justify-between bg-white/90 backdrop-blur-lg rounded-2xl border border-slate-100 shadow px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {humanPlayers.map((p) => (
            <span key={p.id} className={`text-xs font-medium px-2 py-1 rounded-lg border ${p.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              {p.name.split(" ")[0]}{p.id === playerId ? " ✓" : ""}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {teamStreak >= 2 && <span className="text-xs font-bold text-amber-600">🔥{teamStreak}</span>}
          <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: config.accentColor }}>{teamScore}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden ${shakeCard ? "animate-wrong-shake" : ""}`}
      >
        {/* Top HUD */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.span className="text-2xl sm:text-3xl" animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
              {config.emoji}
            </motion.span>
            <div>
              <div className="text-slate-800 text-base sm:text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{topic}</div>
              <div className="text-slate-500 text-xs">Grade {grade} · Lv.{gameStageLevel}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm font-medium">Q{round}/{questionsTotal}</span>
            <span className={`text-sm font-bold ${config.accentText}`} style={{ fontFamily: "var(--font-display)" }}>{teamScore} pts</span>
            {isSerious && (
              <span className="text-slate-400 text-[10px] font-medium bg-slate-100 rounded-lg px-2 py-1">1 chance</span>
            )}
          </div>
        </div>

        {/* Progress — fun chunky bar + stars */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`text-xl ${i < teamStars ? "text-amber-400 drop-shadow-sm" : "text-slate-200"}`}
                  animate={i < teamStars ? { scale: [1, 1.4, 1], rotate: [0, 15, 0] } : {}}
                  transition={i < teamStars ? { delay: i * 0.1, duration: 0.4 } : {}}
                >
                  {"\u2605"}
                </motion.span>
              ))}
            </div>
            <div className="progress-bar-fun flex-1">
              <motion.div
                className={`fill ${config.progressBarColor}`}
                initial={false}
                animate={{ width: `${(questionsTotal ? (round - 1) / questionsTotal : 0) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {teamStreak >= 2 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-200">
                {"\u{1F525}"}{teamStreak}
              </span>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <GameTimer seconds={timerSeconds} accentColor={config.accentColor} />
        </div>

        {/* Question — white card with subject accent */}
        <div
          className="game-card-light px-5 sm:px-8 py-4 sm:py-5 mb-4 sm:mb-5 shrink-0"
          style={{ "--subject-accent": config.accentColor } as React.CSSProperties}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl sm:text-3xl mt-0.5 shrink-0">{config.emoji}</span>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 leading-snug" style={{ fontFamily: "var(--font-display)", lineHeight: 1.5 }}>
              {problem.question}
            </p>
          </div>
        </div>

        {/* Power-ups */}
        <PowerUpBar
          powerUps={roomState?.powerUps}
          activeEffects={roomState?.activeEffects}
          onActivate={usePowerUp}
          disabled={iAmCorrect}
          isMCQ={isMCQ}
        />

        {/* Answer Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible flex flex-col gap-3 px-1 -mx-1">
          {/* Feedback */}
          <AnimatePresence>
            {localFeedback && !localFeedback.correct && !iAmCorrect && (
              <motion.div
                key="wrong-fb"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border-2 border-cyan-200 shadow-md px-4 sm:px-6 py-3 sm:py-4 shrink-0"
              >
                {isSerious ? (
                  <>
                    <p className="text-sm font-semibold text-sky-600 mb-1">Almost! Here&apos;s the answer:</p>
                    {localFeedback.explanation && (
                      <p className="text-sm text-slate-600 bg-sky-50 rounded-lg px-3 py-2">{localFeedback.explanation}</p>
                    )}
                    <p className="text-xs text-sky-500 mt-1.5">You&apos;ll get the next one! {"\u{1F4AA}"}</p>
                  </>
                ) : (
                  <>
                    {localFeedback.hint && (
                      <p className="text-sm text-slate-600 bg-cyan-50 rounded-lg px-3 py-2 mb-2">
                        <span className="font-medium text-cyan-700">Hint: </span>{localFeedback.hint}
                      </p>
                    )}
                    {localFeedback.explanation && (
                      <p className="text-sm text-slate-600 bg-cyan-50 rounded-lg px-3 py-2 mb-2">
                        <span className="font-medium text-slate-800">Explanation: </span>{localFeedback.explanation}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-cyan-600">
                      {localFeedback.hint && !localFeedback.explanation ? "Keep trying \u2014 you\u2019re learning! \u{1F331}" : "Now you know! \u2728"}
                    </p>
                  </>
                )}
              </motion.div>
            )}
            {iAmCorrect && (
              <motion.div
                key="correct-fb"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-lg px-5 sm:px-8 py-4 sm:py-5 shrink-0"
              >
                <div className="flex items-center gap-4">
                  <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }} className="text-4xl">{"\u{1F389}"}</motion.span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-emerald-700" style={{ fontFamily: "var(--font-display)" }}>Correct!</p>
                    {allCorrect ? (
                      <p className="text-sm text-emerald-600 mt-0.5">Everyone got it! {"\u{1F389}"}</p>
                    ) : humanPlayers.length > 1 ? (
                      <p className="text-sm text-emerald-500 mt-0.5">Waiting for teammates\u2026</p>
                    ) : null}
                  </div>
                  <div className="flex gap-0.5">
                    {["\u2B50", "\u2728", "\u2B50"].map((s, i) => (
                      <motion.span key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05, type: "spring" }} className="text-lg">
                        {s}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MCQ Options — Kahoot style */}
          {isMCQ ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-1" role="group" aria-label="Choose your answer">
              {(problem.options ?? []).map((opt, i) => {
                const letter = OPT_LETTERS[i]!;
                const isMyCorrectPick = iAmCorrect && selected === letter;
                const isWrong = myWrongAnswers.includes(letter);
                const isShielded = roomState?.activeEffects?.shieldRemovedOptions?.includes(letter) ?? false;
                const canClick = !iAmCorrect && !isWrong && !isShielded && selected !== letter;
                let cls = `game-option-kahoot ${OPT_CLASSES[i]}`;
                if (isMyCorrectPick) cls = "game-option-kahoot game-opt-correct-light";
                else if (isWrong || isShielded) cls = "game-option-kahoot game-opt-wrong-light";

                return (
                  <motion.button
                    key={letter}
                    type="button"
                    disabled={!canClick}
                    onClick={() => canClick && handleMCQ(letter)}
                    className={`${cls} min-h-[56px]`}
                    whileHover={canClick ? { scale: 1.02 } : {}}
                    whileTap={canClick ? { scale: 0.97 } : {}}
                  >
                    <span className={`w-12 h-12 rounded-2xl ${LETTER_COLORS[i]} flex items-center justify-center text-lg font-bold flex-shrink-0 text-white shadow-sm`} style={{ fontFamily: "var(--font-display)" }}>
                      {isWrong ? "\u2717" : isMyCorrectPick ? "\u2713" : letter}
                    </span>
                    <span className="flex-1 text-white text-base sm:text-lg">{opt}</span>
                    {isMyCorrectPick && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">{"\u2713"}</motion.span>}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="shrink-0">
              <input
                type="text"
                inputMode="numeric"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={iAmCorrect}
                autoFocus
                className="input-game-light mb-3"
              />
              <button
                type="submit"
                disabled={iAmCorrect || !textInput.trim()}
                className="btn-primary w-full min-h-[48px] text-white disabled:opacity-40"
              >
                {iAmCorrect ? "Correct \u2713" : "Submit"}
              </button>
            </form>
          )}

          {encouragement && round > 1 && (
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 px-4 py-3 text-center shrink-0 shadow-sm">
              <p className="text-xs font-medium text-slate-600">{encouragement}</p>
            </div>
          )}

          {roomState?.questionSource === "backup" && (
            <p className="text-xs text-gray-400 text-center mt-1">
              📚 Questions from our library
            </p>
          )}
        </div>

        {/* Player Status Bar */}
        <div className="border-t border-slate-200 pt-3 mt-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {humanPlayers.map((p) => (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium border ${
                  p.isCorrect
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : p.attempts > 0
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                {p.isCorrect ? "\u2713" : p.attempts > 0 ? "\u{1F4AD}" : "\u{1F914}"} {p.name}
                {p.id === playerId && " (you)"}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team Sidebar — hidden on mobile */}
      <div className="hidden lg:flex flex-col w-full lg:w-64 xl:w-72 flex-shrink-0">
        <TeamSidebar
          players={players}
          playerId={playerId}
          teamScore={teamScore}
          teamStreak={teamStreak}
          teamComboLevel={teamComboLevel}
          gameMode={gameMode}
          accentColor={config.accentColor}
        />
      </div>
    </div>
  );
}
