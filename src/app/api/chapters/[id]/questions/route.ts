import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { addQuestion } from "@/lib/chapters";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chapterId } = await params;
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const rawOptions = body.options;
    const options: [string, string, string, string] = Array.isArray(rawOptions) && rawOptions.length >= 4
      ? rawOptions.slice(0, 4).map((o: unknown) => (o != null ? String(o).trim() : "")) as [string, string, string, string]
      : ["", "", "", ""];
    const correctAnswerIndex = typeof body.correctAnswerIndex === "number"
      ? Math.min(3, Math.max(0, body.correctAnswerIndex))
      : 0;
    const q = addQuestion(chapterId, { question: question || "Question", options, correctAnswerIndex });
    if (!q) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    return NextResponse.json(q);
  } catch (e) {
    console.error("Add question error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
