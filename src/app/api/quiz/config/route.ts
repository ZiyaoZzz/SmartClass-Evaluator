import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getQuizConfig, setQuizConfig } from "@/lib/quiz-config";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getQuizConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : undefined;
  const timeLimitMinutes =
    typeof body.timeLimitMinutes === "number"
      ? body.timeLimitMinutes
      : typeof body.timeLimitMinutes === "string"
        ? parseInt(body.timeLimitMinutes, 10)
        : undefined;
  const requiredFields =
    body.requiredFields && typeof body.requiredFields === "object"
      ? {
          name: !!body.requiredFields.name,
          email: !!body.requiredFields.email,
        }
      : undefined;
  const accessPassword = body.accessPassword !== undefined ? (typeof body.accessPassword === "string" ? body.accessPassword : "") : undefined;
  const updated = setQuizConfig({
    ...(chapterId !== undefined && { chapterId }),
    ...(timeLimitMinutes !== undefined && !Number.isNaN(timeLimitMinutes) && { timeLimitMinutes }),
    ...(requiredFields !== undefined && { requiredFields }),
    ...(accessPassword !== undefined && { accessPassword }),
  });
  return NextResponse.json(updated);
}
