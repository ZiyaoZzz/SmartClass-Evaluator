import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export type RequiredFields = {
  name?: boolean;
  email?: boolean;
};

export type QuizConfig = {
  chapterId: string;
  timeLimitMinutes: number;
  requiredFields?: RequiredFields;
  /** Optional access code; if set, students must enter it to start the quiz */
  accessPassword?: string;
  /** Short random id for the shareable test link (e.g. /t/abc12xyz) */
  testLinkId?: string;
};

const DEFAULT_CONFIG: QuizConfig = {
  chapterId: "",
  timeLimitMinutes: 10,
};

function getDataPath(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      return "";
    }
  }
  return path.join(dir, "quiz-config.json");
}

function loadConfig(): QuizConfig {
  const filePath = getDataPath();
  if (!filePath) return { ...DEFAULT_CONFIG };
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw) as Partial<QuizConfig> & { requiredFields?: Record<string, boolean> };
      const rf = data.requiredFields;
      const requiredFields =
        rf && typeof rf === "object"
          ? "name" in rf || "email" in rf
            ? { name: !!(rf as RequiredFields).name, email: !!(rf as RequiredFields).email }
            : { name: !!((rf as { firstName?: boolean; lastName?: boolean })?.firstName ?? (rf as { firstName?: boolean; lastName?: boolean })?.lastName), email: !!(rf as { email?: boolean }).email }
          : {};
      return {
        chapterId: data.chapterId ?? "",
        timeLimitMinutes: data.timeLimitMinutes ?? 10,
        requiredFields,
        accessPassword: data.accessPassword,
        testLinkId: typeof data.testLinkId === "string" ? data.testLinkId : undefined,
      };
    }
  } catch {
    // use default
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: QuizConfig) {
  const filePath = getDataPath();
  if (!filePath) return;
  try {
    writeFileSync(filePath, JSON.stringify(config, null, 0), "utf8");
  } catch {
    // ignore
  }
}

let cached: QuizConfig = loadConfig();

export function getQuizConfig(): QuizConfig {
  return { ...cached };
}

function generateTestLinkId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function setQuizConfig(config: Partial<QuizConfig>) {
  const newChapterId = config.chapterId ?? cached.chapterId;
  const isStartingTest = newChapterId && newChapterId !== "";
  const testLinkId =
    config.testLinkId !== undefined
      ? config.testLinkId
      : isStartingTest
        ? generateTestLinkId()
        : cached.testLinkId;
  cached = {
    chapterId: newChapterId,
    timeLimitMinutes: config.timeLimitMinutes ?? cached.timeLimitMinutes,
    requiredFields: config.requiredFields !== undefined ? config.requiredFields : cached.requiredFields,
    accessPassword: config.accessPassword !== undefined ? config.accessPassword : cached.accessPassword,
    testLinkId,
  };
  saveConfig(cached);
  return cached;
}
