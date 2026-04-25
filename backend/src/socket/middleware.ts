import type { Socket } from "socket.io";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

/** Allowed origins in production (comma-separated). Empty = reject all. */
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean)
  : [];

/**
 * Connection middleware: reject connections from disallowed origins in production.
 * Call before registerSocketHandlers.
 */
export function originCheckMiddleware(socket: Socket, next: (err?: Error) => void): void {
  if (!isProd) {
    next();
    return;
  }
  if (ALLOWED_ORIGINS.length === 0) {
    next(new Error("CORS_ORIGINS not configured for production"));
    return;
  }
  const origin = (socket.handshake.headers.origin ?? socket.handshake.headers.referer ?? "").toLowerCase();
  const allowed = origin !== "" && ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o.replace(/\/$/, "") + "/"));
  if (allowed) {
    next();
    return;
  }
  next(new Error("Origin not allowed"));
}

// ─── Per-socket rate limiting ───────────────────────────────────────────────

const WINDOW_MS = 60 * 1000; // 1 minute
const LIMITS: Record<string, number> = {
  create_room: 5,
  join_room: 20,
  start_game: 10,
};

interface Window {
  count: number;
  resetAt: number;
}

const socketWindows = new Map<string, Map<string, Window>>();

function getWindow(socketId: string, event: string): Window {
  let perSocket = socketWindows.get(socketId);
  if (!perSocket) {
    perSocket = new Map();
    socketWindows.set(socketId, perSocket);
  }
  let w = perSocket.get(event);
  const now = Date.now();
  if (!w || now >= w.resetAt) {
    w = { count: 0, resetAt: now + WINDOW_MS };
    perSocket.set(event, w);
  }
  return w;
}

/** Clean up when socket disconnects to avoid memory leak. */
export function clearSocketRateLimit(socketId: string): void {
  socketWindows.delete(socketId);
}

/**
 * Check if socket has exceeded rate limit for event. Returns true if allowed, false if rate limited.
 * Call at the start of create_room, join_room, start_game handlers.
 */
export function checkRateLimit(socketId: string, event: string): boolean {
  const limit = LIMITS[event] ?? 30;
  const w = getWindow(socketId, event);
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}
