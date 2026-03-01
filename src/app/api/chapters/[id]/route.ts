import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getChapter, updateChapter, deleteChapter } from "@/lib/chapters";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const chapter = getChapter(id);
  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chapter);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const updates: {
      name?: string;
      availableFrom?: string | null;
      availableUntil?: string | null;
      randomOrder?: boolean;
    } = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (body.availableFrom !== undefined) updates.availableFrom = body.availableFrom === null || body.availableFrom === "" ? null : String(body.availableFrom);
    if (body.availableUntil !== undefined) updates.availableUntil = body.availableUntil === null || body.availableUntil === "" ? null : String(body.availableUntil);
    if (typeof body.randomOrder === "boolean") updates.randomOrder = body.randomOrder;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const chapter = updateChapter(id, updates);
    if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(chapter);
  } catch (e) {
    console.error("Update chapter error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteChapter(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
