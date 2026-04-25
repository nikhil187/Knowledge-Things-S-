import type { Request, Response } from "express";
import { getRooms, createAndStoreRoom } from "../socket/handlers";
import type { Subject, Topic, Grade } from "../types";

const ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/i;

/** POST /api/room — Create a new room. */
export function createRoom(req: Request, res: Response): void {
  try {
    const body = (req.body ?? {}) as {
      subject?: Subject;
      topic?: Topic;
      grade?: Grade;
      groupCode?: string;
      gameMode?: "casual" | "serious";
    };
    const { roomId } = createAndStoreRoom({
      subject: body.subject,
      topic: body.topic,
      grade: body.grade,
      groupCode: body.groupCode,
      gameMode: body.gameMode,
    });
    res.status(201).json({ roomId, code: roomId });
  } catch (err) {
    console.error("[API] POST /api/room error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** GET /api/room/:code — Check if room exists. */
export function roomExists(req: Request, res: Response): void {
  const code = (req.params.code ?? "").trim().toUpperCase();
  if (!code || !ROOM_CODE_REGEX.test(code)) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }
  const rooms = getRooms();
  const room = rooms.get(code);
  const playerCount = room?.players.length ?? 0;
  const canStart = playerCount >= 1 && playerCount <= 4;
  res.json({ exists: !!room, playerCount, canStart });
}
