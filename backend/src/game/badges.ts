import type { GameRoom, SessionBadges } from "../types";
import {
  BADGE_STAR_TEAM_STARS,
  BADGE_TEAM_ON_FIRE_STREAK,
  BADGE_PERFECT_TEAM_CONTRIBUTION,
  BADGE_HELPING_HEROES_COUNT,
  BADGE_FULL_HOUSE_FALLBACK_COUNT,
} from "../config/constants";

export type { SessionBadges };

export function computeSessionBadges(room: GameRoom): SessionBadges {
  const teamAccuracy = room.problemHistory.length > 0
    ? Math.round((room.problemsSolved / room.problemHistory.length) * 100)
    : 0;

  const humanPlayers = room.players.filter((p) => !p.isBot);
  const totalHelpedCount = humanPlayers.reduce((sum, p) => sum + (p.helpedCount ?? 0), 0);

  // Comeback: team failed 2+ in a row at some point, then passed 3+ in a row
  let hasComeback = false;
  let failRun = 0;
  let hadDoubleFailure = false;
  let passRunAfterFailure = 0;
  for (const entry of room.problemHistory) {
    if (!entry.correct) {
      failRun++;
      passRunAfterFailure = 0;
      if (failRun >= 2) hadDoubleFailure = true;
    } else {
      failRun = 0;
      if (hadDoubleFailure) passRunAfterFailure++;
      if (passRunAfterFailure >= 3) { hasComeback = true; break; }
    }
  }

  return {
    starTeam: room.teamStars >= BADGE_STAR_TEAM_STARS,
    helpingHand: room.hintsUsed > 0 && teamAccuracy >= 50,
    fullHouse: room.problemsSolved === (room.currentQuestions.length || BADGE_FULL_HOUSE_FALLBACK_COUNT),
    teamOnFire: (room.bestTeamStreak ?? 0) >= BADGE_TEAM_ON_FIRE_STREAK,
    perfectTeam: humanPlayers.length > 0 && humanPlayers.every((p) => (p.contributionCount ?? 0) >= BADGE_PERFECT_TEAM_CONTRIBUTION),
    everyoneContributed: humanPlayers.length > 0 && humanPlayers.every((p) => (p.contributionCount ?? 0) > 0),
    comebackTeam: hasComeback,
    helpingHeroes: totalHelpedCount >= BADGE_HELPING_HEROES_COUNT,
  };
}
