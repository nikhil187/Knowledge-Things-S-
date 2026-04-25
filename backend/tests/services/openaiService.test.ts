const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  })),
}));

import { generateQuestions } from "../../src/services/openaiService";

// Build 5+ valid questions for mocking
function makeQuestions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Question ${i + 1}?`,
    options: [`Option A${i}`, `Option B${i}`, `Option C${i}`, `Option D${i}`],
    answer: "A",
  }));
}

describe("openaiService - generateQuestions", () => {
  const originalEnv = process.env.DEEPSEEK_API_KEY;

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalEnv;
    mockCreate.mockReset();
  });

  it("throws when DEEPSEEK_API_KEY is not set", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(generateQuestions("Math", "Arithmetic", 4)).rejects.toThrow(
      "DEEPSEEK_API_KEY is not set",
    );
  });

  it("returns parsed questions on successful API response (json_object wrapped)", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    const questions = makeQuestions(10);
    // json_object mode → OpenAI returns { "questions": [...] }
    const content = JSON.stringify({ questions });
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content } }],
    });

    const result = await generateQuestions("Math", "Addition and subtraction", 4);

    expect(result).toHaveLength(10);
    expect(result[0]!.question).toBe("Question 1?");
    expect(result[0]!.answer).toBe("A");
    expect(result[0]!.options).toHaveLength(4);
  });

  it("also accepts a bare JSON array response (legacy path)", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    const questions = makeQuestions(5);
    // Bare array
    const content = JSON.stringify(questions);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content } }],
    });

    const result = await generateQuestions("Science", "Animals", 4);
    expect(result).toHaveLength(5);
  });

  it("rejects when API call throws (caller uses local fallback)", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    mockCreate.mockRejectedValueOnce(new Error("API error"));

    await expect(generateQuestions("Science", "Animals", 3)).rejects.toThrow(
      "API error",
    );
  });

  it("returns empty array when fewer than 5 valid questions parsed", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    // Only 2 questions on both attempts — below the 5-question minimum threshold
    const content = JSON.stringify({ questions: makeQuestions(2) });
    mockCreate.mockResolvedValue({
      choices: [{ message: { content } }],
    });

    const result = await generateQuestions("English", "Vocabulary", 5);
    expect(result).toEqual([]);
  });

  it("returns empty array when response has no content", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    // Both first attempt and retry return null content
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const result = await generateQuestions("History", "World Wars", 4);
    expect(result).toEqual([]);
  });

  it("rejects on timeout so start_game catch uses fallback", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    // Simulate what happens when the AbortController fires — API call rejects with AbortError
    mockCreate.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(generateQuestions("Math", "Test", 4)).rejects.toThrow();
  });
});
