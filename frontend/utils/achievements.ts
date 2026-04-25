import type { AchievementId } from "./types";

export interface AchievementDef {
  id: AchievementId;
  label: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_steps", label: "First Steps", description: "Complete your first game", emoji: "👣" },
  { id: "speed_learner", label: "Speed Learner", description: "Team answers 3 questions all-correct in a row", emoji: "⚡" },
  { id: "perfect_session", label: "Perfect Session", description: "100% team accuracy in a game", emoji: "💯" },
  { id: "streak_legend", label: "Streak Legend", description: "Team streak of 5+ in a single game", emoji: "🔥" },
  { id: "comeback_champion", label: "Comeback Champion", description: "Come back from 2 failures to 3 wins", emoji: "💪" },
  { id: "team_spirit", label: "Team Spirit", description: "Play with 3 or more teammates", emoji: "🤝" },
  { id: "badge_collector", label: "Badge Collector", description: "Earn 5+ badges in a single game", emoji: "🏅" },
  { id: "quiz_explorer", label: "Quiz Explorer", description: "Play games in 3 different subjects", emoji: "🗺️" },
  { id: "practice_makes_perfect", label: "Practice Makes Perfect", description: "Play 5 games total", emoji: "📚" },
  { id: "dedicated_learner", label: "Dedicated Learner", description: "Play 10 games total", emoji: "🎓" },
  { id: "knowledge_seeker", label: "Knowledge Seeker", description: "Reach level 5 in any subject", emoji: "🔍" },
  { id: "subject_master", label: "Subject Master", description: "Reach level 10 in any subject", emoji: "👑" },
  { id: "helping_hand_pro", label: "Helping Hand Pro", description: "Be the clutch player 5+ times total", emoji: "🦸" },
  { id: "all_rounder", label: "All-Rounder", description: "Play in all 6 subjects", emoji: "🌈" },
];
