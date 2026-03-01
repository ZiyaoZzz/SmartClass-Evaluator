import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuizQuestions } from "@/lib/chapters";
import { getQuizConfig } from "@/lib/quiz-config";
import { verifyQuizAccess } from "@/lib/auth";
import { QUIZ_DATA } from "@/data/quiz-data";

const QUIZ_ACCESS_COOKIE = "quiz_access";

/** Public: returns questions and time limit. If access password is set, requires valid quiz_access cookie. */
export async function GET() {
  const config = getQuizConfig();
  const timeLimitSeconds = (config.timeLimitMinutes || 10) * 60;
  const requiredFields = config.requiredFields ?? {};

  const requireAccessCode = !!(config.accessPassword && config.accessPassword.trim());
  if (requireAccessCode) {
    const cookieStore = await cookies();
    const token = cookieStore.get(QUIZ_ACCESS_COOKIE)?.value;
    if (!token || !verifyQuizAccess(token)) {
      return NextResponse.json({
        requireAccessCode: true,
        timeLimitSeconds,
        requiredFields,
      });
    }
  }

  const questions = getQuizQuestions(config.chapterId || undefined);
  const hasActiveChapter = !!(config.chapterId && config.chapterId.trim());
  if (hasActiveChapter && questions.length === 0) {
    return NextResponse.json({
      questions: [],
      timeLimitSeconds,
      requiredFields,
      requireAccessCode: false,
      testNotAvailable: true,
    });
  }
  const list = questions.length > 0 ? questions : QUIZ_DATA;
  return NextResponse.json({
    questions: list,
    timeLimitSeconds,
    requiredFields,
    requireAccessCode: false,
  });
}
