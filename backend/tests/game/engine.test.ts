import {
  generateProblem,
  checkAnswer,
  generateHint,
  generateExplanation,
  adjustDifficulty,
  createRoom,
  addPlayer,
  startGame,
  startGameWithLocalFallback,
  startGameWithQuestions,
  processPlayerAnswer,
  allPlayersDone,
  advanceToNextQuestion,
  handleTimerExpiry,
  getTeamAccuracy,
  getEncouragement,
  getSessionEncouragement,
} from "../../src/game/engine";
import type { Difficulty, MathProblem } from "../../src/types";

describe("problem generation", () => {
  it("generates level 1 add problem with valid operands", () => {
    let found = false;
    for (let i = 0; i < 50; i++) {
      const p = generateProblem(1);
      if (p.type === "add" && p.operands) {
        expect(p.question).toMatch(/\d+ \+ \d+ = \?/);
        expect(p.correctAnswer).toBe(p.operands[0]! + p.operands[1]!);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("generates level 1 sub problem with valid operands", () => {
    let found = false;
    for (let i = 0; i < 50; i++) {
      const p = generateProblem(1);
      if (p.type === "sub" && p.operands) {
        expect(p.question).toMatch(/\d+ [−-] \d+ = \?/);
        expect(p.correctAnswer).toBe(p.operands[0]! - p.operands[1]!);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("generates level 3 multiplication problem", () => {
    const p = generateProblem(3, "Multiplication");
    expect(p.type).toBe("mult");
    expect(p.difficulty).toBe(3);
  });

  it("generates level 4 division problem", () => {
    const p = generateProblem(4, "Division");
    expect(p.type).toBe("div");
    expect(p.difficulty).toBe(4);
  });

  it("generates level 5 word problem", () => {
    const p = generateProblem(5, "Word Problems");
    expect(p.type).toBe("word");
    expect(typeof p.correctAnswer).toBe("number");
  });

  it("generates Math problems with subject Math, topic, and grade", () => {
    const room = createRoom("R1", "Math", "Multiplication", 4);
    const started = startGameWithLocalFallback(room, "Math", "Multiplication", 4);
    expect(started.subject).toBe("Math");
    expect(started.topic).toBe("Multiplication");
    expect(started.grade).toBe(4);
    expect(started.currentProblem).not.toBeNull();
    expect(started.currentProblem!.type).toBe("mult");
  });

  it("generates Science problems with subject, topic, and grade", () => {
    const room = createRoom("R1", "Science", "Animals & Habitats", 4);
    const started = startGameWithLocalFallback(room, "Science", "Animals & Habitats", 4);
    expect(started.subject).toBe("Science");
    expect(started.topic).toBe("Animals & Habitats");
    expect(started.grade).toBe(4);
    expect(started.currentProblem).not.toBeNull();
    expect(started.currentProblem!.options).toHaveLength(4);
    expect(["A", "B", "C", "D"]).toContain(started.currentProblem!.correctAnswer);
  });

  it("generates Geography problems for grade 3", () => {
    const room = createRoom("R1", "Geography", "Countries & Capitals", 3);
    const started = startGameWithLocalFallback(room, "Geography", "Countries & Capitals", 3);
    expect(started.grade).toBe(3);
    expect(started.currentProblem).not.toBeNull();
    expect(started.currentProblem!.options).toBeDefined();
  });

  it("uses startGameWithQuestions when given explicit questions", () => {
    const questions: MathProblem[] = [
      { id: "q1", question: "Test?", correctAnswer: "B", difficulty: 1, type: "word", options: ["A", "B", "C", "D"] },
    ];
    const room = createRoom("R1", "Science", "Plants & Growth", 5);
    const started = startGameWithQuestions(room, questions, "Science", "Plants & Growth", 5);
    expect(started.currentProblem!.id).toBe("q1");
    expect(started.currentProblem!.question).toBe("Test?");
  });
});

describe("answer validation", () => {
  const problem = {
    id: "x", question: "5 + 3 = ?", correctAnswer: 8, difficulty: 1 as Difficulty, type: "add" as const, operands: [5, 3],
  };

  it("accepts correct numeric answer", () => expect(checkAnswer(problem, 8)).toBe(true));
  it("accepts correct string answer", () => expect(checkAnswer(problem, "8")).toBe(true));
  it("rejects wrong answer", () => {
    expect(checkAnswer(problem, 7)).toBe(false);
    expect(checkAnswer(problem, "9")).toBe(false);
  });
  it("rejects non-numeric string", () => expect(checkAnswer(problem, "abc")).toBe(false));

  it("accepts correct MCQ answer (A/B/C/D)", () => {
    const mcq = {
      id: "x",
      question: "What is the capital of France?",
      correctAnswer: "B", difficulty: 1 as Difficulty, type: "word" as const,
      options: ["London", "Paris", "Berlin", "Madrid"],
    };
    expect(checkAnswer(mcq, "B")).toBe(true);
    expect(checkAnswer(mcq, "b")).toBe(true);
  });

  it("rejects wrong MCQ answer", () => {
    const mcq = {
      id: "x",
      question: "What is the capital of France?",
      correctAnswer: "B", difficulty: 1 as Difficulty, type: "word" as const,
      options: ["London", "Paris", "Berlin", "Madrid"],
    };
    expect(checkAnswer(mcq, "A")).toBe(false);
    expect(checkAnswer(mcq, "C")).toBe(false);
    expect(checkAnswer(mcq, "D")).toBe(false);
  });
});

describe("difficulty adjustment", () => {
  it("increases after 3 consecutive correct", () => {
    expect(adjustDifficulty(1, 3, 0)).toBe(2);
    expect(adjustDifficulty(4, 3, 0)).toBe(5);
  });
  it("does not exceed level 5", () => expect(adjustDifficulty(5, 3, 0)).toBe(5));
  it("decreases after 2 consecutive failed", () => {
    expect(adjustDifficulty(2, 0, 2)).toBe(1);
    expect(adjustDifficulty(5, 0, 2)).toBe(4);
  });
  it("does not go below level 1", () => expect(adjustDifficulty(1, 0, 2)).toBe(1));
  it("keeps level when no threshold", () => expect(adjustDifficulty(2, 2, 1)).toBe(2));

  it("3 consecutive correct increases difficulty (harder)", () => {
    expect(adjustDifficulty(1, 3, 0)).toBe(2);
    expect(adjustDifficulty(2, 3, 0)).toBe(3);
    expect(adjustDifficulty(3, 3, 0)).toBe(4);
  });

  it("2 consecutive wrong decreases difficulty (easier)", () => {
    expect(adjustDifficulty(5, 0, 2)).toBe(4);
    expect(adjustDifficulty(3, 0, 2)).toBe(2);
    expect(adjustDifficulty(2, 0, 2)).toBe(1);
  });
});

describe("hint logic", () => {
  it("returns hint for add", () => {
    const h = generateHint({ id: "x", question: "12 + 34 = ?", correctAnswer: 46, difficulty: 1, type: "add", operands: [12, 34] });
    expect(h.length).toBeGreaterThan(5);
  });
  it("returns hint for mult mentioning operands", () => {
    const h = generateHint({ id: "x", question: "6 × 7 = ?", correctAnswer: 42, difficulty: 3, type: "mult", operands: [6, 7] });
    expect(h).toContain("6");
  });
  it("returns explanation with correct answer", () => {
    const e = generateExplanation({ id: "x", question: "10 + 5 = ?", correctAnswer: 15, difficulty: 1, type: "add", operands: [10, 5] });
    expect(e).toContain("15");
  });

  it("returns hint for MCQ problem with options", () => {
    const mcq = {
      id: "x",
      question: "What is the capital of France?",
      correctAnswer: "B",
      difficulty: 1 as Difficulty,
      type: "word" as const,
      options: ["London", "Paris", "Berlin", "Madrid"],
    };
    const h = generateHint(mcq);
    expect(h.length).toBeGreaterThan(5);
    expect(h).toContain("eliminate");
  });

  it("returns explanation for MCQ with correct option text", () => {
    const mcq = {
      id: "x",
      question: "What is the capital of France?",
      correctAnswer: "B",
      difficulty: 1 as Difficulty,
      type: "word" as const,
      options: ["London", "Paris", "Berlin", "Madrid"],
    };
    const e = generateExplanation(mcq);
    expect(e).toContain("B");
    expect(e).toContain("Paris");
  });
});

describe("room and game flow", () => {
  it("createRoom has correct initial state", () => {
    const room = createRoom("ROOM1");
    expect(room.roomId).toBe("ROOM1");
    expect(room.players).toHaveLength(0);
    expect(room.status).toBe("waiting");
    expect(room.teamScore).toBe(0);
    expect(room.teamStars).toBe(0);
    expect(room.hintsUsed).toBe(0);
  });

  it("addPlayer adds player and caps at 4", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "Alice");
    room = addPlayer(room, "p2", "Bob");
    expect(room.players).toHaveLength(2);
    room = addPlayer(room, "p3", "Carol");
    room = addPlayer(room, "p4", "Dave");
    room = addPlayer(room, "p5", "Eve");
    expect(room.players).toHaveLength(4);
  });

  it("startGame sets problem and playing status", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    expect(room.status).toBe("playing");
    expect(room.currentProblem).not.toBeNull();
  });
});

describe("cooperative answer processing", () => {
  it("correct answer marks player isCorrect and increments correctCount", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = addPlayer(room, "p2", "B");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const answer = room.currentProblem!.correctAnswer;

    const { room: updated, result } = processPlayerAnswer(room, "p1", answer);
    expect(result.correct).toBe(true);
    const p1 = updated.players.find((p) => p.id === "p1")!;
    expect(p1.isCorrect).toBe(true);
    expect(p1.correctCount).toBe(1);
  });

  it("wrong answer returns hint and adds to wrongAnswers", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const wrong = typeof room.currentProblem!.correctAnswer === "number"
      ? room.currentProblem!.correctAnswer + 1 : "Z";

    const { room: updated, result } = processPlayerAnswer(room, "p1", wrong);
    expect(result.correct).toBe(false);
    expect(result.hint).toBeDefined();
    const p1 = updated.players.find((p) => p.id === "p1")!;
    expect(p1.isCorrect).toBe(false);
    expect(p1.wrongAnswers.length).toBe(1);
    expect(p1.attempts).toBe(1);
  });

  it("second wrong attempt returns explanation and increments hintsUsed", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const wrong = typeof room.currentProblem!.correctAnswer === "number"
      ? room.currentProblem!.correctAnswer + 1 : "Z";
    const wrong2 = typeof room.currentProblem!.correctAnswer === "number"
      ? room.currentProblem!.correctAnswer + 2 : "Y";

    const { room: r1 } = processPlayerAnswer(room, "p1", wrong);
    expect(r1.hintsUsed).toBe(1);
    const { result: r2 } = processPlayerAnswer(r1, "p1", wrong2);
    expect(r2.explanation).toBeDefined();
  });

  it("processPlayerAnswer accepts correct MCQ answer in non-Math game", () => {
    const questions: MathProblem[] = [
      { id: "q1", question: "What is the capital of France?", correctAnswer: "B", difficulty: 1, type: "word", options: ["London", "Paris", "Berlin", "Madrid"] },
    ];
    let room = createRoom("R1", "Geography", "Countries & Capitals", 4);
    room = addPlayer(room, "p1", "Alice");
    room = startGameWithQuestions(room, questions, "Geography", "Countries & Capitals", 4);
    room = { ...room, questionStartTime: Date.now() };

    const { room: updated, result } = processPlayerAnswer(room, "p1", "B");
    expect(result.correct).toBe(true);
    expect(updated.players.find((p) => p.id === "p1")!.isCorrect).toBe(true);
  });

  it("allPlayersDone is true when everyone correct", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = addPlayer(room, "p2", "B");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const correct = room.currentProblem!.correctAnswer;

    const { room: r1 } = processPlayerAnswer(room, "p1", correct);
    const { room: r2 } = processPlayerAnswer(r1, "p2", correct);
    expect(allPlayersDone(r2)).toBe(true);
  });
});

describe("team scoring", () => {
  it("advanceToNextQuestion awards team points when ≥75% correct", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = addPlayer(room, "p2", "B");
    room = addPlayer(room, "p3", "C");
    room = addPlayer(room, "p4", "D");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const correct = room.currentProblem!.correctAnswer;

    // 3 of 4 correct = 75%
    let { room: r1 } = processPlayerAnswer(room, "p1", correct);
    ({ room: r1 } = processPlayerAnswer(r1, "p2", correct));
    ({ room: r1 } = processPlayerAnswer(r1, "p3", correct));

    const advanced = advanceToNextQuestion(r1);
    expect(advanced.teamScore).toBe(10);
    expect(advanced.teamStars).toBe(1);
    expect(advanced.problemsSolved).toBe(1);
  });

  it("advanceToNextQuestion does NOT award points when <75% correct", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = addPlayer(room, "p2", "B");
    room = addPlayer(room, "p3", "C");
    room = addPlayer(room, "p4", "D");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const correct = room.currentProblem!.correctAnswer;

    // 2 of 4 correct = 50%
    let { room: r1 } = processPlayerAnswer(room, "p1", correct);
    ({ room: r1 } = processPlayerAnswer(r1, "p2", correct));

    const advanced = advanceToNextQuestion(r1);
    expect(advanced.teamScore).toBe(0);
    expect(advanced.teamStars).toBe(0);
    expect(advanced.problemsSolved).toBe(0);
  });
});

