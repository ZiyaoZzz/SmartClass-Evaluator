import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return secret || "dev-secret-change-in-production";
}

export function signSession(payload: { user: string }): string {
  const secret = getSecret();
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + MAX_AGE * 1000,
  });
  const encoded = Buffer.from(data, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySession(token: string): { user: string } | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const secret = getSecret();
    const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return { user: data.user };
  } catch {
    return null;
  }
}

export function getSessionFromCookie(cookieHeader: string | null): { user: string } | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifySession(token);
}

export function getCookieConfig(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  };
}

export function validateCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "admin";
  return username === expectedUser && password === expectedPass;
}

const QUIZ_ACCESS_MAX_AGE = 60 * 60 * 24; // 24 hours

export function signQuizAccess(): string {
  const secret = getSecret();
  const data = JSON.stringify({ quiz: "access", exp: Date.now() + QUIZ_ACCESS_MAX_AGE * 1000 });
  const encoded = Buffer.from(data, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyQuizAccess(token: string): boolean {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return false;
    const secret = getSecret();
    const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) return false;
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return data?.quiz === "access" && data?.exp && Date.now() < data.exp;
  } catch {
    return false;
  }
}
