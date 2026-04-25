import OpenAI from "openai";

export interface OpenAIQuestion {
  question: string;
  options: string[];
  answer: string; // "A" | "B" | "C" | "D"
}

export type QuestionGenMode = "casual" | "serious";

function buildPrompt(subject: string, topic: string, grade: number, level: number, count: number, mode: QuestionGenMode, seed?: number): string {
  const ageRange = grade === 3 ? "ages 8–9" : grade === 4 ? "ages 9–10" : "ages 10–11";
  const useSeed = seed ?? Math.floor(Math.random() * 9000) + 1000;
  const levelHint = level <= 3 ? "easier (Level 1–3)" : level <= 6 ? "medium (Level 4–6)" : "harder (Level 7–10)";
  const clarityRule =
    mode === "serious"
      ? "4. ONE CHANCE ONLY: One answer per question. Make every question clear and unambiguous. Single correct answer only. No trick questions."
      : "4. CLEAR QUESTIONS: Make every question unambiguous. Single correct answer only. No trick questions. Wrong answers may receive hints.";

  return `Generate exactly ${count} unique multiple-choice questions for a 10-level game.

RULES — follow every rule:
1. Subject: ${subject}. Topic: "${topic}". Grade ${grade} (${ageRange}).
2. EVERY question MUST be about "${topic}" in ${subject}. No other topics.
3. Difficulty: ${levelHint}. This batch is for level ${level} of 10.
${clarityRule}
5. VARIETY: mix question styles — definitions, true/false phrased as MCQ, "which of these", fill-in-the-blank, cause-and-effect, ordering, real-world application. Do NOT repeat the same question pattern.
6. Use simple, clear language appropriate for the grade level. Avoid complex vocabulary unless testing vocabulary specifically.
7. "options" = array of exactly 4 answer strings (no letter prefixes).
8. "answer" = one of: A, B, C, D (letter of the correct option).
9. CRITICAL: Distribute correct answers evenly across A, B, C, D. For ${count} questions, each letter should be correct approximately ${Math.round(count / 4)} times. Never have more than 2 consecutive questions with the same correct letter.
10. Wrong answer options (distractors) must be plausible but clearly wrong. Avoid obviously silly options. Each distractor should represent a common misconception or near-miss.
11. Output a JSON object: {"questions":[...]}
12. No markdown, no explanation, only JSON.

Seed for randomness: ${useSeed}

Topic reminder: "${topic}" in ${subject}, Grade ${grade}, Level ${level}/10.`;
}

function isValidQuestion(raw: unknown): raw is OpenAIQuestion {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.question !== "string" || !o.question.trim()) return false;
  if (!Array.isArray(o.options) || (o.options as unknown[]).length !== 4) return false;
  if (!(o.options as unknown[]).every((opt) => typeof opt === "string" && (opt as string).trim())) return false;
  const ans = String(o.answer ?? "").trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(ans)) return false;
  return true;
}

function safeExtractJson(raw: string): string {
  const trimmed = raw.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start !== -1 && end > start) return stripped.slice(start, end + 1);
  return stripped;
}

function parseResponse(content: string): OpenAIQuestion[] {
  const jsonStr = safeExtractJson(content);
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!Array.isArray(parsed)) return [];
  const out: OpenAIQuestion[] = [];
  for (const item of parsed) {
    if (isValidQuestion(item)) {
      out.push({
        question: (item as OpenAIQuestion).question.trim(),
        options: (item as OpenAIQuestion).options.map((o) => o.trim()),
        answer: (item as OpenAIQuestion).answer.trim().toUpperCase(),
      });
    }
  }
  return out;
}

function extractQuestions(content: string, countClamped: number): OpenAIQuestion[] {
  const parsed = JSON.parse(content) as unknown;
  let arr: unknown[] = [];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === "object" && "questions" in (parsed as object)) {
    const q = (parsed as Record<string, unknown>)["questions"];
    if (Array.isArray(q)) arr = q;
  }
  const questions: OpenAIQuestion[] = [];
  for (const item of arr) {
    if (isValidQuestion(item)) {
      questions.push({
        question: (item as OpenAIQuestion).question.trim(),
        options: (item as OpenAIQuestion).options.map((o) => o.trim()),
        answer: (item as OpenAIQuestion).answer.trim().toUpperCase(),
      });
    }
  }
  if (questions.length >= 5) return questions.slice(0, countClamped);
  return [];
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function callDeepSeek(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let completion;
  try {
    completion = await client.chat.completions.create(
      {
        model: "deepseek-chat",
        max_tokens: 3000,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return completion.choices[0]?.message?.content ?? null;
}

export async function generateQuestions(
  subject: string,
  topic: string,
  grade: number,
  mode: QuestionGenMode = "serious",
  level: number = 1,
  count: number = 10,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<OpenAIQuestion[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  const levelClamped = Math.max(1, Math.min(10, level));
  const countClamped = Math.max(5, Math.min(14, count));

  // Use longer timeout for larger batches
  const effectiveTimeout = countClamped > 8 ? 45_000 : timeoutMs;

  console.log(`[DeepSeek] Calling API for ${subject}/${topic}/Gr.${grade} mode=${mode} level=${levelClamped} count=${countClamped}...`);

  const systemPrompt =
    mode === "serious"
      ? "You are a strict quiz generator for children (Grades 3–5). One chance per question — make every question clear, unambiguous, and fair. Single correct answer only. No trick questions. You ONLY output valid JSON. You ONLY generate questions about the exact topic specified. Vary question styles and randomize correct answer positions (A/B/C/D). Use simple, age-appropriate language. Distractors must be plausible (common misconceptions or near-misses), never silly."
      : "You are a quiz generator for children (Grades 3–5). Make every question clear and unambiguous. Single correct answer only. No trick questions. Wrong answers may receive hints. You ONLY output valid JSON. You ONLY generate questions about the exact topic specified. Vary question styles and randomize correct answer positions (A/B/C/D). Use simple, age-appropriate language. Distractors must be plausible (common misconceptions or near-misses), never silly.";

  const userPrompt = buildPrompt(subject, topic, grade, levelClamped, countClamped, mode);

  // First attempt
  const content = await callDeepSeek(client, systemPrompt, userPrompt, effectiveTimeout);
  if (content) {
    try {
      const questions = extractQuestions(content, countClamped);
      if (questions.length >= 5) return questions;
      console.warn(`[DeepSeek] Only ${questions.length} valid questions on first attempt for ${subject}/${topic}.`);
    } catch (err) {
      console.error("[DeepSeek] JSON parse error on first attempt:", err);
      try {
        const fallback = parseResponse(content);
        if (fallback.length >= 5) return fallback.slice(0, countClamped);
      } catch { /* fall through to retry */ }
    }
  }

  // Retry ONCE with a different seed
  console.log(`[DeepSeek] Retrying with different seed for ${subject}/${topic}...`);
  const retrySeed = Math.floor(Math.random() * 9000) + 1000;
  const retryPrompt = buildPrompt(subject, topic, grade, levelClamped, countClamped, mode, retrySeed);

  const retryContent = await callDeepSeek(client, systemPrompt, retryPrompt, effectiveTimeout);
  if (!retryContent) return [];

  try {
    const questions = extractQuestions(retryContent, countClamped);
    if (questions.length >= 5) return questions;
    console.warn(`[DeepSeek] Only ${questions.length} valid questions on retry for ${subject}/${topic}. Falling back.`);
    return [];
  } catch (err) {
    console.error("[DeepSeek] JSON parse error on retry:", err);
    try { return parseResponse(retryContent); } catch { return []; }
  }
}
