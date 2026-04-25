import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerSocketHandlers } from "./socket/handlers";
import { MAX_USERNAME_LENGTH, MAX_NICKNAME_LENGTH, PIN_LENGTH, DEVICE_TOKEN_MIN_LENGTH } from "./config/constants";
import { originCheckMiddleware } from "./socket/middleware";
import { createRoom, roomExists } from "./routes/rooms";
import { getProfile, setAvatar } from "./store/profileStore";
import { createProfile, authenticateProfile, getDeviceProfiles, loginByNickname } from "./store/authStore";

// Env validation (fail fast in production)
const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";
if (isProd && !process.env.DEEPSEEK_API_KEY) {
  console.warn("[Config] WARNING: DEEPSEEK_API_KEY not set — AI questions will use local fallback only");
}

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false })); // CSP can block inline scripts; disable if needed

// CORS: restrict origins in production. Set CORS_ORIGINS to your frontend URL(s) in production.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : true;
if (isProd && corsOrigins === true) {
  throw new Error("[Config] FATAL: CORS_ORIGINS must be set in production");
}
app.use(cors({ origin: corsOrigins }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests" },
});
app.use(limiter);

// Stricter rate limiter for user profile endpoints
const profileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests" },
});

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigins },
  maxHttpBufferSize: 1e5, // 100KB message size limit
});

io.use(originCheckMiddleware);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/api/room", createRoom);
app.get("/api/room/:code", roomExists);
app.get("/api/user/:username", profileLimiter, (req, res) => {
  try {
    const username = (req.params.username ?? "").trim().slice(0, MAX_USERNAME_LENGTH);
    if (!username) return res.status(400).json({ error: "Username required" });
    const profile = getProfile(username);
    if (!profile) return res.status(404).json({ error: "User not found" });
    res.json(profile);
  } catch (err) {
    console.error("[API] /api/user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Avatar endpoint
const ALLOWED_AVATARS = ["🦊","🐧","🦁","🐻","🐱","🐶","🦄","🐸","🦋","🐝","🦉","🐼"];
app.put("/api/user/:username/avatar", profileLimiter, (req, res) => {
  try {
    const username = (req.params.username ?? "").trim().slice(0, MAX_USERNAME_LENGTH);
    if (!username) return res.status(400).json({ error: "Username required" });
    const { avatar, frame } = req.body ?? {};
    if (!avatar || !ALLOWED_AVATARS.includes(avatar)) {
      return res.status(400).json({ error: "Invalid avatar" });
    }
    const profile = setAvatar(username, avatar, frame);
    if (!profile) return res.status(404).json({ error: "User not found" });
    res.json(profile);
  } catch (err) {
    console.error("[API] /api/user/:username/avatar error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Tier 2: Device-linked profile endpoints ---

// POST /api/profile — Create a new profile
app.post("/api/profile", profileLimiter, (req, res) => {
  try {
    const { deviceToken, nickname, pin } = req.body ?? {};
    if (typeof deviceToken !== "string" || deviceToken.replace(/-/g, "").length < DEVICE_TOKEN_MIN_LENGTH) {
      return res.status(400).json({ error: "Invalid device token" });
    }
    if (typeof nickname !== "string" || nickname.trim().length === 0 || nickname.trim().length > MAX_NICKNAME_LENGTH) {
      return res.status(400).json({ error: `Nickname must be 1-${MAX_NICKNAME_LENGTH} characters` });
    }
    if (pin !== undefined && pin !== null) {
      const pinStr = String(pin).trim().toUpperCase();
      if (!new RegExp(`^[A-Z0-9]{${PIN_LENGTH}}$`).test(pinStr)) {
        return res.status(400).json({ error: `PIN must be exactly ${PIN_LENGTH} alphanumeric characters` });
      }
    }
    const result = createProfile(deviceToken, nickname, pin ?? undefined);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    // Strip pinHash from response (getProfile never returns it, but be safe)
    const profile = result.profile;
    res.status(201).json({ profile });
  } catch (err) {
    console.error("[API] POST /api/profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/auth — Verify PIN
app.post("/api/profile/auth", profileLimiter, (req, res) => {
  try {
    const { deviceToken, pin } = req.body ?? {};
    if (typeof deviceToken !== "string" || deviceToken.replace(/-/g, "").length < DEVICE_TOKEN_MIN_LENGTH) {
      return res.status(400).json({ error: "Invalid device token" });
    }
    if (typeof pin !== "string" || pin.trim().length === 0) {
      return res.status(400).json({ error: "PIN is required" });
    }
    const result = authenticateProfile(deviceToken, pin);
    if (result.error) {
      return res.status(401).json({ error: result.error });
    }
    res.json({ profile: result.profile });
  } catch (err) {
    console.error("[API] POST /api/profile/auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile/login — Cross-device login by nickname + PIN
app.post("/api/profile/login", profileLimiter, (req, res) => {
  try {
    const { nickname, pin, deviceToken } = req.body ?? {};
    if (typeof nickname !== "string" || nickname.trim().length === 0) {
      return res.status(400).json({ error: "Nickname is required" });
    }
    if (typeof pin !== "string" || pin.trim().length === 0) {
      return res.status(400).json({ error: "Secret code is required" });
    }
    const result = loginByNickname(nickname, pin, deviceToken);
    if (result.error) {
      // Use 429 for lockout, 401 for wrong credentials
      const status = result.error.includes("Too many") ? 429 : 401;
      return res.status(status).json({ error: result.error });
    }
    res.json({ profile: result.profile });
  } catch (err) {
    console.error("[API] POST /api/profile/login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/device/:token — Get profiles for a device
app.get("/api/profile/device/:token", profileLimiter, (req, res) => {
  try {
    const token = req.params.token;
    if (typeof token !== "string" || token.replace(/-/g, "").length < DEVICE_TOKEN_MIN_LENGTH) {
      return res.status(400).json({ error: "Invalid device token" });
    }
    const profiles = getDeviceProfiles(token);
    res.json({ profiles });
  } catch (err) {
    console.error("[API] GET /api/profile/device error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Express] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

registerSocketHandlers(io);

const PORT = process.env.PORT ?? 3001;
const server = httpServer.listen(PORT, () => {
  console.log(`Knowledge Things backend running on port ${PORT} (${NODE_ENV})`);
  if (process.env.DEEPSEEK_API_KEY) {
    console.log("[DeepSeek] API key loaded");
  } else {
    console.warn("[DeepSeek] No API key — using local fallback questions only");
  }
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[${signal}] Shutting down...`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
