"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  LogOut, ClipboardList, ArrowLeft, Link2, Copy, ExternalLink,
  RefreshCw, FileDown, X, Clock, Loader2, StopCircle,
} from "lucide-react";

type QuizResult = {
  id: string;
  studentName: string;
  score: number;
  total: number;
  correctCount: number;
  answers: Record<string, number>;
  submittedAt: string;
  durationSeconds?: number;
  email?: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
};

type Chapter = {
  id: string;
  name: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  randomOrder?: boolean;
  questions?: QuizQuestion[];
};

export default function AdminOngoingPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [user, setUser] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    chapterId: string;
    timeLimitMinutes: number;
    requiredFields?: { name?: boolean; email?: boolean };
    accessPassword?: string;
    testLinkId?: string;
  } | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [origin, setOrigin] = useState("");
  const [tick, setTick] = useState(0);
  const [endingTest, setEndingTest] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setAuthState("authenticated");
        } else setAuthState("unauthenticated");
      })
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  const fetchConfig = useCallback(() => {
    fetch("/api/quiz/config", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.chapterId?.trim()) {
          router.replace("/admin/setup");
          return;
        }
        if (!data?.testLinkId || data.testLinkId !== id) {
          if (data?.testLinkId) router.replace(`/admin/ongoing/${data.testLinkId}`);
          else router.replace("/admin/setup");
          return;
        }
        setConfig(data);
      })
      .catch(() => router.replace("/admin"));
  }, [id, router]);

  const fetchChapters = useCallback(() => {
    fetch("/api/chapters", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChapters(data?.chapters ?? []))
      .catch(() => setChapters([]));
  }, []);

  const fetchResults = useCallback((chapterId?: string) => {
    setResultsLoading(true);
    const url = chapterId ? `/api/quiz/results?chapterId=${encodeURIComponent(chapterId)}` : "/api/quiz/results";
    fetch(url, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setResults(data?.results ?? []))
      .finally(() => setResultsLoading(false));
  }, []);

  useEffect(() => {
    if (authState !== "authenticated" || !id) return;
    fetchConfig();
    fetchChapters();
  }, [authState, id, fetchConfig, fetchChapters]);

  useEffect(() => {
    if (authState !== "authenticated" || !config?.chapterId) return;
    fetchResults(config.chapterId);
  }, [authState, config?.chapterId, fetchResults]);

  // Auto-refresh results when tab is visible (e.g. every 10s) to pick up new submissions
  useEffect(() => {
    if (authState !== "authenticated" || !config?.chapterId) return;
    const intervalMs = 10_000;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchResults(config.chapterId);
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [authState, config?.chapterId, fetchResults]);

  const ch = config ? chapters.find((c) => c.id === config.chapterId) : null;
  const availableUntil = ch?.availableUntil ?? null;
  useEffect(() => {
    if (!availableUntil) return;
    const until = new Date(availableUntil).getTime();
    if (until <= Date.now()) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [availableUntil]);

  function formatTimeLeft(until: string | null): string {
    if (!until) return "—";
    const end = new Date(until).getTime();
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

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  }

  function formatDateShort(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  }

  function formatDuration(seconds?: number) {
    if (seconds == null || seconds < 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m === 0 ? `${s}s` : `${m} min ${s}s`;
  }

  function exportResultsCsv() {
    const headers = ["Name", "Email", "Score (%)", "Correct", "Total", "Duration", "Submitted"];
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = results.map((r) => [
      escape(r.studentName),
      escape(r.email ?? ""),
      String(r.score),
      String(r.correctCount),
      String(r.total),
      formatDuration(r.durationSeconds),
      formatDate(r.submittedAt),
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin");
  }

  async function handleEndTest() {
    if (!config?.chapterId || endingTest) return;
    if (!confirm("Are you sure you want to end this test? Students will no longer be able to access or submit.")) return;
    setEndingTest(true);
    try {
      const res = await fetch(`/api/chapters/${config.chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ availableUntil: new Date().toISOString() }),
      });
      if (res.ok) {
        const data = await res.json();
        setChapters((prev) =>
          prev.map((c) => (c.id === config.chapterId ? { ...c, availableUntil: data.availableUntil } : c))
        );
      }
    } finally {
      setEndingTest(false);
    }
  }

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (authState === "unauthenticated") {
    router.replace("/admin");
    return null;
  }
  if (!config?.chapterId || config.testLinkId !== id) {
    return null;
  }

  const chapterName = ch?.name ?? "—";
  const testLink = origin && config.testLinkId ? `${origin}/t/${config.testLinkId}` : "";
  const timeLeftText = formatTimeLeft(availableUntil);
  const isEnded = availableUntil && new Date(availableUntil).getTime() <= Date.now();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <Link2 className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Ongoing test</h1>
            </div>
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
      <div className={`border-b px-4 py-3 ${isEnded ? "bg-muted/50" : "bg-primary/10"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex flex-1 items-center justify-center gap-2">
            <Clock className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              Time left: {timeLeftText}
            </span>
          </div>
          {!isEnded && (
            <button
              type="button"
              onClick={handleEndTest}
              disabled={endingTest}
              className="flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 hover:border-red-700 disabled:opacity-50 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-700 dark:hover:border-red-700"
            >
              {endingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
              End test
            </button>
          )}
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            Current test (read-only)
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Chapter</dt>
              <dd className="font-medium text-foreground">{chapterName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Time limit</dt>
              <dd className="font-medium text-foreground">{config.timeLimitMinutes} min</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Required</dt>
              <dd className="font-medium text-foreground">
                {[config.requiredFields?.name !== false && "Name", config.requiredFields?.email && "Email"].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Password</dt>
              <dd className="font-medium text-foreground">{config.accessPassword?.trim() ? "Set" : "None"}</dd>
            </div>
            {ch && (ch.availableFrom != null || ch.availableUntil != null) && (
              <>
                {ch.availableFrom && (
                  <div>
                    <dt className="text-muted-foreground">Available from</dt>
                    <dd className="font-medium text-foreground">{formatDate(ch.availableFrom)}</dd>
                  </div>
                )}
                {ch.availableUntil && (
                  <div>
                    <dt className="text-muted-foreground">Available until</dt>
                    <dd className="font-medium text-foreground">{formatDate(ch.availableUntil)}</dd>
                  </div>
                )}
              </>
            )}
            {ch && (
              <div>
                <dt className="text-muted-foreground">Random order</dt>
                <dd className="font-medium text-foreground">{ch.randomOrder !== false ? "Yes" : "No"}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-6">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            Share link
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Share this link with students. They will see the chapter and time limit above.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2 py-1.5 text-sm text-foreground break-all">{testLink || "…"}</code>
            <button
              type="button"
              onClick={() => testLink && navigator.clipboard?.writeText(testLink).then(() => alert("Link copied to clipboard."))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <a
              href={testLink || "/"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Open test
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-4 flex justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
              Test Results
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportResultsCsv}
                disabled={results.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                Export CSV
              </button>
                <button
                  type="button"
                  onClick={() => config?.chapterId && fetchResults(config.chapterId)}
                  disabled={resultsLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={resultsLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh
              </button>
            </div>
          </div>
          {results.length === 0 && !resultsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No submissions yet. Students will appear here after they complete the quiz and enter their name.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Score</th>
                    <th className="pb-3 pr-4 font-medium">Correct</th>
                    <th className="pb-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedResult(r)}
                      className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">{r.studentName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.email ?? "—"}</td>
                      <td className="py-3 pr-4">{r.score}%</td>
                      <td className="py-3 pr-4">{r.correctCount} / {r.total}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(r.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isEnded && ch?.questions && ch.questions.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
              Answer distribution
            </h3>
            <div className="space-y-8">
              {ch.questions.map((q, idx) => {
                const total = results.length;
                const optionCounts = [0, 1, 2, 3].map((optIndex) =>
                  total === 0 ? 0 : results.filter((r) => r.answers[q.id] === optIndex).length
                );
                const noAnswerCount =
                  total === 0 ? 0 : results.filter((r) => r.answers[q.id] == null || typeof r.answers[q.id] !== "number").length;
                const labels = ["A", "B", "C", "D"];
                return (
                  <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="mb-3 font-medium text-foreground">
                      {idx + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => {
                        const count = optionCounts[optIndex] ?? 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const isCorrect = optIndex === q.correctAnswerIndex;
                        return (
                          <div key={optIndex} className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-block min-w-[2rem] rounded px-2 py-0.5 text-sm font-medium ${isCorrect ? "bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200" : "bg-muted text-foreground"}`}
                            >
                              {labels[optIndex]}.
                            </span>
                            <span className="flex-1 text-sm text-foreground">{opt || "(empty)"}</span>
                            <span className="text-sm font-medium text-muted-foreground">
                              {count} / {total} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                        <span className="inline-block min-w-[2rem] rounded px-2 py-0.5 text-sm font-medium bg-muted text-muted-foreground">
                          —
                        </span>
                        <span className="flex-1 text-sm text-muted-foreground">No answer</span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {noAnswerCount} / {total} ({total > 0 ? Math.round((noAnswerCount / total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {selectedResult && (
        <ResultDetailModal
          result={selectedResult}
          formatDateShort={formatDateShort}
          formatDuration={formatDuration}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}

function ResultDetailModal({
  result,
  formatDateShort,
  formatDuration,
  onClose,
}: {
  result: QuizResult;
  formatDateShort: (iso: string) => string;
  formatDuration: (seconds?: number) => string;
  onClose: () => void;
}) {
  const incorrectCount = result.total - result.correctCount;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (result.score / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-gray-900">{result.studentName}</h3>
              <dl className="mt-3 space-y-1 text-sm">
                {result.email != null && result.email !== "" && (
                  <div>
                    <dt className="text-gray-500">Email</dt>
                    <dd className="font-medium text-gray-900">{result.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Points</dt>
                  <dd className="font-medium text-gray-900">{result.correctCount} / {result.total}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-medium text-gray-900">{formatDuration(result.durationSeconds)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date</dt>
                  <dd className="font-medium text-gray-900">{formatDateShort(result.submittedAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="shrink-0">
              <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="text-green-500 transition-all duration-500" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-green-600">{result.score}%</span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Answers</h4>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-900">Correct <span className="font-medium">{result.correctCount}</span></span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-900">Incorrect <span className="font-medium">{incorrectCount}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
