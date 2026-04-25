import type { Server } from "socket.io";
import type { GameRoom, Grade, PowerUpType, Subject, Topic } from "../types";
import { MIN_QUESTIONS, MAX_QUESTIONS, QUESTIONS_BASE } from "../config/constants";
import {
  addBotPlayer,
  createRoom,
  addPlayer,
  startGameWithLocalFallback,
  startGameWithQuestions,
  processPlayerAnswer,
  storePlayerAnswer,
  allHumansSubmitted,
  validateAllPendingAnswers,
  allPlayersDone,
  advanceToNextQuestion,
  handleTimerExpiry,
  moveToSessionSummary,
  mapOpenAIQuestionToMathProblem,
  getTeamAccuracy,
  getEncouragement,
  getQuestionsRemaining,
  activatePowerUp,
} from "../game/engine";
import { computeSessionBadges } from "../game/badges";
import { checkSessionAchievements } from "../game/achievements";
import { getProgress, addGameResult, getNextMilestone } from "../store/progressStore";
import { addGameResult as addUserGameResult, getSubjectLevelForUser, mergeSessionAchievements } from "../store/profileStore";
import { getQuestionsWithFallback } from "../services/questionPoolService";
import { checkRateLimit, clearSocketRateLimit } from "./middleware";

const rooms = new Map<string, GameRoom>();
const startingRooms = new Set<string>(); // prevent double-start
const QUESTION_TIME_SEC = 30;
const MAX_ROOMS = 500;
const ROOM_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours hard cap

const VALID_SUBJECTS: Subject[] = ["Math", "Science", "English", "History", "Geography", "General Knowledge"];
const VALID_GRADES: Grade[] = [3, 4, 5];

// Room cleanup thresholds (configurable via env)
const CLEANUP_INTERVAL_MS =
  typeof process.env.ROOM_CLEANUP_INTERVAL_MS !== "undefined"
    ? Math.max(60_000, parseInt(process.env.ROOM_CLEANUP_INTERVAL_MS, 10) || 300_000)
    : 5 * 60 * 1000; // 5 min default
const SESSION_SUMMARY_AGE_MS =
  typeof process.env.ROOM_CLEANUP_SESSION_SUMMARY_AGE_MS !== "undefined"
    ? Math.max(60_000, parseInt(process.env.ROOM_CLEANUP_SESSION_SUMMARY_AGE_MS, 10) || 1_800_000)
    : 30 * 60 * 1000; // 30 min default
const WAITING_IDLE_MS =
  typeof process.env.ROOM_CLEANUP_WAITING_IDLE_MS !== "undefined"
    ? Math.max(60_000, parseInt(process.env.ROOM_CLEANUP_WAITING_IDLE_MS, 10) || 3_600_000)
    : 60 * 60 * 1000; // 60 min default

// Interval deduplication — prevent duplicate timers if registerSocketHandlers is called multiple times
let timerLoopInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

const ROOM_ID_REGEX = /^[A-Z0-9]{4,8}$/i;
const MAX_PLAYER_NAME = 32;
const MAX_ANSWER_LENGTH = 200;

function isValidRoomId(id: unknown): id is string {
  return typeof id === "string" && ROOM_ID_REGEX.test(id.trim().toUpperCase());
}

