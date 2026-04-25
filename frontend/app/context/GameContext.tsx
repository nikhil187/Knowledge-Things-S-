"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useSocket } from "@/hooks/useSocket";
import type { AnswerResult, Grade, PowerUpType, RoomState, Subject, Topic } from "@/utils/types";

const USERNAME_KEY = "knowledge_things_username";
const LAST_PLAYER_NAME_KEY = "knowledge_things_last_player_name";
const DEVICE_TOKEN_KEY = "knowledge_things_device_token";
const ACTIVE_PROFILE_KEY = "knowledge_things_active_profile";

function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

type GameContextValue = {
  roomId: string | null;
  playerName: string | null;
  playerId: string | null;
  deviceToken: string;
  username: string | null;
  setUsername: (name: string | null) => void;
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  socket: Socket | null;
  selectedSubject: Subject;
  selectedTopic: Topic;
  selectedGrade: Grade;
  setGameSetup: (subject: Subject, topic: Topic, grade: Grade) => void;
  setRoomId: (id: string | null) => void;
  setPlayerName: (name: string | null) => void;
  roomState: RoomState | null;
  connected: boolean;
  connectError: string | null;
  clearConnectError: () => void;
  lastAnswerResult: AnswerResult | null;
  gameStarting: boolean;
  createRoom: (groupCode?: string, gameModeOrCb?: "casual" | "serious" | ((data: { roomId: string; totalStars?: number; nextMilestone?: number }) => void), cb?: (data: { roomId: string; totalStars?: number; nextMilestone?: number }) => void, extraOpts?: { subject?: Subject; topic?: Topic; grade?: Grade }) => void;
  joinRoom: (roomId: string, playerName: string, groupCode?: string, cb?: (data: { success: boolean; error?: string }) => void) => void;
  leaveRoom: () => void;
  startGame: (subject?: Subject, topic?: Topic, grade?: Grade, gameMode?: "casual" | "serious") => void;
  submitAnswer: (answer: number | string) => void;
  sessionSummary: () => void;
  requestReplay: () => void;
  setRoomState: (s: RoomState | null) => void;
  usePowerUp: (type: PowerUpType) => void;
  renamePlayer: (newName: string) => void;
  newAchievements: string[];
  lastPowerUpActivation: { type: string; activatedBy: string } | null;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [roomId, setRoomIdState] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Math");
  const [selectedTopic, setSelectedTopic] = useState<Topic>("Mixed");
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDeviceToken(getOrCreateDeviceToken());
    const stored = localStorage.getItem(USERNAME_KEY);
    if (stored) setUsernameState(stored);
    const storedProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (storedProfile) setActiveProfileIdState(storedProfile);
  }, []);

  const setUsername = useCallback((name: string | null) => {
    setUsernameState(name);
    if (typeof window !== "undefined") {
      if (name) localStorage.setItem(USERNAME_KEY, name);
      else localStorage.removeItem(USERNAME_KEY);
    }
  }, []);

  const setActiveProfileId = useCallback((id: string | null) => {
    setActiveProfileIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
  }, []);

  const {
    socket,
    roomState,
    setRoomState,
    connected,
    connectError,
    clearConnectError,
    playerId,
    lastAnswerResult,
    gameStarting,
    createRoom: socketCreateRoom,
    joinRoom: socketJoinRoom,
    leaveRoom: socketLeaveRoom,
    startGame,
    submitAnswer,
    sessionSummary,
    requestReplay,
    setRoomId: setSocketRoomId,
    usePowerUp,
    renamePlayer,
    newAchievements,
    lastPowerUpActivation,
  } = useSocket();

  const leaveRoom = useCallback(() => {
    socketLeaveRoom();
    setRoomIdState(null);
  }, [socketLeaveRoom]);

  const setRoomId = useCallback(
    (id: string | null) => {
      setRoomIdState(id);
      setSocketRoomId(id);
    },
    [setSocketRoomId],
  );

  const createRoom = useCallback(
    (groupCode?: string, gameModeOrCb?: "casual" | "serious" | ((data: { roomId: string; totalStars?: number; nextMilestone?: number }) => void), cb?: (data: { roomId: string; totalStars?: number; nextMilestone?: number }) => void, extraOpts?: { subject?: Subject; topic?: Topic; grade?: Grade }) => {
      socketLeaveRoom();
      socketCreateRoom(groupCode, gameModeOrCb, cb, extraOpts);
    },
    [socketLeaveRoom, socketCreateRoom],
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string, groupCode?: string, cb?: (data: { success: boolean; error?: string }) => void) => {
      setPlayerNameState(playerName);
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_PLAYER_NAME_KEY, playerName);
      }
      socketJoinRoom(roomId, playerName, groupCode, deviceToken || username || undefined, cb);
    },
    [socketJoinRoom, username, deviceToken],
  );

  const setGameSetup = useCallback(
    (subject: Subject, topic: Topic, grade: Grade) => {
      setSelectedSubject(subject);
      setSelectedTopic(topic);
      setSelectedGrade(grade);
    },
    [],
  );

  const value = useMemo<GameContextValue>(() => ({
    roomId,
    playerName,
    playerId,
    deviceToken,
    username,
    setUsername,
    activeProfileId,
    setActiveProfileId,
    socket,
    selectedSubject,
    selectedTopic,
    selectedGrade,
    setGameSetup,
    setRoomId,
    setPlayerName: setPlayerNameState,
    roomState,
    connected,
    connectError,
    clearConnectError,
    lastAnswerResult,
    gameStarting,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    sessionSummary,
    requestReplay,
    setRoomState,
    usePowerUp,
    renamePlayer,
    newAchievements,
    lastPowerUpActivation,
  }), [
    roomId, playerName, playerId, deviceToken, username, setUsername, activeProfileId, setActiveProfileId, socket,
    selectedSubject, selectedTopic, selectedGrade, setGameSetup,
    setRoomId, roomState, connected, connectError, clearConnectError,
    lastAnswerResult, gameStarting, createRoom, joinRoom, leaveRoom,
    startGame, submitAnswer, sessionSummary, requestReplay, setRoomState,
    usePowerUp, renamePlayer, newAchievements, lastPowerUpActivation,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
