"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/app/context/GameContext";
import { getSubjectConfig } from "@/utils/subjects";
import type { Grade } from "@/utils/types";
import PlayerAvatar from "./PlayerAvatar";
import QRCode from "qrcode";
import ProfileNudge from "./ProfileNudge";

const GRADES: Grade[] = [3, 4, 5];

export default function WaitingRoom() {
  const { roomId, roomState, startGame, selectedSubject, selectedTopic, selectedGrade, playerId, gameStarting, renamePlayer, setPlayerName } = useGame();
  const [topic, setTopic] = useState(selectedTopic);
  const [customTopic, setCustomTopic] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [grade, setGrade] = useState<Grade>(selectedGrade);
  const [gameMode, setGameMode] = useState<"casual" | "serious">("serious");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Thinking up questions...");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const nicknameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!gameStarting) {
      setLoadingMsg("Thinking up questions...");
      return;
    }
    const t1 = setTimeout(() => setLoadingMsg("Making them fun..."), 2000);
    const t2 = setTimeout(() => setLoadingMsg("Almost ready..."), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [gameStarting]);

  useEffect(() => {
    if (!roomId || typeof window === "undefined") return;
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    QRCode.toDataURL(joinUrl, { width: 180, margin: 2, color: { dark: "#1e1b4b", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [roomId]);

  const config = getSubjectConfig(roomState?.subject ?? selectedSubject);
  const players = roomState?.players ?? [];
  const humanPlayers = players.filter((p) => !p.isBot);
  const isHost = humanPlayers.length > 0 && humanPlayers[0]?.id === playerId;
  const playerCount = humanPlayers.length;
  const canStart = playerCount >= 1 && playerCount <= 4;
  const activeTopic = useCustom && customTopic.trim() ? customTopic.trim() : topic;

  const openNicknameEdit = (currentName: string) => {
    setNicknameInput(currentName);
    setEditingNickname(true);
    setTimeout(() => { nicknameRef.current?.focus(); nicknameRef.current?.select(); }, 0);
  };

  const commitNickname = () => {
    const trimmed = nicknameInput.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().slice(0, 20);
    if (trimmed) {
      renamePlayer(trimmed);
      setPlayerName(trimmed);
      if (typeof window !== "undefined" && !localStorage.getItem("kt_username")) {
        localStorage.setItem("kt_guest_nickname", trimmed);
      }
    }
    setEditingNickname(false);
  };

  const pickPreset = (t: string) => {
    setTopic(t);
    setUseCustom(false);
    setCustomTopic("");
  };

  const copyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyLink = () => {
    if (!roomId || typeof window === "undefined") return;
    const url = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <>
    <ProfileNudge />
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl mx-auto px-2 sm:px-0">
      <div className="card-game p-4 sm:p-6">
        {/* Subject banner — full width */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-5 ${config.gradientClass}`}>
          <span className="text-3xl">{config.emoji}</span>
          <div className="flex-1">
            <p className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
              {config.label}
            </p>
            <p className="text-sm text-white/90">{activeTopic} &middot; Grade {grade}</p>
          </div>
          {/* Room code inline on desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-[0.2em] text-white/95">
              {roomId}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-all"
              aria-label={copied ? "Room code copied" : "Copy room code"}
            >
              {copied ? "✓ Copied" : "Copy Code"}
            </button>
            <button
              onClick={copyLink}
              className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-all"
              aria-label={copiedLink ? "Link copied" : "Copy join link"}
            >
              {copiedLink ? "✓ Link Copied" : "🔗 Copy Link"}
            </button>
          </div>
        </div>

        {/* Room code — mobile only */}
        <div className="sm:hidden mb-4">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Room Code</label>
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-2xl font-bold tracking-[0.25em] text-[var(--color-primary)] bg-violet-50 border-2 border-violet-200 rounded-xl px-3 py-3 text-center">
              {roomId}
            </span>
            <button onClick={copyCode} className="btn-secondary py-2.5 px-4 shrink-0">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={copyLink}
            className="mt-2 w-full rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 py-2.5 text-sm font-semibold text-violet-700 transition-colors"
          >
            {copiedLink ? "✓ Link Copied!" : "🔗 Copy Invite Link"}
          </button>
          <p className="text-xs text-slate-500 mt-1">Share this code or link with teammates!</p>
        </div>

        {/* ═══ 2-Column Layout (desktop) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-5">

          {/* LEFT: Players */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">
              Players ({humanPlayers.length}/4)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
              <AnimatePresence>
                {humanPlayers.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${p.id === playerId ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}
                  >
                    <PlayerAvatar emoji={p.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      {p.id === playerId && editingNickname ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={nicknameRef}
                            type="text"
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 20))}
                            onKeyDown={(e) => { if (e.key === "Enter") commitNickname(); if (e.key === "Escape") setEditingNickname(false); }}
                            onBlur={commitNickname}
                            className="flex-1 min-w-0 rounded-lg border border-violet-400 bg-white px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                            maxLength={20}
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); commitNickname(); }}
                            className="rounded-md bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 text-xs font-bold transition-colors"
                          >✓</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                          {p.id === playerId && (
                            <button
                              type="button"
                              onClick={() => openNicknameEdit(p.name)}
                              className="shrink-0 text-slate-400 hover:text-violet-500 transition-colors text-base leading-none"
                              aria-label="Edit nickname"
                            >✏️</button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-0.5">
                        {p.id === playerId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-violet-100 text-violet-700">You</span>
                        )}
                        {i === 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-800">{"\u{1F451}"} Host</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {humanPlayers.length < 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border-2 border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400 flex items-center justify-center"
                >
                  Waiting for teammates&hellip;
                </motion.div>
              )}
            </div>

            {/* Mode — below players on left */}
            <div className="mt-4">
              {isHost ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGameMode("serious")}
                      className={`flex-1 rounded-lg border py-2 px-2.5 text-sm font-medium transition-colors ${gameMode === "serious" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <span className="block font-semibold">{"\u{1F3AF}"} Standard</span>
                      <span className="block text-[10px] mt-0.5 opacity-90">One chance &middot; levels up</span>
                    </button>
                    <button
                      onClick={() => setGameMode("casual")}
                      className={`flex-1 rounded-lg border py-2 px-2.5 text-sm font-medium transition-colors ${gameMode === "casual" ? "border-violet-400 bg-violet-50/80 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <span className="block font-semibold">{"\u{1F331}"} Learn Slowly</span>
                      <span className="block text-[10px] mt-0.5 opacity-90">Hints &middot; no level</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-600">
                    Host will start in {gameMode === "serious" ? "\u{1F3AF} Standard" : "\u{1F331} Learn Slowly"} mode
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Topic + Grade settings (host only) */}
          <div>
            {isHost ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Topic</label>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {config.topics.map((t) => (
                    <button
                      key={t}
                      onClick={() => pickPreset(t)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${!useCustom && topic === t ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Custom topic</label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => { setCustomTopic(e.target.value); setUseCustom(!!e.target.value.trim()); }}
                  placeholder={config.customPlaceholder}
                  className="input-soft mb-3 text-sm !min-h-[44px] !py-2.5"
                />
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Grade</label>
                <div className="flex gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${grade === g ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center text-center h-full">
                <span className="text-4xl mb-2">{config.emoji}</span>
                <p className="text-base font-semibold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>
                  {activeTopic}
                </p>
                <p className="text-sm text-slate-500 mt-1">Grade {grade} &middot; {config.label}</p>
                <p className="text-xs text-slate-400 mt-3">Waiting for host to start&hellip;</p>
              </div>
            )}

            {roomState?.totalStars != null && roomState?.nextMilestone != null && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 mt-3">
                <p className="text-sm text-slate-700">Group: <strong>{roomState.totalStars}</strong> stars &middot; Next: {roomState.nextMilestone}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code — host only, shown before game starts */}
        {isHost && qrDataUrl && !gameStarting && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 flex flex-col sm:flex-row items-center gap-4"
          >
            <img
              src={qrDataUrl}
              alt={`QR code to join room ${roomId}`}
              width={90}
              height={90}
              className="rounded-lg shadow-sm shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-slate-700 mb-0.5">Invite friends to scan</p>
              <p className="text-xs text-slate-500 font-mono break-all">
                {typeof window !== "undefined" ? `${window.location.origin}/join/${roomId}` : `/join/${roomId}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Or share the room code: <span className="font-bold text-slate-600 tracking-widest">{roomId}</span></p>
            </div>
          </motion.div>
        )}

        {/* AI Generating overlay */}
        {gameStarting && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <motion.span
              className="inline-block text-3xl mb-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {"\u{1F9E0}"}
            </motion.span>
            <p className="text-sm font-medium text-slate-700">{loadingMsg}</p>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-sky-500 rounded-full"
                initial={{ width: "10%" }}
                animate={{ width: "85%" }}
                transition={{ duration: 6, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Start button — full width */}
        {isHost ? (
          <button
            className="w-full min-h-[56px] rounded-2xl px-6 py-3.5 text-xl font-bold transition-all duration-300 bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-200 text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]"
            style={{ fontFamily: "var(--font-display)" }}
            onClick={() => startGame(selectedSubject, activeTopic, grade, gameMode)}
            disabled={!canStart || gameStarting}
          >
            {gameStarting ? "Generating\u2026" : canStart ? "\u{1F680} Start Game!" : "Waiting for players\u2026"}
          </button>
        ) : (
          <p className="text-center py-3 text-sm text-slate-600 animate-pulse">
            {gameStarting ? "AI is generating your questions\u2026" : "Waiting for host to start the game\u2026"}
          </p>
        )}
      </div>
    </motion.div>
    </>
  );
}