function sanitizePlayerName(name: unknown): string | null {
  if (name == null || typeof name !== "string") return null;
  const trimmed = String(name).trim().slice(0, MAX_PLAYER_NAME);
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeAnswer(val: unknown): number | string | null {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim().slice(0, MAX_ANSWER_LENGTH);
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

// ─── Auto-advance helper ────────────────────────────────────────────────────

function autoAdvanceIfDone(io: Server, roomId: string, room: GameRoom) {
  if (!allPlayersDone(room)) return;
  setTimeout(() => {
    const current = rooms.get(roomId);
    if (!current || current.status !== "playing") return;
    const advanced = advanceToNextQuestion(current);
    rooms.set(roomId, advanced);
    if (advanced.status === "session_summary") {
      persistProgressIfNeeded(advanced, io);
      io.to(roomId).emit("game_over", getRoomState(advanced));
    } else {
      io.to(roomId).emit("next_round", getRoomState(advanced));
    }
    io.to(roomId).emit("room_state", getRoomState(advanced));
  }, 1500);
}

// ─── State Helpers ──────────────────────────────────────────────────────────

function persistProgressIfNeeded(room: GameRoom, io?: Server): void {
  if (room.status !== "session_summary" || room.progressSaved) return;
  // Standard mode only: level progress counts. Learn Slowly is practice — no level save.
  if (room.gameMode !== "serious") return;
  if (room.groupCode?.trim()) {
    addGameResult(room.groupCode.trim().toUpperCase().slice(0, 20), room.teamStars);
  }

  const badges = computeSessionBadges(room);
  const sessionAchievements = checkSessionAchievements(room, badges);

  for (const p of room.players) {
    if (!p.isBot && p.username?.trim()) {
      const { newAchievements: persistentNew } = addUserGameResult(p.username.trim(), room.subject, room.teamStars, p.helpedCount ?? 0);
      const sessionNew = mergeSessionAchievements(p.username.trim(), sessionAchievements);
      const allNew = [...new Set([...persistentNew, ...sessionNew])];
      if (allNew.length > 0 && io) {
        const targetSocket = io.sockets.sockets.get(p.id);
        if (targetSocket) targetSocket.emit("achievement_unlocked", { achievements: allNew });
      }
    }
  }
  room.progressSaved = true;
}

function getRoomState(room: GameRoom) {
  let timerSeconds: number | undefined;
  if (room.status === "playing" && room.currentProblem && room.questionStartTime != null) {
    const elapsed = Math.floor((Date.now() - room.questionStartTime) / 1000);
    timerSeconds = Math.max(0, QUESTION_TIME_SEC - elapsed);
  }
  const round = room.currentQuestionIndex + 1;
  const questionsTotal = room.currentQuestions.length || 10;
  const questionsRemaining = getQuestionsRemaining(room);
  const teamAccuracy = getTeamAccuracy(room);

  const payload: Record<string, unknown> = {
    roomId: room.roomId,
    players: room.players,
    currentLevel: room.currentLevel,
    teamScore: room.teamScore,
    teamStars: room.teamStars,
    hintsUsed: room.hintsUsed,
    groupCode: room.groupCode,
    gameMode: room.gameMode,
    gameStageLevel: room.gameStageLevel,
    currentProblem: room.currentProblem,
    status: room.status,
    problemsSolved: room.problemsSolved,
    subject: room.subject,
    topic: room.topic,
    grade: room.grade,
    timerSeconds,
    questionStartTime: room.questionStartTime,
    round,
    questionsTotal,
    questionsRemaining,
    teamAccuracy,
    encouragement: getEncouragement(teamAccuracy),
    teamStreak: room.teamStreak ?? 0,
    teamComboLevel: room.teamComboLevel ?? 0,
    bestTeamStreak: room.bestTeamStreak ?? 0,
    powerUps: room.powerUps,
    activeEffects: room.activeEffects,
    questionSource: room.questionSource,
  };

  if (room.status === "session_summary") {
    payload.sessionBadges = computeSessionBadges(room);
    payload.problemHistory = room.problemHistory;
  }
  if (room.groupCode?.trim()) {
    const progress = getProgress(room.groupCode.trim().toUpperCase().slice(0, 20));
    payload.totalStars = progress.totalStars;
    const next = getNextMilestone(progress.totalStars);
    payload.nextMilestone = next === null ? undefined : next;
  }
  if (room.gameStageLevel != null) payload.gameStageLevel = room.gameStageLevel;

  return payload;
}

// ─── Room Cleanup ───────────────────────────────────────────────────────────

function runRoomCleanup(): number {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [roomId, room] of rooms.entries()) {
    // Hard age limit: delete any room older than ROOM_MAX_AGE_MS regardless of status
    const roomCreatedAt =
      room.status === "waiting" && room.players.length > 0
        ? Math.min(...room.players.map((p) => p.joinedAt))
        : room.sessionStartTime;
    if (now - roomCreatedAt > ROOM_MAX_AGE_MS) {
      toDelete.push(roomId);
      continue;
    }

    if (room.status === "session_summary") {
      const at = room.sessionSummaryAt ?? room.sessionStartTime;
      if (now - at > SESSION_SUMMARY_AGE_MS) toDelete.push(roomId);
    } else if (room.status === "waiting" && room.players.length > 0) {
      const lastActivity = Math.max(...room.players.map((p) => p.joinedAt));
      if (now - lastActivity > WAITING_IDLE_MS) toDelete.push(roomId);
    }
  }

  for (const id of toDelete) {
    rooms.delete(id);
    startingRooms.delete(id);
  }
  if (toDelete.length > 0) {
    console.log(`[Cleanup] Removed ${toDelete.length} room(s): ${toDelete.join(", ")}`);
  }
  return toDelete.length;
}

function startRoomCleanupJob(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => runRoomCleanup(), CLEANUP_INTERVAL_MS);
  console.log(
    `[Cleanup] Job started: interval=${CLEANUP_INTERVAL_MS / 1000}s, session_summary age=${SESSION_SUMMARY_AGE_MS / 60000}min, waiting idle=${WAITING_IDLE_MS / 60000}min`,
  );
}

