import * as path from "path";
import * as fs from "fs";
import { getProgress, getNextMilestone, getUnlockedTopicCount } from "../../src/store/progressStore";

const TEST_FILE = path.join(process.cwd(), "data", "progress-test.json");

describe("progressStore", () => {
  const originalCwd = process.cwd();

  beforeAll(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  it("returns zero progress for unknown class", () => {
    const p = getProgress("UNKNOWN");
    expect(p.totalStars).toBe(0);
    expect(p.gamesPlayed).toBe(0);
  });

  it("getNextMilestone returns first milestone above totalStars", () => {
    expect(getNextMilestone(0)).toBe(15);
    expect(getNextMilestone(14)).toBe(15);
    expect(getNextMilestone(15)).toBe(25);
    expect(getNextMilestone(100)).toBe(null);
  });

  it("getUnlockedTopicCount returns count of passed milestones", () => {
    expect(getUnlockedTopicCount(0)).toBe(0);
    expect(getUnlockedTopicCount(15)).toBe(1);
    expect(getUnlockedTopicCount(25)).toBe(2);
    expect(getUnlockedTopicCount(100)).toBe(5);
  });
});
