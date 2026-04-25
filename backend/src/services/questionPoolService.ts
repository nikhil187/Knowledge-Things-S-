import { getDatabase } from "./firebaseAdmin";
import { generateQuestions, type OpenAIQuestion, type QuestionGenMode } from "./openaiService";
import { MIN_QUESTIONS } from "../config/constants";

export type QuestionSource = "ai" | "backup" | "local";

export interface PoolQuestion extends OpenAIQuestion {
  usedCount: number;
}

function poolKey(subject: string, grade: number): string {
  return `${subject}_${grade}`.toLowerCase().replace(/\s+/g, "_");
}

function questionHash(q: string): string {
  return q.toLowerCase().trim().slice(0, 50);
}

async function saveToBackupPool(subject: string, grade: number, newQuestions: OpenAIQuestion[]): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  const key = poolKey(subject, grade);
  const ref = db.ref(`questionPool/${key}`);

  try {
    const snapshot = await ref.once("value");
    const existing: PoolQuestion[] = snapshot.exists() ? ((snapshot.val()?.questions as PoolQuestion[]) ?? []) : [];

    const existingHashes = new Set(existing.map((q) => questionHash(q.question)));
    const fresh = newQuestions.filter((q) => !existingHashes.has(questionHash(q.question)));

    if (fresh.length === 0) return;

    const withCount: PoolQuestion[] = fresh.map((q) => ({ ...q, usedCount: 0 }));
    const combined = [...existing, ...withCount].slice(-200);

    await ref.set({ questions: combined, lastUpdated: new Date().toISOString() });
    console.log(`[QuestionPool] Saved ${fresh.length} new questions for ${subject}/Gr.${grade} (pool size: ${combined.length})`);
  } catch (err) {
    console.error("[QuestionPool] Failed to save questions:", err);
  }
}

export async function getQuestionsWithFallback(
  subject: string,
  topic: string,
  grade: number,
  mode: QuestionGenMode = "serious",
  level: number = 1,
  count: number = MIN_QUESTIONS,
  usedHashes: string[] = [],
): Promise<{ questions: OpenAIQuestion[]; source: QuestionSource }> {
  try {
    const questions = await generateQuestions(subject, topic, grade, mode, level, count);
    if (questions.length >= 1) {
      // Save to pool in background — fire and forget
      saveToBackupPool(subject, grade, questions).catch(() => {});
      return { questions, source: "ai" };
    }
    // AI returned 0 valid questions — fall through to backup
    throw new Error("AI returned 0 valid questions");
  } catch (err) {
    console.warn("[QuestionPool] AI failed, trying backup pool:", (err as Error).message);

    const db = getDatabase();
    if (!db) {
      return { questions: [], source: "backup" };
    }

    const key = poolKey(subject, grade);
    const ref = db.ref(`questionPool/${key}`);

    try {
      const snapshot = await ref.once("value");
      if (!snapshot.exists()) {
        console.warn(`[QuestionPool] No backup pool for ${subject}/Gr.${grade}`);
        return { questions: [], source: "backup" };
      }

      const pool: PoolQuestion[] = (snapshot.val()?.questions as PoolQuestion[]) ?? [];
      if (pool.length < count) {
        console.warn(`[QuestionPool] Pool too small (${pool.length} < ${count}) for ${subject}/Gr.${grade}`);
        return { questions: pool, source: "backup" };
      }

      const usedHashSet = new Set(usedHashes);
      const available = pool.filter((q) => !usedHashSet.has(questionHash(q.question)));

      // Sort by least-used, then shuffle the bottom half for variety
      const sorted = [...available].sort((a, b) => (a.usedCount ?? 0) - (b.usedCount ?? 0));
      const pickFrom = sorted.slice(0, Math.max(count * 3, 15));
      const shuffled = pickFrom.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      // Increment usedCount in background
      const selectedQuestions = new Set(selected.map((s) => s.question));
      const updatedPool = pool.map((q) =>
        selectedQuestions.has(q.question) ? { ...q, usedCount: (q.usedCount ?? 0) + 1 } : q,
      );
      ref.update({ questions: updatedPool }).catch(() => {});

      console.log(`[QuestionPool] Serving ${selected.length} questions from backup pool for ${subject}/Gr.${grade}`);
      return { questions: selected, source: "backup" };
    } catch (dbErr) {
      console.error("[QuestionPool] Realtime Database read failed:", dbErr);
      return { questions: [], source: "backup" };
    }
  }
}
