// ─── Game Progression ────────────────────────────────────────────────────────
export const MAX_SUBJECT_LEVEL = 10;
export const PASS_STARS = 4; // stars needed to advance a subject level

// ─── Questions Per Game ───────────────────────────────────────────────────────
// Formula: min(MAX_QUESTIONS, max(MIN_QUESTIONS, QUESTIONS_BASE + gameLevel))
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 14;
export const QUESTIONS_BASE = 4;

// ─── Player / Room Limits ─────────────────────────────────────────────────────
export const MAX_PLAYERS_PER_ROOM = 4;
export const MAX_NICKNAME_LENGTH = 20;
export const MAX_USERNAME_LENGTH = 32;
export const PIN_LENGTH = 4;
export const DEVICE_TOKEN_MIN_LENGTH = 16;

// ─── Achievement Thresholds ───────────────────────────────────────────────────
export const ACH_SPEED_LEARNER_STREAK = 3;
export const ACH_STREAK_LEGEND_STREAK = 5;
export const ACH_TEAM_SPIRIT_MIN_PLAYERS = 3;
export const ACH_BADGE_COLLECTOR_MIN_BADGES = 5;
export const ACH_QUIZ_EXPLORER_MIN_SUBJECTS = 3;
export const ACH_PRACTICE_PERFECT_GAMES = 5;
export const ACH_DEDICATED_LEARNER_GAMES = 10;
export const ACH_KNOWLEDGE_SEEKER_MIN_LEVEL = 5;
export const ACH_SUBJECT_MASTER_MIN_LEVEL = MAX_SUBJECT_LEVEL;
export const ACH_HELPING_HAND_PRO_COUNT = 5;

// ─── Auth / Lockout ───────────────────────────────────────────────────────────
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// ─── Session Badge Thresholds ─────────────────────────────────────────────────
export const BADGE_STAR_TEAM_STARS = 5;
export const BADGE_TEAM_ON_FIRE_STREAK = 3;
export const BADGE_PERFECT_TEAM_CONTRIBUTION = 3;
export const BADGE_HELPING_HEROES_COUNT = 3;
export const BADGE_FULL_HOUSE_FALLBACK_COUNT = 10;