describe("encouragement messages", () => {
  it("returns positive message for high accuracy", () => {
    expect(getEncouragement(80)).toContain("Excellent");
  });
  it("returns moderate message for mid accuracy", () => {
    expect(getEncouragement(60)).toContain("Good effort");
  });
  it("returns supportive message for low accuracy", () => {
    expect(getEncouragement(30)).toContain("think together");
  });
  it("session encouragement varies by accuracy", () => {
    expect(getSessionEncouragement(85)).toContain("Amazing");
    expect(getSessionEncouragement(65)).toContain("Great improvement");
    expect(getSessionEncouragement(40)).toContain("Keep practicing");
  });
});

describe("team accuracy", () => {
  it("returns 0 with no history", () => {
    const room = createRoom("R1");
    expect(getTeamAccuracy(room)).toBe(0);
  });
  it("calculates correctly with history", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const correct = room.currentProblem!.correctAnswer;
    const { room: r1 } = processPlayerAnswer(room, "p1", correct);
    const advanced = advanceToNextQuestion(r1);
    expect(getTeamAccuracy(advanced)).toBe(100);
  });
});

describe("advance and timer", () => {
  it("advanceToNextQuestion stays playing and loads next question", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() };
    const firstProblemId = room.currentProblem!.id;
    const { room: r1 } = processPlayerAnswer(room, "p1", room.currentProblem!.correctAnswer);
    const advanced = advanceToNextQuestion(r1);
    expect(advanced.status).toBe("playing");
    expect(advanced.problemHistory).toHaveLength(1);
    expect(advanced.currentProblem!.id).not.toBe(firstProblemId);
  });

  it("handleTimerExpiry advances when time is up", () => {
    let room = createRoom("R1");
    room = addPlayer(room, "p1", "A");
    room = startGame(room);
    room = { ...room, questionStartTime: Date.now() - 31000 };
    const result = handleTimerExpiry(room);
    expect(["playing", "session_summary"]).toContain(result.status);
  });
});
