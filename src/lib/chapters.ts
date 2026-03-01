import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { QUIZ_DATA } from "@/data/quiz-data";

export type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
};

export type Chapter = {
  id: string;
  name: string;
  questions: QuizQuestion[];
  createdAt: string;
  /** ISO datetime; test can only be taken on or after this time */
  availableFrom?: string | null;
  /** ISO datetime; test can only be taken before this time */
  availableUntil?: string | null;
  /** If true, questions are shown in random order to test takers */
  randomOrder?: boolean;
};

const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: "ch_default",
    name: "Default",
    createdAt: new Date().toISOString(),
    questions: QUIZ_DATA.map((q, i) => ({
      ...q,
      id: q.id || `q${i + 1}`,
    })),
  },
];

function getDataPath(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      return "";
    }
  }
  return path.join(dir, "chapters.json");
}

function loadChapters(): Chapter[] {
  const filePath = getDataPath();
  if (!filePath) return [...DEFAULT_CHAPTERS];
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data as Chapter[];
      }
    }
  } catch {
    // use default
  }
  return [...DEFAULT_CHAPTERS];
}

function saveChapters(data: Chapter[]) {
  const filePath = getDataPath();
  if (!filePath) return;
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 0), "utf8");
  } catch {
    // ignore (e.g. read-only fs)
  }
}

const chapters: Chapter[] = loadChapters();
if (chapters.length === 0) {
  DEFAULT_CHAPTERS.forEach((ch) => chapters.push(ch));
  saveChapters(chapters);
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getChapters(): Chapter[] {
  return chapters.map((ch) => ({
    ...ch,
    questions: [...ch.questions],
  }));
}

export function getChapter(id: string): Chapter | null {
  const ch = chapters.find((c) => c.id === id);
  if (!ch) return null;
  return { ...ch, questions: [...ch.questions] };
}

export function createChapter(name: string): Chapter {
  const chapter: Chapter = {
    id: generateId("ch"),
    name: name.trim() || "Untitled",
    questions: [],
    createdAt: new Date().toISOString(),
    randomOrder: true,
  };
  chapters.push(chapter);
  saveChapters(chapters);
  return chapter;
}

export function updateChapter(
  id: string,
  updates: {
    name?: string;
    availableFrom?: string | null;
    availableUntil?: string | null;
    randomOrder?: boolean;
  }
): Chapter | null {
  const ch = chapters.find((c) => c.id === id);
  if (!ch) return null;
  if (updates.name !== undefined) ch.name = updates.name.trim() || ch.name;
  if (updates.availableFrom !== undefined) ch.availableFrom = updates.availableFrom;
  if (updates.availableUntil !== undefined) ch.availableUntil = updates.availableUntil;
  if (updates.randomOrder !== undefined) ch.randomOrder = updates.randomOrder;
  saveChapters(chapters);
  return { ...ch, questions: [...ch.questions] };
}

export function deleteChapter(id: string): boolean {
  const i = chapters.findIndex((c) => c.id === id);
  if (i === -1) return false;
  chapters.splice(i, 1);
  saveChapters(chapters);
  return true;
}

export function addQuestion(
  chapterId: string,
  data: { question: string; options: [string, string, string, string]; correctAnswerIndex: number }
): QuizQuestion | null {
  const ch = chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  const question: QuizQuestion = {
    id: generateId("q"),
    question: data.question.trim() || "Question",
    options: data.options.map((o) => (o && String(o).trim()) || "") as [string, string, string, string],
    correctAnswerIndex: Math.min(3, Math.max(0, data.correctAnswerIndex)),
  };
  ch.questions.push(question);
  saveChapters(chapters);
  return question;
}

export function updateQuestion(
  chapterId: string,
  questionId: string,
  data: { question?: string; options?: [string, string, string, string]; correctAnswerIndex?: number }
): QuizQuestion | null {
  const ch = chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  const q = ch.questions.find((x) => x.id === questionId);
  if (!q) return null;
  if (data.question !== undefined) q.question = data.question.trim() || q.question;
  if (data.options !== undefined) q.options = data.options.map((o) => (o && String(o).trim()) || "") as [string, string, string, string];
  if (data.correctAnswerIndex !== undefined) q.correctAnswerIndex = Math.min(3, Math.max(0, data.correctAnswerIndex));
  saveChapters(chapters);
  return { ...q };
}

export function deleteQuestion(chapterId: string, questionId: string): boolean {
  const ch = chapters.find((c) => c.id === chapterId);
  if (!ch) return false;
  const i = ch.questions.findIndex((q) => q.id === questionId);
  if (i === -1) return false;
  ch.questions.splice(i, 1);
  saveChapters(chapters);
  return true;
}

/** Returns all questions for a chapter (no time window, no shuffle). Use for scoring submissions. */
export function getChapterQuestions(chapterId: string): QuizQuestion[] {
  const ch = chapters.find((c) => c.id === chapterId);
  if (!ch) return [];
  return [...ch.questions];
}

/** Returns questions for the quiz. If chapterId is given, uses that chapter; otherwise first chapter. Respects availableFrom, availableUntil, randomOrder. */
export function getQuizQuestions(chapterId?: string): QuizQuestion[] {
  if (chapters.length === 0) return [];
  const ch = chapterId ? chapters.find((c) => c.id === chapterId) ?? chapters[0] : chapters[0];
  const now = Date.now();
  if (ch.availableFrom) {
    const from = new Date(ch.availableFrom).getTime();
    if (now < from) return [];
  }
  if (ch.availableUntil) {
    const until = new Date(ch.availableUntil).getTime();
    if (now >= until) return [];
  }
  const list = [...ch.questions];
  if (ch.randomOrder) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}
