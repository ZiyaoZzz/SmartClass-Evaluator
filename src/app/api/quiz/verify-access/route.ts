import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuizConfig } from "@/lib/quiz-config";
import { signQuizAccess } from "@/lib/auth";

const QUIZ_ACCESS_COOKIE = "quiz_access";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const config = getQuizConfig();
    const expected = config.accessPassword?.trim() ?? "";

    if (!expected) {
      return NextResponse.json({ success: true });
    }
    if (code !== expected) {
      return NextResponse.json({ success: false, error: "Invalid access code" }, { status: 401 });
    }

    const token = signQuizAccess();
    const cookieStore = await cookies();
    cookieStore.set(QUIZ_ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Verify access error:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
