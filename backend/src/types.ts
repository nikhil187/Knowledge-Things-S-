export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Subject =
  | "Math"
  | "Science"
  | "English"
  | "History"
  | "Geography"
  | "General Knowledge";

export const SUBJECTS: readonly Subject[] = [
  "Math", "Science", "English", "History", "Geography", "General Knowledge",
];

export type Grade = 3 | 4 | 5;

export type Topic = string;

export type RoomStatus =
  | "waiting"
  | "playing"
  | "session_summary"
  | "replay";

export type GameMode = "casual" | "serious";

export type PowerUpType = "team_shield" | "time_boost" | "bonus_round";

export interface PowerUpSlot {
  available: boolean;
  used: boolean;
}

export interface PowerUpState {
  team_shield: PowerUpSlot;
  time_boost: PowerUpSlot;
  bonus_round: PowerUpSlot;
}

export interface ActiveEffects {
  shieldRemovedOptions?: string[];
  timeBonusApplied?: boolean;
  bonusRoundActive?: boolean;
}

export interface Player {
  id: string;
  name: string;
  username?: string;
  isBot: boolean;
  isCorrect: boolean;
  wrongAnswers: string[];
  attempts: number;
  answer?: number | string;
  joinedAt: number;
  answeredAt?: number;
  correctCount: number;
  questionsParticipated: number;
  // Team momentum
  contributionCount: number;
  helpedCount: number;
  avatar?: string;
}

export interface MathProblem {
  id: string;
  question: string;
  correctAnswer: number | string;
  difficulty: Difficulty;
  type: "add" | "sub" | "mult" | "div" | "word";
  operands?: number[];
  options?: string[];
}

export interface SessionBadges {
  starTeam: boolean;
  helpingHand: boolean;
  fullHouse: boolean;
  teamOnFire: boolean;
  perfectTeam: boolean;
  everyoneContributed: boolean;
  comebackTeam: boolean;
  helpingHeroes: boolean;
}

export interface ProblemHistoryEntry {
  problem: MathProblem;
  correct: boolean;
  allPlayersCorrect?: boolean;
  averageResponseMs?: number;
}

export interface GameRoom {
  roomId: string;
  players: Player[];
  currentLevel: Difficulty;
  teamScore: number;
  teamStars: number;
  hintsUsed: number;
  groupCode?: string;
  gameMode: GameMode;
  currentProblem: MathProblem | null;
  currentQuestions: MathProblem[];
  currentQuestionIndex: number;
  subject: Subject;
  topic: Topic;
  grade: Grade;
  consecutiveCorrect: number;
  consecutiveFailed: number;
  status: RoomStatus;
  problemsSolved: number;
  sessionStartTime: number;
  problemHistory: ProblemHistoryEntry[];
  questionStartTime?: number;
  progressSaved?: boolean;
  gameStageLevel?: number;
  sessionSummaryAt?: number;
  teamStreak: number;
  bestTeamStreak: number;
  teamComboLevel: number;
  powerUps: PowerUpState;
  activeEffects: ActiveEffects;
  usedQuestionHashes: string[];
  questionSource?: "ai" | "backup" | "local";
}

export interface RoomStatePayload {
  roomId: string;
  players: Player[];
  currentLevel: Difficulty;
  teamScore: number;
  teamStars: number;
  hintsUsed: number;
  groupCode?: string;
  gameMode: GameMode;
  currentProblem: MathProblem | null;
  status: RoomStatus;
  problemsSolved: number;
  subject: Subject;
  topic: Topic;
  grade: Grade;
  timerSeconds?: number;
  round: number;
  questionsTotal: number;
  questionsRemaining: number;
  teamAccuracy: number;
  encouragement: string;
  sessionBadges?: SessionBadges;
  totalStars?: number;
  nextMilestone?: number;
  gameStageLevel?: number;
  teamStreak?: number;
  teamComboLevel?: number;
  bestTeamStreak?: number;
  powerUps?: PowerUpState;
  activeEffects?: ActiveEffects;
  problemHistory?: ProblemHistoryEntry[];
  questionSource?: "ai" | "backup" | "local";
}
