"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LogIn, LogOut, BookOpen, Loader2, ClipboardList, Database, Link2, Clock } from "lucide-react";

type AuthState = "loading" | "authenticated" | "unauthenticated";

type OngoingTestInfo = {
  chapterName: string;
  availableFrom: string | null;
  availableUntil: string | null;
  testLinkId: string;
};

type AssessmentStatus = "scheduled" | "ongoing" | "ended";

function getStatus(availableFrom: string | null, availableUntil: string | null): AssessmentStatus {
  const now = Date.now();
  const from = availableFrom ? new Date(availableFrom).getTime() : 0;
  const until = availableUntil ? new Date(availableUntil).getTime() : Infinity;
  if (from > now) return "scheduled";
  if (until > now) return "ongoing";
  return "ended";
}

function formatTimeLeft(availableUntil: string | null): string {
  if (!availableUntil) return "—";
  const end = new Date(availableUntil).getTime();
  const now = Date.now();
  const left = Math.max(0, Math.floor((end - now) / 1000));
  if (left <= 0) return "Ended";
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

function formatStartsIn(availableFrom: string | null): string {
  if (!availableFrom) return "—";
  const start = new Date(availableFrom).getTime();
  const now = Date.now();
  const left = Math.max(0, Math.floor((start - now) / 1000));
  if (left <= 0) return "Started";
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  if (m > 0) return `Starts in ${m}m ${s}s`;
  return `Starts in ${s}s`;
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ongoingTest, setOngoingTest] = useState<OngoingTestInfo | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      })
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  const fetchQuizConfig = useCallback(() => {
    fetch("/api/quiz/config", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const chapterId = data?.chapterId?.trim();
        const testLinkId = data?.testLinkId;
        if (!chapterId || !testLinkId) {
          setOngoingTest(null);
          return;
        }
        const chaptersRes = await fetch("/api/chapters", { credentials: "include" });
        if (!chaptersRes.ok) {
          setOngoingTest({ chapterName: "Assessment", availableFrom: null, availableUntil: null, testLinkId });
          return;
        }
        const { chapters } = await chaptersRes.json();
        const ch = Array.isArray(chapters) ? chapters.find((c: { id: string }) => c.id === chapterId) : null;
        setOngoingTest({
          chapterName: ch?.name ?? "Assessment",
          availableFrom: ch?.availableFrom ?? null,
          availableUntil: ch?.availableUntil ?? null,
          testLinkId,
        });
      })
      .catch(() => setOngoingTest(null));
  }, []);

  useEffect(() => {
    if (authState === "authenticated") fetchQuizConfig();
  }, [authState, fetchQuizConfig]);

  useEffect(() => {
    if (!ongoingTest) return;
    const from = ongoingTest.availableFrom ? new Date(ongoingTest.availableFrom).getTime() : 0;
    const until = ongoingTest.availableUntil ? new Date(ongoingTest.availableUntil).getTime() : Infinity;
    const now = Date.now();
    const needsTick = (from > now) || (until > now);
    if (!needsTick) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [ongoingTest]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Login failed");
        return;
      }
      setUser(data.user);
      setAuthState("authenticated");
      setUsername("");
      setPassword("");
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setAuthState("unauthenticated");
  }

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              CogniGrade-AI Admin
            </h1>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in with your teacher account.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoComplete="username"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              CogniGrade-AI Admin
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="mb-8 text-center text-muted-foreground">
          Welcome, {user}. Choose an option below.
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/admin/setup"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 shadow-sm transition-colors hover:bg-muted/30 hover:border-primary/40"
            >
              <div className="rounded-full bg-primary/10 p-4">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Setup test
              </span>
              <span className="text-center text-sm text-muted-foreground">
                Choose chapter, time limit, and get the student share link.
              </span>
            </Link>
            <Link
              href="/admin/chapters"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 shadow-sm transition-colors hover:bg-muted/30 hover:border-primary/40"
            >
              <div className="rounded-full bg-primary/10 p-4">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Chapter Management
              </span>
              <span className="text-center text-sm text-muted-foreground">
                Manage chapters and quiz questions.
              </span>
            </Link>
          </div>
          {ongoingTest && (() => {
            const status = getStatus(ongoingTest.availableFrom, ongoingTest.availableUntil);
            const isScheduled = status === "scheduled";
            const isEnded = status === "ended";
            return (
              <Link
                href={`/admin/ongoing/${ongoingTest.testLinkId}`}
                className="flex flex-col gap-3 rounded-xl border border-primary/50 bg-primary/5 p-6 shadow-sm transition-colors hover:bg-primary/10 hover:border-primary/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex flex-row items-center gap-4">
                  <div className="rounded-full bg-primary/20 p-3">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {isScheduled ? "Not started yet" : isEnded ? "Ended" : "Ongoing test"}
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {ongoingTest.chapterName} Assessment
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-background/60 px-4 py-2 sm:ml-auto">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium text-foreground">
                    {isScheduled
                      ? formatStartsIn(ongoingTest.availableFrom)
                      : isEnded
                        ? "Ended"
                        : formatTimeLeft(ongoingTest.availableUntil)}
                  </span>
                </div>
              </Link>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
