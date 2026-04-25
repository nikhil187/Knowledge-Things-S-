export const AVATARS = ["🦊", "🐧", "🦁", "🐻", "🐱", "🐶", "🦄", "🐸", "🦋", "🐝", "🦉", "🐼"] as const;
export type AvatarEmoji = (typeof AVATARS)[number];
export const DEFAULT_AVATAR = "🦊";

export interface AvatarFrame {
  id: string;
  label: string;
  borderClass: string;
  requiredAchievement?: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: "default", label: "Default", borderClass: "ring-2 ring-slate-200" },
  { id: "gold", label: "Gold", borderClass: "ring-4 ring-amber-400", requiredAchievement: "subject_master" },
  { id: "fire", label: "Fire", borderClass: "ring-4 ring-orange-400", requiredAchievement: "streak_legend" },
  { id: "diamond", label: "Diamond", borderClass: "ring-4 ring-blue-400", requiredAchievement: "perfect_session" },
  { id: "star", label: "Star", borderClass: "ring-4 ring-violet-400", requiredAchievement: "dedicated_learner" },
  { id: "rainbow", label: "Rainbow", borderClass: "ring-4 ring-pink-400", requiredAchievement: "all_rounder" },
];
