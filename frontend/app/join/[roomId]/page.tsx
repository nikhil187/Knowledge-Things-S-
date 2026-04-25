"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JoinByLink() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string | undefined;

  useEffect(() => {
    if (roomId) {
      router.replace(`/?tab=join&code=${roomId.toUpperCase().replace(/[^A-Z0-9]/g, "")}`);
    } else {
      router.replace("/?tab=join");
    }
  }, [roomId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500 text-lg">Joining game…</p>
    </div>
  );
}
