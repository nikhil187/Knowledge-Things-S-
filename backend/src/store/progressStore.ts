import * as fs from "fs";
import * as path from "path";
import * as lockfile from "proper-lockfile";

const DATA_DIR = path.join(process.cwd(), "data");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");

export interface GroupProgress {
  totalStars: number;
  gamesPlayed: number;
}

interface ProgressData {
  groups: Record<string, GroupProgress>;
}

const DEFAULT_DATA: ProgressData = { groups: {} };

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function read(): ProgressData {
  ensureDataDir();
  if (!fs.existsSync(PROGRESS_FILE)) return { ...DEFAULT_DATA };
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, "utf-8");
    const data = JSON.parse(raw) as ProgressData & { classes?: Record<string, GroupProgress> };
    return { groups: data.groups ?? data.classes ?? {} };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function write(data: ProgressData): void {
  ensureDataDir();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const STAR_MILESTONES = [15, 25, 40, 60, 100];

export function getProgress(groupCode: string): GroupProgress {
  const normalized = groupCode.trim().toUpperCase().slice(0, 20);
  if (!normalized) return { totalStars: 0, gamesPlayed: 0 };
  const data = read();
  return data.groups[normalized] ?? { totalStars: 0, gamesPlayed: 0 };
}

export function addGameResult(groupCode: string, teamStars: number): GroupProgress {
  const normalized = groupCode.trim().toUpperCase().slice(0, 20);
  if (!normalized) return { totalStars: 0, gamesPlayed: 0 };
  ensureDataDir();
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8");
  }
  const release = lockfile.lockSync(PROGRESS_FILE, { realpath: false });
  try {
    const data = read();
    const current = data.groups[normalized] ?? { totalStars: 0, gamesPlayed: 0 };
    const updated: GroupProgress = {
      totalStars: current.totalStars + teamStars,
      gamesPlayed: current.gamesPlayed + 1,
    };
    data.groups[normalized] = updated;
    write(data);
    return updated;
  } finally {
    release();
  }
}

export function getNextMilestone(totalStars: number): number | null {
  const next = STAR_MILESTONES.find((m) => m > totalStars) ?? null;
  return next;
}

export function getUnlockedTopicCount(totalStars: number): number {
  return STAR_MILESTONES.filter((m) => totalStars >= m).length;
}
