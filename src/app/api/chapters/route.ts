import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getChapters, createChapter } from "@/lib/chapters";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const chapters = getChapters();
  return NextResponse.json({ chapters });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "Untitled";
    const chapter = createChapter(name || "Untitled");
    return NextResponse.json(chapter);
  } catch (e) {
    console.error("Create chapter error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
