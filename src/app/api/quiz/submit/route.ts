import { NextRequest, NextResponse } from "next/server";
import { addSubmission } from "@/lib/quiz-submissions";
import { getQuizConfig } from "@/lib/quiz-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = getQuizConfig();
    const chapterId = config?.chapterId?.trim() || undefined;
    const studentName =
      typeof body.studentName === "string"
        ? body.studentName.trim()
        : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    const durationSeconds = typeof body.durationSeconds === "number" && body.durationSeconds >= 0 ? body.durationSeconds : undefined;

    const displayName = studentName || "—";
    if (!displayName) {
      return NextResponse.json(
        { success: false, error: "Name required" },
        { status: 400 }
      );
    }

    const record = await addSubmission(
      displayName,
      answers,
      durationSeconds,
      { email: email || undefined },
      chapterId
    );
    return NextResponse.json({
      success: true,
      id: record.id,
      score: record.score,
      correctCount: record.correctCount,
      total: record.total,
    });
  } catch (e) {
    console.error("Quiz submit error:", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
