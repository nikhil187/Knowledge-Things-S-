"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/app/context/GameContext";
import { getSubjectConfig } from "@/utils/subjects";
import WaitingRoom from "@/components/WaitingRoom";
import GameScreen from "@/components/GameScreen";
import SessionSummary from "@/components/SessionSummary";
import LoadingSpinner from "@/components/LoadingSpinner";
import LevelUpCelebration from "@/components/LevelUpCelebration";

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    document.exitFullscreen?.().catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exit();
    else enter();
  }, [enter, exit]);

  return { isFullscreen, enter, exit, toggle };
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { setRoomId, roomState, connected, connectError, leaveRoom } = useGame();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false);
  const prevStatus = useRef<string>("waiting");
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Dead-room detection state
  const [invalidRoom, setInvalidRoom] = useState(false);
  const [deadRoomToast, setDeadRoomToast] = useState(false);
  const [deadRoomCountdown, setDeadRoomCountdown] = useState(false);

  useEffect(() => {
    setRoomId(roomId ?? null);
  }, [roomId, setRoomId]);

  const status = roomState?.status ?? "waiting";
  const isActive = status === "playing";
  const teamStars = roomState?.teamStars ?? 0;
  const gameMode = roomState?.gameMode ?? "serious";
  const gameStageLevel = roomState?.gameStageLevel ?? 1;
  const subject = roomState?.subject ?? "Math";
  const config = getSubjectConfig(subject);
  const showFullscreenPrompt = isActive && !isFullscreen && !fullscreenDismissed;

  const humanPlayers = roomState?.players?.filter((p) => !p.isBot) ?? [];

  // Change 3: Invalid room — connected but roomState never arrived after a grace period
  useEffect(() => {
    if (!connected || roomState !== null) return;
    const timer = setTimeout(() => {
      // Still no roomState after 8s while connected → room doesn't exist
      // 8s gives Render free-tier cold starts time to wake before false-erroring
      setInvalidRoom(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [connected, roomState]);

  // Change 1: Dead room — roomState exists but 0 human players for 30 seconds
  useEffect(() => {
    if (!connected || roomState === null || status !== "waiting") return;
    if (humanPlayers.length > 0) return;

    // Start the 30s dead-room countdown
    const toastTimer = setTimeout(() => {
      setDeadRoomToast(true);
      setDeadRoomCountdown(true);
    }, 30_000);

    return () => clearTimeout(toastTimer);
  }, [connected, roomState, status, humanPlayers.length]);

  // Change 1: After toast shows, redirect to / after 3 more seconds
  useEffect(() => {
    if (!deadRoomCountdown) return;
    const redirectTimer = setTimeout(() => {
      leaveRoom();
      router.push("/");
    }, 3_000);
    return () => clearTimeout(redirectTimer);
  }, [deadRoomCountdown, leaveRoom, router]);

  useEffect(() => {
    if (status === "session_summary" && prevStatus.current === "playing") {
      if (gameMode === "serious" && teamStars >= 4) {
        setShowLevelUp(true);
        setShowSummary(false);
      } else {
        setShowSummary(true);
      }
    }
    if (status !== "session_summary") {
      setShowSummary(false);
      setShowLevelUp(false);
    }
    if (status === "waiting") {
      setFullscreenDismissed(false);
    }
    prevStatus.current = status;
  }, [status, gameMode, teamStars]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    window.history.pushState(null, "", window.location.href);
    const handler = () => {
      const leave = window.confirm("You are in the middle of a quiz! Are you sure you want to leave?");
      if (leave) {
        leaveRoom();
        router.push("/");
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isActive, leaveRoom, router]);

  const handleLeaveQuiz = useCallback(() => {
    if (isActive) {
      const leave = window.confirm("You are in the middle of a quiz! Are you sure you want to leave?");
      if (!leave) return;
    }
    leaveRoom();
    router.push("/");
  }, [isActive, leaveRoom, router]);

  if (!connected) {
    return (
      <div className="min-h-full relative flex flex-1 flex-col items-center justify-center p-6 gap-6" role="status" aria-live="polite">
        <div className="fixed inset-0 -z-10 animated-bg" />
        {connectError ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-game p-8 max-w-md w-full text-center"
          >
            <span className="text-5xl mb-4 block" aria-hidden="true">{"\u{1F4E1}"}</span>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Connection lost</h2>
            <p className="text-slate-600 text-sm mb-6">{connectError}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-white w-full min-h-[52px]"
              aria-label="Retry connection"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" label="Connecting to game" />
            <p className="text-slate-800 font-semibold">Connecting&hellip;</p>
          </div>
        )}
      </div>
    );
  }

  // Change 3: Invalid / expired room — show full-page friendly error
  if (invalidRoom) {
    return (
      <div className="min-h-full relative flex flex-1 flex-col items-center justify-center p-6">
        <div className="fixed inset-0 -z-10 animated-bg" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-game p-8 max-w-sm w-full text-center"
        >
          <span className="text-6xl mb-4 block" aria-hidden="true">🔍</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            This game room doesn&apos;t exist or has ended
          </h2>
          <p className="text-slate-500 text-sm mb-8">Ask your friend for a new game link</p>
          <button
            onClick={() => { leaveRoom(); router.push("/"); }}
            className="w-full min-h-[52px] rounded-2xl px-6 py-3 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-200 active:scale-[0.97]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full relative flex flex-1 flex-col">
      {/* Always show animated bg */}
      <div className="fixed inset-0 -z-10 animated-bg" />
      {/* Subject-tinted overlay during gameplay */}
      {(status === "playing" || status === "session_summary") && (
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background: config.bgGradientStyle,
            backgroundSize: "400% 400%",
            animation: "bg-shift 20s ease infinite",
            opacity: 0.5,
          }}
        />
      )}

      {/* Change 1: Dead-room toast banner */}
      <AnimatePresence>
        {deadRoomToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3.5 shadow-lg">
              <span className="text-2xl shrink-0" aria-hidden="true">🏠</span>
              <p className="text-sm font-semibold text-amber-800">
                Hmm, we can&apos;t find this game room. Taking you home!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex flex-1 flex-col w-full container-touch py-2 sm:py-3 md:py-4 ${
          status === "waiting"
            ? "items-center justify-center"
            : status === "session_summary"
              ? "items-center justify-start overflow-y-auto"
              : "items-center justify-start pt-2"
        }`}
      >
        <div className={`w-full mx-auto flex flex-col flex-1 min-h-0 ${status === "playing" ? "max-w-7xl" : status === "session_summary" ? "max-w-4xl" : "max-w-4xl"}`}>
          <div className="flex justify-between items-center mb-2 w-full">
            {/* Change 2: Proper "← Back to Home" button */}
            <button
              onClick={handleLeaveQuiz}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-sm font-semibold text-slate-700 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 shadow-sm"
              aria-label="Leave game and return home"
            >
              ← Back to Home
            </button>
            <div className="flex items-center gap-2">
              {roomId && (
                <span className="text-xs font-mono tracking-wider text-slate-400">Room {roomId}</span>
              )}
              {isActive && (
                <button
                  onClick={toggleFullscreen}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition-colors"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? "\u{2716} Exit" : "\u{26F6} Fullscreen"}
                </button>
              )}
            </div>
          </div>

          {/* Fullscreen suggestion banner — shows once when game starts */}
          <AnimatePresence>
            {showFullscreenPrompt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex items-center justify-between gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-violet-700 font-medium">{"\u{1F3AE}"} Go fullscreen for the best experience!</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { toggleFullscreen(); setFullscreenDismissed(true); }}
                      className="text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Yes!
                    </button>
                    <button
                      onClick={() => setFullscreenDismissed(true)}
                      className="text-sm font-medium text-violet-500 hover:text-violet-700 transition-colors"
                    >
                      No thanks
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {status === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center"
              >
                <WaitingRoom />
              </motion.div>
            )}
            {status === "playing" && (
              <motion.div
                key="playing"
                className="w-full flex-1 flex min-h-0 min-h-[50vh] sm:min-h-[60vh]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GameScreen />
              </motion.div>
            )}
            {status === "session_summary" && (
              <motion.div
                key="session_summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center"
              >
                <LevelUpCelebration
                  show={showLevelUp}
                  newLevel={Math.min(10, gameStageLevel + 1)}
                  subject={subject}
                  onComplete={() => { setShowLevelUp(false); setShowSummary(true); }}
                />
                {(showSummary || !showLevelUp) && <SessionSummary />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