// ─── Timer Loop ─────────────────────────────────────────────────────────────

function startTimerLoop(io: Server): void {
  if (timerLoopInterval) return;
  timerLoopInterval = setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      if (room.status !== "playing" || !room.currentProblem || room.questionStartTime == null) continue;
      const elapsed = Math.floor((now - room.questionStartTime) / 1000);
      const secondsLeft = QUESTION_TIME_SEC - elapsed;
      io.to(roomId).emit("timer_tick", { secondsLeft: Math.max(0, secondsLeft) });
      if (secondsLeft > 0) continue;

      const updated = handleTimerExpiry(room);
      rooms.set(roomId, updated);
      if (updated.status === "session_summary") {
        persistProgressIfNeeded(updated, io);
        io.to(roomId).emit("game_over", getRoomState(updated));
      } else {
        io.to(roomId).emit("next_round", getRoomState(updated));
      }
      io.to(roomId).emit("room_state", getRoomState(updated));
    }
  }, 1000);
}

// ─── Socket Handlers ────────────────────────────────────────────────────────

export function registerSocketHandlers(io: Server): void {
  startTimerLoop(io);
  startRoomCleanupJob();

  io.on("connection", (socket) => {
    socket.on(
      "create_room",
      (
        data?: { groupCode?: string; gameMode?: "casual" | "serious"; subject?: Subject; topic?: Topic; grade?: Grade },
        callback?: (data: { roomId: string; totalStars?: number; nextMilestone?: number }) => void,
      ) => {
        if (!checkRateLimit(socket.id, "create_room")) {
          callback?.({ roomId: "" });
          return;
        }
        if (rooms.size >= MAX_ROOMS) {
          callback?.({ roomId: "", error: "Server is full, try again later" } as { roomId: string; totalStars?: number; nextMilestone?: number });
          return;
        }
        const opts = data ?? {};
        const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
        const groupCode = opts.groupCode?.trim().toUpperCase().slice(0, 20);
        const gameMode = (opts.gameMode ?? "serious") as "casual" | "serious";
        const rawSubject = opts.subject ?? "Math";
        const rawGrade = opts.grade ?? 4;
        const subject: Subject = VALID_SUBJECTS.includes(rawSubject as Subject) ? (rawSubject as Subject) : "Math";
        const topic = (opts.topic ?? "Mixed") as Topic;
        const grade: Grade = VALID_GRADES.includes(rawGrade as Grade) ? (rawGrade as Grade) : 4;
        const room = createRoom(roomId, subject, topic, grade, groupCode, gameMode);
        rooms.set(roomId, room);
        let totalStars: number | undefined;
        let nextMilestone: number | undefined;
        if (groupCode) {
          const progress = getProgress(groupCode);
          totalStars = progress.totalStars;
          const next = getNextMilestone(progress.totalStars);
          nextMilestone = next === null ? undefined : next;
        }
        callback?.({ roomId, totalStars, nextMilestone });
      },
    );

    socket.on(
      "join_room",
      (data: { roomId: string; playerName: string; groupCode?: string; username?: string; avatar?: string }, callback?: (data: { success: boolean; error?: string }) => void) => {
        if (!checkRateLimit(socket.id, "join_room")) {
          callback?.({ success: false, error: "Rate limit exceeded" });
          return;
        }
        const roomIdRaw = data?.roomId;
        const roomId = isValidRoomId(roomIdRaw) ? String(roomIdRaw).trim().toUpperCase() : null;
        const playerName = sanitizePlayerName(data?.playerName);
        if (!roomId || !playerName) {
          callback?.({ success: false, error: "Invalid room code or nickname" });
          return;
        }
        const room = rooms.get(roomId);
        if (!room) { callback?.({ success: false, error: "Room not found" }); return; }
        if (room.players.length >= 4) { callback?.({ success: false, error: "Room is full" }); return; }
        const username = typeof data?.username === "string" ? data.username.trim().slice(0, 32) || undefined : undefined;
        const avatar = typeof data?.avatar === "string" ? data.avatar.trim().slice(0, 4) || undefined : undefined;
        let updated = addPlayer(room, socket.id, playerName, username, avatar);
        if (data.groupCode?.trim() && !updated.groupCode) {
          updated = { ...updated, groupCode: data.groupCode.trim().toUpperCase().slice(0, 20) };
        }
        rooms.set(roomId, updated);
        socket.join(roomId);
        callback?.({ success: true });
        io.to(roomId).emit("room_state", getRoomState(updated));
      },
    );

    socket.on("rename_player", (data: { roomId: string; newName: string }) => {
      const roomId = isValidRoomId(data?.roomId) ? String(data.roomId).trim().toUpperCase() : null;
      const newName = sanitizePlayerName(data?.newName);
      if (!roomId || !newName) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const updated = {
        ...room,
        players: room.players.map((p) =>
          p.id === socket.id ? { ...p, name: newName } : p,
        ),
      };
      rooms.set(roomId, updated);
      io.to(roomId).emit("room_state", getRoomState(updated));
    });

    socket.on(
      "start_game",
      async (roomIdOrData: string | { roomId: string; subject?: Subject; topic?: Topic; grade?: Grade; gameMode?: "casual" | "serious" }) => {
        if (!checkRateLimit(socket.id, "start_game")) return;
        const roomIdRaw = typeof roomIdOrData === "string" ? roomIdOrData : roomIdOrData?.roomId;
        const roomId = isValidRoomId(roomIdRaw) ? String(roomIdRaw).trim().toUpperCase() : null;
        if (!roomId) return;
        const rawSubject = typeof roomIdOrData === "string" ? "Math" : (roomIdOrData.subject ?? "Math");
        const rawGrade = typeof roomIdOrData === "string" ? 4 : (roomIdOrData.grade ?? 4);
        const subject: Subject = VALID_SUBJECTS.includes(rawSubject as Subject) ? (rawSubject as Subject) : "Math";
        const topic: Topic = typeof roomIdOrData === "string" ? "Mixed" : (roomIdOrData.topic ?? "Mixed");
        const grade: Grade = VALID_GRADES.includes(rawGrade as Grade) ? (rawGrade as Grade) : 4;
        const gameMode: "casual" | "serious" = typeof roomIdOrData === "object" && roomIdOrData.gameMode === "casual" ? "casual" : "serious";

        // Prevent double-start — lock IMMEDIATELY after check, before any async work
        if (startingRooms.has(roomId)) return;
        startingRooms.add(roomId);

        let room = rooms.get(roomId);
        if (!room || room.players.length < 1) {
          startingRooms.delete(roomId);
          return;
        }

        const humanCount = room.players.filter((p) => !p.isBot).length;
        if (humanCount < 1 || humanCount > 4) {
          startingRooms.delete(roomId);
          io.to(roomId).emit("room_state", getRoomState(room));
          return;
        }

        if (humanCount === 1 && room.players.length < 2) {
          room = addBotPlayer(room);
          rooms.set(roomId, room);
        }

        const roomUpdated = { ...room, subject, topic, grade, gameMode };

        io.to(roomId).emit("game_starting", { subject, topic, grade });

        const humanPlayers = room.players.filter((p) => !p.isBot);
        const playerLevels = humanPlayers
          .filter((p) => p.username?.trim())
          .map((p) => getSubjectLevelForUser(p.username!.trim(), subject));
        const gameLevel = playerLevels.length > 0
          ? Math.round(playerLevels.reduce((a, b) => a + b, 0) / playerLevels.length)
          : 1;
        const questionCount = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, QUESTIONS_BASE + gameLevel));
        let updated: GameRoom;

        console.log(`[Game] Starting game: ${subject} / ${topic} / Gr.${grade} mode=${gameMode} stage Level ${gameLevel} (${questionCount} questions) for room ${roomId}`);

        try {
          try {
            const usedHashes = room!.usedQuestionHashes ?? [];
            const { questions: raw, source } = await getQuestionsWithFallback(subject, topic, grade, gameMode, gameLevel, questionCount, usedHashes);
            console.log(`[Game] Got ${raw.length} questions from source="${source}"`);

            if (raw.length >= 1) {
              const questions = raw.map((q, i) => mapOpenAIQuestionToMathProblem(q, i, room!.currentLevel)).slice(0, questionCount);
              updated = { ...startGameWithQuestions(roomUpdated, questions, subject, topic, grade, gameLevel), questionSource: source };
              console.log(`[Game] Using ${source} questions`);
            } else {
              console.log(`[Game] No questions available, using local fallback`);
              updated = { ...startGameWithLocalFallback(roomUpdated, subject, topic, grade, questionCount, gameLevel), questionSource: "local" };
            }
          } catch (err) {
            console.error(`[Game] Question fetch failed, using local fallback:`, err);
            updated = { ...startGameWithLocalFallback(roomUpdated, subject, topic, grade, questionCount, gameLevel), questionSource: "local" };
          }

          rooms.set(roomId, updated);
          io.to(roomId).emit("room_state", getRoomState(updated));
        } finally {
          startingRooms.delete(roomId);
        }
      },
    );

    socket.on("submit_answer", (data: { roomId: string; answer: number | string }) => {
      const roomId = isValidRoomId(data?.roomId) ? String(data.roomId).trim().toUpperCase() : null;
      const answer = sanitizeAnswer(data?.answer);
      if (!roomId || answer === null) return;

      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || !room.currentProblem) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player || player.isBot) return;

      const isFirstSubmit = player.attempts < 1;
      const cooperativeMode = room.gameMode === "casual";

      // Learn Slowly (casual): store first, validate when all submitted. Allows retries with hints.
      if (cooperativeMode && isFirstSubmit) {
        const stored = storePlayerAnswer(room, socket.id, answer);
        rooms.set(roomId, stored);
        io.to(roomId).emit("room_state", getRoomState(stored));

        if (allHumansSubmitted(stored)) {
          const { room: validated, results } = validateAllPendingAnswers(stored);
          rooms.set(roomId, validated);
          results.forEach((result, pid) => {
            const targetSocket = io.sockets.sockets.get(pid);
            if (targetSocket) targetSocket.emit("answer_result", result);
          });
          io.to(roomId).emit("room_state", getRoomState(validated));
          autoAdvanceIfDone(io, roomId, validated);
        }
        return;
      }

      // Standard (serious): one chance, validate immediately
      const { room: updatedRoom, result } = processPlayerAnswer(room, socket.id, answer);
      rooms.set(roomId, updatedRoom);

      socket.emit("answer_result", result);
      io.to(roomId).emit("room_state", getRoomState(updatedRoom));
      autoAdvanceIfDone(io, roomId, updatedRoom);
    });

    socket.on("use_power_up", (data: { roomId: string; powerUp: string }) => {
      if (!checkRateLimit(socket.id, "join_room")) return; // reuse join_room limit
      const roomId = isValidRoomId(data?.roomId) ? String(data.roomId).trim().toUpperCase() : null;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player || player.isBot) return;
      const type = data?.powerUp as PowerUpType;
      if (!["team_shield", "time_boost", "bonus_round"].includes(type)) return;

      const { room: updated, success } = activatePowerUp(room, type);
      if (!success) return;
      rooms.set(roomId, updated);
      io.to(roomId).emit("power_up_activated", { type, activatedBy: player.name });
      io.to(roomId).emit("room_state", getRoomState(updated));
    });

    socket.on("session_summary", (roomIdRaw: string) => {
      const roomId = isValidRoomId(roomIdRaw) ? String(roomIdRaw).trim().toUpperCase() : null;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const updated = moveToSessionSummary(room);
      rooms.set(roomId, updated);
      persistProgressIfNeeded(updated, io);
      io.to(roomId).emit("room_state", getRoomState(updated));
    });

    socket.on("replay", (roomIdRaw: string) => {
      const roomId = isValidRoomId(roomIdRaw) ? String(roomIdRaw).trim().toUpperCase() : null;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      io.to(roomId).emit("replay_data", {
        problemHistory: room.problemHistory,
        teamScore: room.teamScore,
        problemsSolved: room.problemsSolved,
      });
    });

    socket.on("leave_room", (roomIdRaw: string) => {
      const roomId = isValidRoomId(roomIdRaw) ? String(roomIdRaw).trim().toUpperCase() : null;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      socket.leave(roomId);
      const newPlayers = room.players.filter((p) => p.id !== socket.id);
      if (newPlayers.length === 0 || newPlayers.every((p) => p.isBot)) {
        rooms.delete(roomId);
      } else {
        rooms.set(roomId, { ...room, players: newPlayers });
        io.to(roomId).emit("room_state", getRoomState(rooms.get(roomId)!));
      }
    });

    socket.on("disconnect", () => {
      clearSocketRateLimit(socket.id);
      for (const [roomId, room] of rooms.entries()) {
        const idx = room.players.findIndex((p) => p.id === socket.id);
        if (idx !== -1) {
          const newPlayers = room.players.filter((p) => p.id !== socket.id);
          if (newPlayers.length === 0 || newPlayers.every((p) => p.isBot)) {
            rooms.delete(roomId);
          } else {
            rooms.set(roomId, { ...room, players: newPlayers });
            io.to(roomId).emit("room_state", getRoomState(rooms.get(roomId)!));
          }
          break;
        }
      }
    });
  });
}

export function getRooms(): Map<string, GameRoom> {
  return rooms;
}

/** Create a room via REST API and store it. Returns roomId (code) for clients to join. */
export function createAndStoreRoom(options?: {
  subject?: Subject;
  topic?: Topic;
  grade?: Grade;
  groupCode?: string;
  gameMode?: "casual" | "serious";
}): { roomId: string; error?: string } {
  if (rooms.size >= MAX_ROOMS) {
    return { roomId: "", error: "Server is full, try again later" };
  }
  const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const rawSubject = options?.subject ?? "Math";
  const rawGrade = options?.grade ?? 4;
  const subject: Subject = VALID_SUBJECTS.includes(rawSubject as Subject) ? (rawSubject as Subject) : "Math";
  const topic = options?.topic ?? "Mixed";
  const grade: Grade = VALID_GRADES.includes(rawGrade as Grade) ? (rawGrade as Grade) : 4;
  const groupCode = options?.groupCode?.trim().toUpperCase().slice(0, 20);
  const gameMode = options?.gameMode ?? "serious";
  const room = createRoom(roomId, subject, topic, grade, groupCode, gameMode);
  rooms.set(roomId, room);
  return { roomId };
}
