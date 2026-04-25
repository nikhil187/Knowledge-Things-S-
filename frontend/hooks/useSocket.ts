"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { AnswerResult, Grade, PowerUpType, RoomState, Subject, Topic } from "@/utils/types";
import { getSocketUrl } from "@/utils/socket";

const SOCKET_TIMEOUT_MS = 15000;

type CreateRoomData = { roomId: string; totalStars?: number; nextMilestone?: number; error?: string };

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  const [gameStarting, setGameStarting] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [lastPowerUpActivation, setLastPowerUpActivation] = useState<{ type: string; activatedBy: string } | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const url = getSocketUrl();
    if (!url) {
      setConnectError("Socket URL not configured");
      return;
    }
    const s = io(url, { autoConnect: true, timeout: SOCKET_TIMEOUT_MS });
    s.on("connect", () => {
      setConnected(true);
      setConnectError(null);
      setPlayerId(s.id ?? null);
    });
    s.on("disconnect", (reason) => {
      setConnected(false);
      setGameStarting(false);
      setLastAnswerResult(null);
      if (reason === "io server disconnect") {
        setConnectError("Server disconnected");
      } else if (reason === "transport close" || reason === "transport error" || reason === "ping timeout") {
        setConnectError("Connection lost. Check your network and try again.");
      }
    });
    s.on("connect_error", (err) => {
      setConnected(false);
      setConnectError(err.message || "Connection failed");
    });
    s.on("room_state", (state: RoomState) => {
      setGameStarting(false);
      setRoomState(state);
    });
    s.on("game_over", (state: RoomState) => {
      setGameStarting(false);
      setRoomState(state);
    });
    s.on("next_round", (state: RoomState) => {
      setRoomState(state);
    });
    s.on("timer_tick", (data: { secondsLeft: number }) => {
      setRoomState((prev) => (prev ? { ...prev, timerSeconds: data.secondsLeft } : null));
    });
    s.on("answer_result", (result: AnswerResult) => {
      setLastAnswerResult(result);
    });
    s.on("game_starting", () => {
      setGameStarting(true);
    });
    s.on("achievement_unlocked", (data: { achievements: string[] }) => {
      setNewAchievements(data.achievements ?? []);
    });
    s.on("power_up_activated", (data: { type: string; activatedBy: string }) => {
      setLastPowerUpActivation(data);
    });
    setSocket(s);
    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("room_state");
      s.off("game_over");
      s.off("next_round");
      s.off("timer_tick");
      s.off("answer_result");
      s.off("game_starting");
      s.off("achievement_unlocked");
      s.off("power_up_activated");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      s.disconnect();
    };
  }, []);

  const clearConnectError = useCallback(() => setConnectError(null), []);

  const leaveRoom = useCallback(() => {
    const id = roomIdRef.current;
    if (id && socket) {
      socket.emit("leave_room", id);
    }
    roomIdRef.current = null;
    setRoomState(null);
    setLastAnswerResult(null);
    setGameStarting(false);
  }, [socket]);

  const createRoom = useCallback(
    (
      groupCodeOrCb?: string | ((data: CreateRoomData) => void),
      gameModeOrCb?: "casual" | "serious" | ((data: CreateRoomData) => void),
      cb?: (data: CreateRoomData) => void,
      extraOpts?: { subject?: Subject; topic?: Topic; grade?: Grade },
    ) => {
      let groupCode: string | undefined;
      let gameMode: "casual" | "serious" = "casual";
      let callback: ((data: CreateRoomData) => void) | undefined;
      if (typeof groupCodeOrCb === "function") {
        callback = groupCodeOrCb;
      } else if (typeof gameModeOrCb === "function") {
        groupCode = groupCodeOrCb?.trim() || undefined;
        callback = gameModeOrCb;
      } else {
        groupCode = typeof groupCodeOrCb === "string" ? groupCodeOrCb.trim() || undefined : undefined;
        gameMode = gameModeOrCb === "serious" ? "serious" : "casual";
        callback = cb;
      }
      if (!socket) {
        callback?.({ roomId: "", error: "Not connected" });
        return;
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callback?.({ roomId: "", error: "Connection timed out" });
      }, SOCKET_TIMEOUT_MS);
      socket.emit("create_room", { groupCode, gameMode, ...extraOpts }, (data: CreateRoomData) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        roomIdRef.current = data.roomId;
        callback?.(data);
      });
    },
    [socket],
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string, groupCodeOrUsernameOrCb?: string | ((data: { success: boolean; error?: string }) => void), usernameOrCb?: string | ((data: { success: boolean; error?: string }) => void), cb?: (data: { success: boolean; error?: string }) => void) => {
      roomIdRef.current = roomId.toUpperCase();
      let groupCode: string | undefined;
      let username: string | undefined;
      let callback: ((data: { success: boolean; error?: string }) => void) | undefined;
      if (typeof groupCodeOrUsernameOrCb === "function") {
        callback = groupCodeOrUsernameOrCb;
      } else if (typeof usernameOrCb === "function") {
        groupCode = typeof groupCodeOrUsernameOrCb === "string" ? groupCodeOrUsernameOrCb.trim() || undefined : undefined;
        callback = usernameOrCb;
      } else {
        groupCode = typeof groupCodeOrUsernameOrCb === "string" ? groupCodeOrUsernameOrCb.trim() || undefined : undefined;
        username = typeof usernameOrCb === "string" ? usernameOrCb.trim() || undefined : undefined;
        callback = cb;
      }
      socket?.emit("join_room", { roomId: roomId.toUpperCase(), playerName, groupCode, username }, callback);
    },
    [socket],
  );

  const startGame = useCallback(
    (subject?: Subject, topic?: Topic, grade?: Grade, gameMode?: "casual" | "serious") => {
      const id = roomIdRef.current;
      if (id) socket?.emit("start_game", { roomId: id, subject: subject ?? "Math", topic: topic ?? "Mixed", grade: grade ?? 4, gameMode: gameMode ?? "serious" });
    },
    [socket],
  );

  const submitAnswer = useCallback(
    (answer: number | string) => {
      const id = roomIdRef.current;
      setLastAnswerResult(null);
      if (id) socket?.emit("submit_answer", { roomId: id, answer });
    },
    [socket],
  );

  const sessionSummary = useCallback(() => {
    const id = roomIdRef.current;
    if (id) socket?.emit("session_summary", id);
  }, [socket]);

  const requestReplay = useCallback(() => {
    const id = roomIdRef.current;
    if (id) socket?.emit("replay", id);
  }, [socket]);

  const usePowerUp = useCallback(
    (type: PowerUpType) => {
      const id = roomIdRef.current;
      if (id) socket?.emit("use_power_up", { roomId: id, powerUp: type });
    },
    [socket],
  );

  const renamePlayer = useCallback(
    (newName: string) => {
      const id = roomIdRef.current;
      if (id) socket?.emit("rename_player", { roomId: id, newName });
    },
    [socket],
  );

  const setRoomId = useCallback((id: string | null) => {
    roomIdRef.current = id;
  }, []);

  return {
    socket,
    connected,
    connectError,
    clearConnectError,
    playerId,
    roomState,
    setRoomState,
    lastAnswerResult,
    setLastAnswerResult,
    gameStarting,
    newAchievements,
    lastPowerUpActivation,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    sessionSummary,
    requestReplay,
    setRoomId,
    usePowerUp,
    renamePlayer,
  };
}
