import type { Subject } from "./types";

export interface SubjectConfig {
  label: Subject;
  emoji: string;
  color: string;
  textColor: string;
  gradientClass: string;
  description: string;
  topics: string[];
  customPlaceholder: string;
  // Unified light-theme game colors
  accentColor: string;
  lightBg: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  progressBarColor: string;
  bgGradientStyle: string;
}

export const SUBJECTS: SubjectConfig[] = [
  {
    label: "Math",
    emoji: "\u{1F522}",
    color: "bg-violet-400",
    textColor: "text-violet-900",
    gradientClass: "subject-math",
    description: "Numbers, operations & problem solving",
    topics: ["Addition & Subtraction", "Multiplication", "Division", "Fractions", "Word Problems", "Mixed"],
    customPlaceholder: 'e.g. "Decimals", "Percentages", "Geometry"',
    accentColor: "#7c3aed",
    lightBg: "#f5f3ff",
    accentBg: "bg-violet-500",
    accentText: "text-violet-700",
    accentBorder: "border-violet-300",
    progressBarColor: "bg-violet-500",
    bgGradientStyle: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 30%, #e0e7ff 60%, #f0fdf4 100%)",
  },
  {
    label: "Science",
    emoji: "\u{1F52C}",
    color: "bg-cyan-400",
    textColor: "text-cyan-900",
    gradientClass: "subject-science",
    description: "Explore the natural world",
    topics: ["Animals & Habitats", "Plants & Growth", "Human Body", "Earth & Space", "Weather & Climate", "Matter & Energy"],
    customPlaceholder: 'e.g. "Photosynthesis", "Volcanoes", "Magnets"',
    accentColor: "#0891b2",
    lightBg: "#ecfeff",
    accentBg: "bg-cyan-500",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-300",
    progressBarColor: "bg-cyan-500",
    bgGradientStyle: "linear-gradient(135deg, #cffafe 0%, #ecfeff 30%, #e0f2fe 60%, #f0fdf4 100%)",
  },
  {
    label: "English",
    emoji: "\u{1F4D6}",
    color: "bg-emerald-400",
    textColor: "text-emerald-900",
    gradientClass: "subject-english",
    description: "Language, reading & writing",
    topics: ["Spelling", "Grammar", "Vocabulary", "Punctuation", "Reading Comprehension", "Parts of Speech"],
    customPlaceholder: 'e.g. "Synonyms & Antonyms", "Tenses", "Prefixes"',
    accentColor: "#059669",
    lightBg: "#ecfdf5",
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-300",
    progressBarColor: "bg-emerald-500",
    bgGradientStyle: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 30%, #e0f2fe 60%, #fef9c3 100%)",
  },
  {
    label: "History",
    emoji: "\u{1F3DB}\uFE0F",
    color: "bg-amber-400",
    textColor: "text-amber-900",
    gradientClass: "subject-history",
    description: "Stories from the past",
    topics: ["Ancient Civilizations", "World Wars", "American History", "Famous Leaders", "Inventions & Discoveries", "Historical Events"],
    customPlaceholder: 'e.g. "Egyptian Pharaohs", "Industrial Revolution", "Moon Landing"',
    accentColor: "#d97706",
    lightBg: "#fffbeb",
    accentBg: "bg-amber-500",
    accentText: "text-amber-700",
    accentBorder: "border-amber-300",
    progressBarColor: "bg-amber-500",
    bgGradientStyle: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 30%, #fce7f3 60%, #e0e7ff 100%)",
  },
  {
    label: "Geography",
    emoji: "\u{1F30D}",
    color: "bg-rose-400",
    textColor: "text-rose-900",
    gradientClass: "subject-geography",
    description: "Countries, capitals & landmarks",
    topics: ["Countries & Capitals", "Continents & Oceans", "Landforms", "Maps & Directions", "World Cultures", "Natural Wonders"],
    customPlaceholder: 'e.g. "European Countries", "Rivers of the World", "Deserts"',
    accentColor: "#e11d48",
    lightBg: "#fff1f2",
    accentBg: "bg-rose-500",
    accentText: "text-rose-700",
    accentBorder: "border-rose-300",
    progressBarColor: "bg-rose-500",
    bgGradientStyle: "linear-gradient(135deg, #ffe4e6 0%, #fff1f2 30%, #fef3c7 60%, #e0e7ff 100%)",
  },
  {
    label: "General Knowledge",
    emoji: "\u{1F31F}",
    color: "bg-indigo-400",
    textColor: "text-indigo-900",
    gradientClass: "subject-general",
    description: "Fun facts about everything",
    topics: ["Animals", "Sports", "Food & Nature", "Arts & Music", "Technology", "Mixed"],
    customPlaceholder: 'e.g. "Dinosaurs", "Olympic Games", "Famous Paintings"',
    accentColor: "#4f46e5",
    lightBg: "#eef2ff",
    accentBg: "bg-indigo-500",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-300",
    progressBarColor: "bg-indigo-500",
    bgGradientStyle: "linear-gradient(135deg, #e0e7ff 0%, #eef2ff 30%, #ede9fe 60%, #ecfdf5 100%)",
  },
];

export function getSubjectConfig(subject: Subject): SubjectConfig {
  return SUBJECTS.find((s) => s.label === subject) ?? SUBJECTS[0]!;
}
