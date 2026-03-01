"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, LogOut, Loader2, ClipboardList, ArrowLeft, Link2, Copy,
  X, Settings,
} from "lucide-react";

type Chapter = {
  id: string;
  name: string;
  questions: { id: string }[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  randomOrder?: boolean;
};

export default function AdminSetupPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [user, setUser] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [origin, setOrigin] = useState("");
  const [quizConfig, setQuizConfig] = useState<{
    chapterId: string;
    timeLimitMinutes: number;
    requiredFields?: { name?: boolean; email?: boolean };
    accessPassword?: string;
    testLinkId?: string;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [setupChapterId, setSetupChapterId] = useState("");
  const [setupTimeLimitMinutes, setSetupTimeLimitMinutes] = useState(10);
  const [requireName, setRequireName] = useState(true);
  const [requireEmail, setRequireEmail] = useState(false);
  const [startTestSubmitting, setStartTestSubmitting] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [essentialAvailableFrom, setEssentialAvailableFrom] = useState("");
  const [essentialAvailableUntil, setEssentialAvailableUntil] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [testLinkModalOpen, setTestLinkModalOpen] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const testLink = origin && quizConfig?.testLinkId ? `${origin}/t/${quizConfig.testLinkId}` : "";

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

  const fetchChapters = useCallback(async () => {
    setChaptersLoading(true);
    try {
      const res = await fetch("/api/chapters", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setChapters(data.chapters ?? []);
      }
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  const fetchQuizConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/quiz/config", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setQuizConfig({
          chapterId: data.chapterId ?? "",
          timeLimitMinutes: data.timeLimitMinutes ?? 10,
          requiredFields: data.requiredFields ?? {},
          accessPassword: data.accessPassword,
          testLinkId: data.testLinkId,
        });
        if (data.chapterId) setSetupChapterId(data.chapterId);
        const rf = data.requiredFields;
        if (rf && typeof rf === "object") {
          setRequireName(rf.name !== false);
          setRequireEmail(!!rf.email);
        }
        setAccessPassword(data.accessPassword ?? "");
      }
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState === "unauthenticated") {
      router.replace("/admin");
      return;
    }
    if (authState === "authenticated") {
      fetchChapters();
      fetchQuizConfig();
    }
  }, [authState, router, fetchChapters, fetchQuizConfig]);

  useEffect(() => {
    if (!configLoading && chapters.length > 0 && !setupChapterId) {
      setSetupChapterId(chapters[0].id);
      setSetupTimeLimitMinutes(Math.max(1, chapters[0].questions.length));
    }
  }, [configLoading, chapters, setupChapterId]);

  useEffect(() => {
    if (configLoading || chapters.length === 0 || !setupChapterId) return;
    const ch = chapters.find((c) => c.id === setupChapterId);
    if (ch) {
      setSetupTimeLimitMinutes(Math.max(1, ch.questions.length));
      // Do not load calendar from chapter — times are only for the current Start test and are not reused for the next test
      setEssentialAvailableFrom("");
      setEssentialAvailableUntil("");
    }
  }, [configLoading, chapters.length, setupChapterId]);

  async function updateChapterSetting(updates: { randomOrder?: boolean }) {
    if (!setupChapterId) return;
    const res = await fetch(`/api/chapters/${setupChapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setChapters((prev) => prev.map((c) => (c.id === setupChapterId ? { ...c, ...data } : c)));
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin");
  }

  async function handleStartTest(e: React.FormEvent) {
    e.preventDefault();
    setSetupError("");
    if (!setupChapterId) {
      setSetupError("Please select a chapter.");
      return;
    }
    const timeLimitMinutes = Math.max(1, Math.min(120, setupTimeLimitMinutes));
    if (!essentialAvailableFrom.trim() || !essentialAvailableUntil.trim()) {
      setSetupError("Please set 'When can the test be taken?' (Available from and Available until).");
      return;
    }
    const fromDate = new Date(essentialAvailableFrom);
    const untilDate = new Date(essentialAvailableUntil);
    if (untilDate.getTime() <= fromDate.getTime()) {
      setSetupError("Available until must be after Available from.");
      return;
    }
    if (untilDate.getTime() < Date.now()) {
      setSetupError("Available until is in the past; please set a future end time.");
      return;
    }
    setStartTestSubmitting(true);
    try {
      const from = fromDate.toISOString();
      const until = untilDate.toISOString();
      const scheduleRes = await fetch(`/api/chapters/${setupChapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ availableFrom: from, availableUntil: until }),
      });
      if (!scheduleRes.ok) {
        setSetupError("Failed to save schedule.");
        return;
      }
      const res = await fetch("/api/quiz/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chapterId: setupChapterId,
          timeLimitMinutes,
          requiredFields: { name: requireName, email: requireEmail },
          accessPassword: accessPassword.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizConfig({
          chapterId: data.chapterId ?? setupChapterId,
          timeLimitMinutes: data.timeLimitMinutes ?? timeLimitMinutes,
          requiredFields: data.requiredFields ?? {},
          accessPassword: data.accessPassword,
          testLinkId: data.testLinkId,
        });
        setTestLinkModalOpen(true);
      } else {
        setSetupError("Failed to save test config.");
      }
    } finally {
      setStartTestSubmitting(false);
    }
  }

  function handleCopyTestLink() {
    if (!testLink) return;
    navigator.clipboard?.writeText(testLink).then(() => {
      setCopyLinkFeedback(true);
      setTimeout(() => setCopyLinkFeedback(false), 2000);
    });
  }

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Setup test</h1>
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" />
                Set up test
              </p>
              <form onSubmit={handleStartTest} className="space-y-4">
              {setupError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {setupError}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="setup-chapter" className="mb-1.5 block text-xs font-medium text-foreground">Chapter <span className="text-red-500">*</span></label>
                  <select
                    id="setup-chapter"
                    value={setupChapterId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSetupChapterId(id);
                      const ch = chapters.find((c) => c.id === id);
                      if (ch) setSetupTimeLimitMinutes(Math.max(1, ch.questions.length));
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    {chaptersLoading ? (
                      <option value="">Loading…</option>
                    ) : chapters.length === 0 ? (
                      <option value="">No chapters — add some in Chapter Management</option>
                    ) : (
                      chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="setup-time" className="mb-1.5 block text-xs font-medium text-foreground">
                    Time limit (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="setup-time"
                    type="number"
                    min={1}
                    max={120}
                    value={setupTimeLimitMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 1) setSetupTimeLimitMinutes(Math.min(120, v));
                    }}
                    className="w-full max-w-[8rem] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  {setupChapterId && (() => {
                    const ch = chapters.find((c) => c.id === setupChapterId);
                    const qCount = ch?.questions.length ?? 0;
                    if (qCount === 0) return null;
                  })()}
                </div>
              </div>
              {setupChapterId && (() => {
                const selectedChapter = chapters.find((c) => c.id === setupChapterId);
                if (!selectedChapter) return null;
                return (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Settings className="h-4 w-4 text-primary" />
                      Essential settings
                    </h3>
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="mb-2 text-sm font-medium text-foreground">When can the test be taken? <span className="text-red-500">*</span></p>
                        <p className="mb-3 text-xs text-muted-foreground">Required. Set both; they are saved when you click Start test.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Available from</label>
                            <input
                              type="datetime-local"
                              value={essentialAvailableFrom}
                              max={essentialAvailableUntil || undefined}
                              onChange={(e) => setEssentialAvailableFrom(e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Available until</label>
                            <input
                              type="datetime-local"
                              value={essentialAvailableUntil}
                              min={essentialAvailableFrom || undefined}
                              onChange={(e) => setEssentialAvailableUntil(e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>
                        </div>
                        {essentialAvailableUntil && new Date(essentialAvailableUntil).getTime() < Date.now() && (
                          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                            Available until is in the past; the test would already be ended.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Give questions in random order</p>
                          <p className="text-xs text-muted-foreground">Test takers see questions in a different order each time.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={selectedChapter.randomOrder !== false}
                          onClick={() => updateChapterSetting({ randomOrder: selectedChapter.randomOrder === false })}
                          className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedChapter.randomOrder !== false ? "border-primary bg-primary" : "border-border bg-muted"}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${selectedChapter.randomOrder !== false ? "translate-x-6" : "translate-x-1"} mt-0.5`} />
                        </button>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="mb-3 text-xs font-medium text-foreground">Require:</p>
                        <div className="flex flex-col gap-3">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={requireName}
                              onChange={(e) => setRequireName(e.target.checked)}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                            />
                            Name
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={requireEmail}
                              onChange={(e) => setRequireEmail(e.target.checked)}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                            />
                            Email
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-xl border border-border bg-card p-4">
                <label htmlFor="access-password" className="mb-2 block text-sm font-semibold text-foreground">
                  Password
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Optional. If set, test takers must enter this access code to start the exam.
                </p>
                <input
                  id="access-password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={startTestSubmitting || chaptersLoading || chapters.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {startTestSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Start test
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {testLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTestLinkModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Test link</h3>
              <button
                type="button"
                onClick={() => setTestLinkModalOpen(false)}
                className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-600">Here is your link!</p>
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              <code className="break-all text-sm text-gray-900">{testLink || "…"}</code>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyTestLink}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
              >
                <Copy className="h-4 w-4" />
                {copyLinkFeedback ? "Copied!" : "Copy Link"}
              </button>
              {quizConfig?.testLinkId ? (
                <Link
                  href={`/admin/ongoing/${quizConfig.testLinkId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => setTestLinkModalOpen(false)}
                >
                  <BookOpen className="h-4 w-4" />
                  Detail page
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
