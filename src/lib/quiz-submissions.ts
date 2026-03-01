import { getChapterQuestions } from "@/lib/chapters";
import { prisma } from "@/lib/db";

export type QuizSubmission = {
  id: string;
  studentName: string;
  score: number;
  total: number;
  correctCount: number;
  answers: Record<string, number>;
  submittedAt: string;
  durationSeconds?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  chapterId?: string;
};

function rowToSubmission(row: {
  id: string;
  studentName: string;
  score: number;
  total: number;
  correctCount: number;
  answers: string;
  submittedAt: Date;
  durationSeconds: number | null;
  email: string | null;
  chapterId: string | null;
}): QuizSubmission {
  let answers: Record<string, number> = {};
  try {
    answers = typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers;
  } catch {
    // keep {}
  }
  return {
    id: row.id,
    studentName: row.studentName,
    score: row.score,
    total: row.total,
    correctCount: row.correctCount,
    answers,
    submittedAt: row.submittedAt.toISOString(),
    ...(row.durationSeconds != null && { durationSeconds: row.durationSeconds }),
    ...(row.email != null && row.email !== "" && { email: row.email }),
    ...(row.chapterId != null && row.chapterId !== "" && { chapterId: row.chapterId }),
  };
}

export async function addSubmission(
  studentName: string,
  answers: Record<string, number>,
  durationSeconds?: number,
  extra?: { firstName?: string; lastName?: string; email?: string },
  chapterId?: string
): Promise<QuizSubmission> {
  const questions = chapterId ? getChapterQuestions(chapterId) : [];
  const total = questions.length;
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctAnswerIndex
  ).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const row = await prisma.quizSubmission.create({
    data: {
      studentName: studentName.trim(),
      score,
      total,
      correctCount,
      answers: JSON.stringify(answers),
      submittedAt: new Date(),
      ...(durationSeconds != null && { durationSeconds }),
      ...(extra?.email != null && extra.email.trim() !== "" && { email: extra.email.trim() }),
      ...(chapterId != null && chapterId !== "" && { chapterId }),
    },
  });

  return rowToSubmission({
    id: row.id,
    studentName: row.studentName,
    score: row.score,
    total: row.total,
    correctCount: row.correctCount,
    answers: row.answers,
    submittedAt: row.submittedAt,
    durationSeconds: row.durationSeconds,
    email: row.email,
    chapterId: row.chapterId,
  });
}

export async function getSubmissions(chapterId?: string): Promise<QuizSubmission[]> {
  const rows = await prisma.quizSubmission.findMany({
    where: chapterId ? { chapterId } : undefined,
    orderBy: { submittedAt: "desc" },
  });
  return rows.map((row) =>
    rowToSubmission({
      id: row.id,
      studentName: row.studentName,
      score: row.score,
      total: row.total,
      correctCount: row.correctCount,
      answers: row.answers,
      submittedAt: row.submittedAt,
      durationSeconds: row.durationSeconds,
      email: row.email,
      chapterId: row.chapterId,
    })
  );
}

/** Remove all submissions for a chapter (e.g. when starting a new test so old results don’t carry over). */
export async function deleteSubmissionsByChapterId(chapterId: string): Promise<void> {
  if (!chapterId?.trim()) return;
  await prisma.quizSubmission.deleteMany({ where: { chapterId: chapterId.trim() } });
}
