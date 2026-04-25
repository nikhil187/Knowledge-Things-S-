import * as fs from "fs";
import * as crypto from "crypto";
import * as lockfile from "proper-lockfile";
import type { UserProfile } from "./profileStore";
import { read, write, ensureDataDir, USERS_FILE, getProfile } from "./profileStore";
import {
  MAX_NICKNAME_LENGTH,
  PIN_LENGTH,
  DEVICE_TOKEN_MIN_LENGTH,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MS,
} from "../config/constants";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin.trim().toUpperCase()).digest("hex");
}

function devicePrefix(deviceToken: string): string {
  return deviceToken.replace(/-/g, "").slice(0, 16);
}

function isValidDeviceToken(token: unknown): token is string {
  return typeof token === "string" && token.replace(/-/g, "").length >= DEVICE_TOKEN_MIN_LENGTH;
}

// ─── Brute-force lockout (in-memory, resets on server restart) ────────────────

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkLockout(key: string): string | null {
  const entry = failedAttempts.get(key);
  if (!entry) return null;
  if (Date.now() < entry.lockedUntil) {
    const mins = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    failedAttempts.delete(key);
  }
  return null;
}

function recordFailedAttempt(key: string): void {
  const entry = failedAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  failedAttempts.set(key, entry);
}

function clearFailedAttempts(key: string): void {
  failedAttempts.delete(key);
}

// ─── Nickname uniqueness ──────────────────────────────────────────────────────

function isNicknameTaken(nickname: string): boolean {
  const lower = nickname.trim().toLowerCase();
  if (!lower) return false;
  const data = read();
  for (const record of Object.values(data.users)) {
    if (record.nickname && record.nickname.toLowerCase() === lower) return true;
  }
  return false;
}

// ─── Public auth functions ────────────────────────────────────────────────────

export function createProfile(
  deviceToken: string,
  nickname: string,
  pin?: string,
): { profile: UserProfile | null; error?: string } {
  if (!isValidDeviceToken(deviceToken)) {
    return { profile: null, error: "Invalid device token" };
  }
  if (typeof nickname !== "string") {
    return { profile: null, error: "Nickname is required" };
  }
  const trimmedNick = nickname.trim().slice(0, MAX_NICKNAME_LENGTH);
  if (trimmedNick.length === 0) {
    return { profile: null, error: "Nickname is required" };
  }
  if (pin !== undefined && pin !== null) {
    const pinStr = String(pin).trim().toUpperCase();
    if (!new RegExp(`^[A-Z0-9]{${PIN_LENGTH}}$`).test(pinStr)) {
      return { profile: null, error: `PIN must be exactly ${PIN_LENGTH} alphanumeric characters` };
    }
  }

  if (isNicknameTaken(trimmedNick)) {
    return { profile: null, error: "This nickname is already taken. Try another one!" };
  }

  const prefix = devicePrefix(deviceToken);
  const storageKey = `${prefix}:${trimmedNick}`;

  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2), "utf-8");
  }
  const release = lockfile.lockSync(USERS_FILE, { realpath: false });
  try {
    const data = read();
    if (data.users[storageKey]) {
      return { profile: null, error: "This nickname is already taken. Try another one!" };
    }
    data.users[storageKey] = {
      gamesPlayed: 0,
      subjects: {},
      subjectsPlayed: {},
      achievements: [],
      totalHelpedCount: 0,
      deviceToken: prefix,
      nickname: trimmedNick,
      ...(pin != null ? { pinHash: hashPin(String(pin)) } : {}),
    };
    write(data);
    return { profile: getProfile(storageKey) };
  } finally {
    release();
  }
}

export function authenticateProfile(
  deviceToken: string,
  pin: string,
): { profile: UserProfile | null; error?: string } {
  if (!isValidDeviceToken(deviceToken)) {
    return { profile: null, error: "Invalid device token" };
  }
  if (typeof pin !== "string" || pin.trim().length === 0) {
    return { profile: null, error: "PIN is required" };
  }

  const prefix = devicePrefix(deviceToken);
  const data = read();
  const incoming = hashPin(pin);

  for (const [key, record] of Object.entries(data.users)) {
    if (record.deviceToken === prefix && record.pinHash) {
      if (record.pinHash === incoming) {
        return { profile: getProfile(key) };
      }
    }
  }

  return { profile: null, error: "Invalid PIN" };
}

export function getDeviceProfiles(deviceToken: string): UserProfile[] {
  if (!isValidDeviceToken(deviceToken)) return [];

  const prefix = devicePrefix(deviceToken);
  const data = read();
  const profiles: UserProfile[] = [];

  for (const [key, record] of Object.entries(data.users)) {
    if (record.deviceToken === prefix) {
      const profile = getProfile(key);
      if (profile) profiles.push(profile);
    }
  }

  return profiles;
}

export function loginByNickname(
  nickname: string,
  pin: string,
  newDeviceToken?: string,
): { profile: UserProfile | null; error?: string } {
  const trimmedNick = (nickname ?? "").trim();
  if (!trimmedNick) {
    return { profile: null, error: "Nickname is required" };
  }
  if (typeof pin !== "string" || pin.trim().length === 0) {
    return { profile: null, error: "Secret code is required" };
  }

  const lockoutKey = `login:${trimmedNick.toLowerCase()}`;
  const lockoutMsg = checkLockout(lockoutKey);
  if (lockoutMsg) {
    return { profile: null, error: lockoutMsg };
  }

  const incoming = hashPin(pin);
  const data = read();
  const lowerNick = trimmedNick.toLowerCase();

  for (const [key, record] of Object.entries(data.users)) {
    if (record.nickname && record.nickname.toLowerCase() === lowerNick && record.pinHash) {
      if (record.pinHash === incoming) {
        clearFailedAttempts(lockoutKey);

        if (isValidDeviceToken(newDeviceToken)) {
          const newPrefix = devicePrefix(newDeviceToken);
          if (record.deviceToken !== newPrefix) {
            const newKey = `${newPrefix}:${record.nickname}`;
            if (!data.users[newKey]) {
              ensureDataDir();
              if (!fs.existsSync(USERS_FILE)) {
                fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2), "utf-8");
              }
              const release = lockfile.lockSync(USERS_FILE, { realpath: false });
              try {
                const freshData = read();
                const original = freshData.users[key];
                if (original) {
                  freshData.users[newKey] = { ...original, deviceToken: newPrefix };
                  write(freshData);
                }
              } finally {
                release();
              }
              return { profile: getProfile(newKey) };
            }
          }
        }

        return { profile: getProfile(key) };
      }
    }
  }

  recordFailedAttempt(lockoutKey);
  const entry = failedAttempts.get(lockoutKey);
  const remaining = MAX_FAILED_ATTEMPTS - (entry?.count ?? 0);
  const lockoutMins = Math.round(LOCKOUT_MS / 60000);
  if (remaining <= 0) {
    return { profile: null, error: `Too many failed attempts. Account locked for ${lockoutMins} minutes.` };
  }
  return { profile: null, error: `Wrong nickname or secret code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` };
}
