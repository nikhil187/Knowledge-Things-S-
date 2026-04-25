import * as fs from "fs";
import * as path from "path";
import * as lockfile from "proper-lockfile";
import { SUBJECTS } from "../types";
import { checkPersistentAchievements } from "../game/achievements";
import { MAX_SUBJECT_LEVEL, PASS_STARS } from "../config/constants";

export const DATA_DIR = path.join(process.cwd(), "data");
export const USERS_FILE = path.join(DATA_DIR, "users.json");

export type SubjectKey = (typeof SUBJECTS)[number];

export interface UserProgress {
  username: string;
  gamesPlayed: number;
  subjects: Record<string, number>;
}

export interface UserProfile extends UserProgress {
  overallLevel: number;
  achievements: string[];
  avatar?: string;
  avatarFrame?: string;
  nickname?: string;
  deviceToken?: string;
  subjectsPlayed?: Record<string, number>;
}

export interface UserRecord {
  gamesPlayed: number;
  subjects: Record<string, number>;
  subjectsPlayed?: Record<string, number>;
  achievements?: string[];
  totalHelpedCount?: number;
  avatar?: string;
  avatarFrame?: string;
  deviceToken?: string;
  pinHash?: string;
  nickname?: string;
}

export interface UsersData {
  users: Record<string, UserRecord>;
}

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function normalizeUsername(username: string): string {
  return username.trim().slice(0, 32) || "guest";
}

export function read(): UsersData {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return { users: {} };
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const data = JSON.parse(raw) as UsersData & { users?: Record<string, { totalStars?: number; gamesPlayed?: number }> };
    const users: Record<string, UserRecord> = {};
    for (const [key, u] of Object.entries(data.users || {})) {
      const rec = u as UserRecord & { totalStars?: number; subjects?: Record<string, number> };
      users[key] = {
        gamesPlayed: rec.gamesPlayed ?? 0,
        subjects: rec.subjects && typeof rec.subjects === "object" ? rec.subjects : {},
        subjectsPlayed: rec.subjectsPlayed ?? {},
        achievements: rec.achievements ?? [],
        totalHelpedCount: rec.totalHelpedCount ?? 0,
        avatar: rec.avatar,
        avatarFrame: rec.avatarFrame,
        deviceToken: rec.deviceToken,
        pinHash: rec.pinHash,
        nickname: rec.nickname,
      };
    }
    return { users };
  } catch {
    return { users: {} };
  }
}

export function write(data: UsersData): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getSubjectLevel(subjects: Record<string, number>, subject: string): number {
  const n = subjects[subject];
  if (typeof n === "number" && n >= 1 && n <= MAX_SUBJECT_LEVEL) return n;
  return 1;
}

export function getSubjectLevelForUser(username: string, subject: string): number {
  const key = normalizeUsername(username);
  if (key === "guest") return 1;
  const data = read();
  const u = data.users[key];
  if (!u) return 1;
  return getSubjectLevel(u.subjects, subject);
}

export function getProfile(username: string): UserProfile | null {
  const key = normalizeUsername(username);
  if (key === "guest") return null;
  const data = read();
  const u = data.users[key];
  if (!u) {
    return {
      username: key,
      gamesPlayed: 0,
      subjects: Object.fromEntries(SUBJECTS.map((s) => [s, 1])),
      overallLevel: 1,
      achievements: [],
    };
  }
  const subjects: Record<string, number> = {};
  let maxLevel = 1;
  for (const s of SUBJECTS) {
    const lvl = getSubjectLevel(u.subjects, s);
    subjects[s] = lvl;
    if (lvl > maxLevel) maxLevel = lvl;
  }
  return {
    username: key,
    gamesPlayed: u.gamesPlayed ?? 0,
    subjects,
    overallLevel: maxLevel,
    achievements: u.achievements ?? [],
    avatar: u.avatar,
    avatarFrame: u.avatarFrame,
    nickname: u.nickname,
    deviceToken: u.deviceToken,
    subjectsPlayed: u.subjectsPlayed ?? {},
  };
}

export function addGameResult(
  username: string,
  subject: string,
  teamStars: number,
  helpedCount: number = 0,
): { profile: UserProfile | null; newAchievements: string[] } {
  const key = normalizeUsername(username);
  if (key === "guest") return { profile: null, newAchievements: [] };
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2), "utf-8");
  }
  const release = lockfile.lockSync(USERS_FILE, { realpath: false });
  try {
    const data = read();
    const current = data.users[key] ?? {
      gamesPlayed: 0,
      subjects: {},
      subjectsPlayed: {},
      achievements: [],
      totalHelpedCount: 0,
    };
    const currentLevel = getSubjectLevel(current.subjects, subject);
    let nextLevel = currentLevel;
    if (teamStars >= PASS_STARS && currentLevel < MAX_SUBJECT_LEVEL) {
      nextLevel = currentLevel + 1;
    }
    const subjects = { ...current.subjects, [subject]: nextLevel };
    const subjectsPlayed = { ...(current.subjectsPlayed ?? {}) };
    subjectsPlayed[subject] = (subjectsPlayed[subject] ?? 0) + 1;
    const totalHelpedCount = (current.totalHelpedCount ?? 0) + helpedCount;
    const existingAchievements = new Set(current.achievements ?? []);

    data.users[key] = {
      gamesPlayed: (current.gamesPlayed ?? 0) + 1,
      subjects,
      subjectsPlayed,
      achievements: [...existingAchievements],
      totalHelpedCount,
      avatar: current.avatar,
      avatarFrame: current.avatarFrame,
      deviceToken: current.deviceToken,
      pinHash: current.pinHash,
      nickname: current.nickname,
    };

    const persistentNew = checkPersistentAchievements({
      gamesPlayed: data.users[key]!.gamesPlayed,
      subjects,
      subjectsPlayed,
      totalHelpedCount,
      achievements: [...existingAchievements],
    });
    const newAchievements: string[] = [];
    for (const a of persistentNew) {
      if (!existingAchievements.has(a)) {
        existingAchievements.add(a);
        newAchievements.push(a);
      }
    }
    data.users[key]!.achievements = [...existingAchievements];

    write(data);
    return { profile: getProfile(key), newAchievements };
  } finally {
    release();
  }
}

export function mergeSessionAchievements(username: string, sessionAchievements: string[]): string[] {
  const key = normalizeUsername(username);
  if (key === "guest") return [];
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  const release = lockfile.lockSync(USERS_FILE, { realpath: false });
  try {
    const data = read();
    const current = data.users[key];
    if (!current) return [];
    const existing = new Set(current.achievements ?? []);
    const newOnes: string[] = [];
    for (const a of sessionAchievements) {
      if (!existing.has(a)) {
        existing.add(a);
        newOnes.push(a);
      }
    }
    if (newOnes.length > 0) {
      current.achievements = [...existing];
      write(data);
    }
    return newOnes;
  } finally {
    release();
  }
}

export function setAvatar(username: string, avatar: string, frame?: string): UserProfile | null {
  const key = normalizeUsername(username);
  if (key === "guest") return null;
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2), "utf-8");
  }
  const release = lockfile.lockSync(USERS_FILE, { realpath: false });
  try {
    const data = read();
    const current = data.users[key] ?? {
      gamesPlayed: 0,
      subjects: {},
      subjectsPlayed: {},
      achievements: [],
      totalHelpedCount: 0,
    };
    current.avatar = avatar;
    if (frame !== undefined) current.avatarFrame = frame;
    data.users[key] = current;
    write(data);
    return getProfile(key);
  } finally {
    release();
  }
}
