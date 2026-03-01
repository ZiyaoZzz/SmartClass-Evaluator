import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  validateCredentials,
  signSession,
  getCookieConfig,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password required" },
        { status: 400 }
      );
    }

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = signSession({ user: username });
    const cookieStore = await cookies();
    cookieStore.set(getCookieConfig(token));

    return NextResponse.json({ success: true, user: username });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
