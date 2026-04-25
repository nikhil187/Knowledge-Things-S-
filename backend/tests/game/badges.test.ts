import { computeSessionBadges } from "../../src/game/badges";
import type { GameRoom, MathProblem } from "../../src/types";

const stubProblem: MathProblem = { id: "p1", question: "?", correctAnswer: 1, difficulty: 1, type: "add" };

function mockRoom(overrides: Partial<GameRoom>): GameRoom {
  return {
    roomId: "R1",
    players: [],
    currentLevel: 1,
    teamScore: 0,
    teamStars: 0,
    hintsUsed: 0,
    gameMode: "casual",
    currentProblem: null,
    currentQuestions: Array(10).fill(null),
    currentQuestionIndex: 9,
    subject: "Math",
    topic: "Mixed",
    grade: 4,
    consecutiveCorrect: 0,
    consecutiveFailed: 0,
    status: "session_summary",
    problemsSolved: 0,
    sessionStartTime: Date.now(),
    problemHistory: [],
    teamStreak: 0,
    bestTeamStreak: 0,
    teamComboLevel: 0,
    powerUps: { team_shield: { available: false, used: false }, time_boost: { available: false, used: false }, bonus_round: { available: true, used: false } },
    activeEffects: {},
    usedQuestionHashes: [],
    ...overrides,
  };
}

describe("computeSessionBadges", () => {
  it("awards Star Team when teamStars >= 5", () => {
    const room = mockRoom({ teamStars: 5, problemHistory: Array(10).fill({ problem: {} as never, correct: true }) });
    const b = computeSessionBadges(room);
    expect(b.starTeam).toBe(true);
  });

  it("does not award Star Team when teamStars < 5", () => {
    const room = mockRoom({ teamStars: 3 });
    const b = computeSessionBadges(room);
    expect(b.starTeam).toBe(false);
  });

  it("awards Helping Hand when hintsUsed > 0 and accuracy >= 50%", () => {
    const history = [
      ...Array(5).fill(null).map(() => ({ problem: stubProblem, correct: true })),
      ...Array(5).fill(null).map(() => ({ problem: stubProblem, correct: false })),
    ];
    const room = mockRoom({ hintsUsed: 2, problemsSolved: 5, problemHistory: history });
    const b = computeSessionBadges(room);
    expect(b.helpingHand).toBe(true);
  });

  it("awards Full House when all questions solved", () => {
    const room = mockRoom({ problemsSolved: 10, currentQuestions: Array(10).fill({}) });
    const b = computeSessionBadges(room);
    expect(b.fullHouse).toBe(true);
  });
});
