"use client";

import { DEFAULT_AVATAR } from "@/utils/avatars";

interface PlayerAvatarProps {
  emoji?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  glow?: boolean;
}

const SIZES = {
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-xl",
  lg: "w-14 h-14 text-3xl",
};

export default function PlayerAvatar({ emoji, size = "md", className = "", glow }: PlayerAvatarProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full flex-shrink-0 ${SIZES[size]} ${className}`}
      style={{
        background: "linear-gradient(135deg, #e0e7ff, #f5f3ff, #fce7f3)",
        border: "2px solid rgba(124, 58, 237, 0.15)",
        boxShadow: glow
          ? "0 0 12px rgba(124, 58, 237, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)"
          : "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {emoji || DEFAULT_AVATAR}
    </div>
  );
}
