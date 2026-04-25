"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGame } from "@/app/context/GameContext";
import Replay from "@/components/Replay";

export default function ReplayPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { setRoomId } = useGame();

  useEffect(() => {
    setRoomId(roomId ?? null);
    return () => setRoomId(null);
  }, [roomId, setRoomId]);

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 -z-10" style={{ background: "var(--color-bg)" }} />
      <Replay />
    </main>
  );
}
