import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { updateQuestion, deleteQuestion } from "@/lib/chapters";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chapterId, qid: questionId } = await params;
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : undefined;
    const rawOptions = body.options;
    const options: [string, string, string, string] | undefined = Array.isArray(rawOptions) && rawOptions.length >= 4
      ? (rawOptions.slice(0, 4).map((o: unknown) => (o != null ? String(o).trim() : "")) as [string, string, string, string])
      : undefined;
    const correctAnswerIndex = typeof body.correctAnswerIndex === "number"
      ? Math.min(3, Math.max(0, body.correctAnswerIndex))
      : undefined;
    const q = updateQuestion(chapterId, questionId, { question, options, correctAnswerIndex });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(q);
  } catch (e) {
    console.error("Update question error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chapterId, qid: questionId } = await params;
  const ok = deleteQuestion(chapterId, questionId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
