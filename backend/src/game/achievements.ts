import type { GameRoom, SessionBadges } from "../types";
import { SUBJECTS } from "../types";
import {
  ACH_SPEED_LEARNER_STREAK,
  ACH_STREAK_LEGEND_STREAK,
  ACH_TEAM_SPIRIT_MIN_PLAYERS,
  ACH_BADGE_COLLECTOR_MIN_BADGES,
  ACH_QUIZ_EXPLORER_MIN_SUBJECTS,
  ACH_PRACTICE_PERFECT_GAMES,
  ACH_DEDICATED_LEARNER_GAMES,
  ACH_KNOWLEDGE_SEEKER_MIN_LEVEL,
  ACH_SUBJECT_MASTER_MIN_LEVEL,
  ACH_HELPING_HAND_PRO_COUNT,
} from "../config/constants";

export type AchievementId =
  | "speed_learner"
  | "quiz_explorer"
  | "practice_makes_perfect"
  | "knowledge_seeker"
  | "subject_master"
  | "team_spirit"
  | "helping_hand_pro"
  | "perfect_session"
  | "streak_legend"
  | "comeback_champion"
  | "badge_collector"
  | "first_steps"
  | "dedicated_learner"
  | "all_rounder";

/** Check achievements from a single session. */
export function checkSessionAchievements(
  room: GameRoom,
  badges: SessionBadges,
): AchievementId[] {
  const earned: AchievementId[] = [];
  const humanPlayers = room.players.filter((p) => !p.isBot);
  const teamAccuracy = room.problemHistory.length > 0
    ? Math.round((room.problemsSolved / room.problemHistory.length) * 100)
    : 0;

  if ((room.bestTeamStreak ?? 0) >= ACH_SPEED_LEARNER_STREAK) earned.push("speed_learner");

  if (teamAccuracy === 100 && room.problemHistory.length > 0) earned.push("perfect_session");

  if ((room.bestTeamStreak ?? 0) >= ACH_STREAK_LEGEND_STREAK) earned.push("streak_legend");

  if (badges.comebackTeam) earned.push("comeback_champion");

  if (humanPlayers.length >= ACH_TEAM_SPIRIT_MIN_PLAYERS) earned.push("team_spirit");

  const badgeCount = Object.values(badges).filter(Boolean).length;
  if (badgeCount >= ACH_BADGE_COLLECTOR_MIN_BADGES) earned.push("badge_collector");

  // First Steps: always from session (store checks if already earned)
  earned.push("first_steps");

  return earned;
}

export interface PersistentProgressForAchievements {
  gamesPlayed: number;
  subjects: Record<string, number>;
  subjectsPlayed: Record<string, number>;
  totalHelpedCount: number;
  achievements: string[];
}

/** Check persistent (cross-game) achievements. */
export function checkPersistentAchievements(
  progress: PersistentProgressForAchievements,
): AchievementId[] {
  const earned: AchievementId[] = [];

  if (Object.keys(progress.subjectsPlayed).length >= ACH_QUIZ_EXPLORER_MIN_SUBJECTS) earned.push("quiz_explorer");
  if (progress.gamesPlayed >= ACH_PRACTICE_PERFECT_GAMES) earned.push("practice_makes_perfect");
  if (progress.gamesPlayed >= ACH_DEDICATED_LEARNER_GAMES) earned.push("dedicated_learner");
  if (Object.values(progress.subjects).some((lvl) => lvl >= ACH_KNOWLEDGE_SEEKER_MIN_LEVEL)) earned.push("knowledge_seeker");
  if (Object.values(progress.subjects).some((lvl) => lvl >= ACH_SUBJECT_MASTER_MIN_LEVEL)) earned.push("subject_master");
  if (progress.totalHelpedCount >= ACH_HELPING_HAND_PRO_COUNT) earned.push("helping_hand_pro");

  if (SUBJECTS.every((s) => (progress.subjectsPlayed[s] ?? 0) > 0)) earned.push("all_rounder");

  return earned;
}
