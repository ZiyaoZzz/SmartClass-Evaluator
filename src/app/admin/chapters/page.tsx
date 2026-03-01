"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, LogOut, Loader2, ArrowLeft, FolderOpen, Plus, Pencil, Trash2, ArrowRightCircle,
} from "lucide-react";

type Chapter = {
  id: string;
  name: string;
  questions: { id: string }[];
  createdAt: string;
};

export default function AdminChaptersPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [user, setUser] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [newChapterModalOpen, setNewChapterModalOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [editChapterNameId, setEditChapterNameId] = useState<string | null>(null);
  const [editChapterNameValue, setEditChapterNameValue] = useState("");

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

  useEffect(() => {
    if (authState === "unauthenticated") {
      router.replace("/admin");
      return;
    }
    if (authState === "authenticated") fetchChapters();
  }, [authState, router, fetchChapters]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin");
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
              <h1 className="text-lg font-semibold text-foreground">Chapter Management</h1>
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
        <div className="relative rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FolderOpen className="h-5 w-5 text-primary" />
              Chapters & Quiz Bank
            </h3>
            <button
              type="button"
              onClick={() => { setNewChapterName(""); setNewChapterModalOpen(true); }}
              className="shrink-0 cursor-pointer rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              New chapter
            </button>
          </div>
          {chaptersLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading chapters…</p>
          ) : chapters.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No chapters yet. Create one to add quiz questions.</p>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
                >
                  {editChapterNameId === ch.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editChapterNameValue}
                        onChange={(e) => setEditChapterNameValue(e.target.value)}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`/api/chapters/${ch.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ name: editChapterNameValue.trim() || ch.name }),
                          });
                          if (res.ok) { setEditChapterNameId(null); fetchChapters(); }
                        }}
                        className="text-sm font-medium text-primary"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditChapterNameId(null)} className="text-sm text-muted-foreground">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">{ch.name}</span>
                        <span className="text-sm text-muted-foreground">{ch.questions.length} questions</span>
                        <button
                          type="button"
                          onClick={() => { setEditChapterNameId(ch.id); setEditChapterNameValue(ch.name); }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/chapters/${ch.id}`}
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-sm hover:bg-muted"
                        >
                          <ArrowRightCircle className="h-4 w-4" />
                          Manage
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete chapter "${ch.name}" and all its questions?`)) return;
                            const res = await fetch(`/api/chapters/${ch.id}`, { method: "DELETE", credentials: "include" });
                            if (res.ok) fetchChapters();
                          }}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {chapters.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Click Manage to edit questions and settings. In Setup test you choose which chapter to use for the student quiz.
            </p>
          )}
        </div>
      </main>

      {newChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNewChapterModalOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-4 font-semibold text-foreground">New chapter</h4>
            <input
              type="text"
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              placeholder="Chapter name"
              className="mb-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewChapterModalOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/chapters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name: newChapterName.trim() || "Untitled" }),
                  });
                  if (res.ok) { setNewChapterModalOpen(false); setNewChapterName(""); fetchChapters(); }
                }}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
