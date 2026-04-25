"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AVATARS, AVATAR_FRAMES, DEFAULT_AVATAR } from "@/utils/avatars";

interface AvatarPickerProps {
  currentAvatar?: string;
  currentFrame?: string;
  earnedAchievements: string[];
  onSave: (avatar: string, frame?: string) => void;
}

const frameUnlockLevels: Record<string, number> = {
  Gold: 2, Fire: 3, Diamond: 5, Star: 7, Rainbow: 10
};

export default function AvatarPicker({ currentAvatar, currentFrame, earnedAchievements, onSave }: AvatarPickerProps) {
  const [selected, setSelected] = useState(currentAvatar || DEFAULT_AVATAR);
  const [selectedFrame, setSelectedFrame] = useState(currentFrame || "default");
  const earnedSet = new Set(earnedAchievements);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-slate-100 text-4xl ${AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.borderClass ?? "ring-2 ring-slate-200"}`}>
          {selected}
        </div>
      </div>

      {/* Avatar grid */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Choose your avatar</p>
        <div className="grid grid-cols-6 gap-2 max-w-sm mx-auto">
          {AVATARS.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => setSelected(emoji)}
              whileTap={{ scale: 0.9 }}
              className={`w-full aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center border-2 transition-all max-w-[56px] mx-auto ${
                selected === emoji
                  ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Frame selection */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Avatar frame</p>
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {AVATAR_FRAMES.map((frame) => {
            const unlocked = !frame.requiredAchievement || earnedSet.has(frame.requiredAchievement);
            return (
              <div key={frame.id} className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && setSelectedFrame(frame.id)}
                  className={`w-full rounded-xl border-2 px-3 py-2 text-xs font-medium transition-all ${
                    selectedFrame === frame.id
                      ? "border-violet-400 bg-violet-50"
                      : unlocked
                        ? "border-slate-200 bg-white hover:bg-slate-50"
                        : "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className={`block w-6 h-6 rounded-full mx-auto mb-1 ${frame.borderClass} bg-slate-100`} />
                  {frame.label}
                  {!unlocked && <span className="block text-[10px] text-slate-400">🔒</span>}
                </button>
                {!unlocked && frameUnlockLevels[frame.label] !== undefined && (
                  <span className="text-[10px] text-gray-400">Unlock Lv.{frameUnlockLevels[frame.label]}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave(selected, selectedFrame)}
        className="btn-primary w-full text-white min-h-[44px]"
      >
        Save Avatar
      </button>
    </div>
  );
}
