"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, FileUp } from "lucide-react";

type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
};

type Chapter = {
  id: string;
  name: string;
  questions: QuizQuestion[];
  createdAt: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  randomOrder?: boolean;
};

export default function ChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [questionModal, setQuestionModal] = useState<{ question?: QuizQuestion } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; failed: number } | null>(null);

  const fetchChapter = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${id}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (res.status === 404) {
        setChapter(null);
        return;
      }
      const data = await res.json();
      setChapter(data);
      setNameValue(data.name ?? "");
    } catch {
      setChapter(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  async function saveChapterName() {
    if (!chapter || !nameValue.trim()) return;
    const res = await fetch(`/api/chapters/${chapter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: nameValue.trim() }),
    });
    if (res.ok) {
      setChapter((c) => (c ? { ...c, name: nameValue.trim() } : null));
      setEditName(false);
    }
  }

  async function deleteChapter() {
    if (!chapter || !confirm(`Delete chapter "${chapter.name}" and all its questions?`)) return;
    const res = await fetch(`/api/chapters/${chapter.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) router.push("/admin");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!chapter) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">Chapter not found.</p>
        <Link href="/admin" className="text-primary underline">Back to admin</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-lg font-semibold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveChapterName}
                  className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                >
                  Save
                </button>
                <button type="button" onClick={() => { setEditName(false); setNameValue(chapter.name); }} className="shrink-0 text-sm text-muted-foreground">Cancel</button>
              </div>
            ) : (
              <h1 className="truncate text-xl font-semibold text-foreground">{chapter.name}</h1>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!editName && (
              <button
                type="button"
                onClick={() => { setEditName(true); setNameValue(chapter.name); }}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <Pencil className="mr-1.5 inline h-4 w-4" />
                Edit name
              </button>
            )}
            <button
              type="button"
              onClick={deleteChapter}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
            >
              <Trash2 className="mr-1.5 inline h-4 w-4" />
              Delete chapter
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Questions ({chapter.questions.length})</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setImportResult(null); setImportModalOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <FileUp className="h-4 w-4" />
                Import from CSV
              </button>
              <button
                type="button"
                onClick={() => setQuestionModal({})}
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add question
              </button>
            </div>
          </div>
          {chapter.questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No questions yet. Add one to get started.</p>
          ) : (
            <div className="space-y-4">
              {chapter.questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{i + 1}. {q.question}</p>
                      <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                        Correct answer: {q.options[q.correctAnswerIndex] ?? ""}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, j) => (
                          <li
                            key={j}
                            className={`rounded px-2 py-1 text-sm ${j === q.correctAnswerIndex ? "bg-green-100 font-medium text-gray-900 dark:bg-green-500/20 dark:text-gray-900" : "text-muted-foreground"}`}
                          >
                            {String.fromCharCode(65 + j)}. {opt || "(empty)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setQuestionModal({ question: q })}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Delete this question?")) return;
                          const res = await fetch(`/api/chapters/${chapter.id}/questions/${q.id}`, { method: "DELETE", credentials: "include" });
                          if (res.ok) fetchChapter();
                        }}
                        className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {questionModal && (
        <QuestionFormModal
          chapterId={chapter.id}
          initial={questionModal.question}
          onClose={() => setQuestionModal(null)}
          onSaved={() => { setQuestionModal(null); fetchChapter(); }}
        />
      )}

      {importModalOpen && (
        <ImportCsvModal
          chapterId={chapter.id}
          onClose={() => { setImportModalOpen(false); setImportResult(null); }}
          onDone={(result) => { setImportResult(result); fetchChapter(); }}
        />
      )}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') { field += '"'; i++; }
          else break;
        } else { field += line[i]; i++; }
      }
      out.push(field);
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") { field += line[i]; i++; }
      out.push(field.trim());
      if (line[i] === ",") i++;
    }
  }
  return out;
}

function parseCsvToQuestions(csvText: string): { question: string; options: [string, string, string, string]; correctAnswerIndex: number }[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const qIdx = header.findIndex((h) => h === "question" || h === "q");
  const aIdx = header.findIndex((h) => h === "a" || h === "optiona" || h === "option1");
  const bIdx = header.findIndex((h) => h === "b" || h === "optionb" || h === "option2");
  const cIdx = header.findIndex((h) => h === "c" || h === "optionc" || h === "option3");
  const dIdx = header.findIndex((h) => h === "d" || h === "optiond" || h === "option4");
  const correctIdx = header.findIndex((h) => h === "correct" || h === "answer" || h === "key");
  if (qIdx === -1 || correctIdx === -1) return [];
  const optIndices = [aIdx, bIdx, cIdx, dIdx].filter((i) => i !== -1);
  if (optIndices.length < 4) return [];

  const questions: { question: string; options: [string, string, string, string]; correctAnswerIndex: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const question = (row[qIdx] ?? "").trim();
    if (!question) continue;
    const opts: [string, string, string, string] = [
      (row[aIdx] ?? "").trim(),
      (row[bIdx] ?? "").trim(),
      (row[cIdx] ?? "").trim(),
      (row[dIdx] ?? "").trim(),
    ];
    let correct = (row[correctIdx] ?? "").trim().toUpperCase();
    let correctIndex = 0;
    if (correct === "A" || correct === "1") correctIndex = 0;
    else if (correct === "B" || correct === "2") correctIndex = 1;
    else if (correct === "C" || correct === "3") correctIndex = 2;
    else if (correct === "D" || correct === "4") correctIndex = 3;
    questions.push({ question, options: opts, correctAnswerIndex: correctIndex });
  }
  return questions;
}

function ImportCsvModal({
  chapterId,
  onClose,
  onDone,
}: {
  chapterId: string;
  onClose: () => void;
  onDone: (result: { added: number; failed: number }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) { setError("Select a CSV file"); return; }
    setError("");
    setImporting(true);
    let added = 0;
    let failed = 0;
    try {
      const text = await file.text();
      const questions = parseCsvToQuestions(text);
      if (questions.length === 0) {
        setError("No valid questions found. Check CSV format: header with question, A, B, C, D, correct.");
        setImporting(false);
        return;
      }
      for (const q of questions) {
        const res = await fetch(`/api/chapters/${chapterId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
          }),
        });
        if (res.ok) added++;
        else failed++;
      }
      onDone({ added, failed });
      if (failed > 0) setError(`Imported ${added} questions. ${failed} failed.`);
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h4 className="mb-2 font-semibold text-foreground">Import from CSV</h4>
        <p className="mb-4 text-xs text-muted-foreground">
          CSV must have a header row with columns: <strong>question</strong>, <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, <strong>D</strong>, <strong>correct</strong>. The correct column can be A/B/C/D or 1/2/3/4.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }}
          className="mb-4 block w-full text-sm"
        />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || importing}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionFormModal({
  chapterId,
  initial,
  onClose,
  onSaved,
}: {
  chapterId: string;
  initial?: QuizQuestion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial?.options ?? ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState(initial?.correctAnswerIndex ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        const res = await fetch(`/api/chapters/${chapterId}/questions/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: question.trim(), options, correctAnswerIndex: correctIndex }),
        });
        if (res.ok) onSaved();
      } else {
        const res = await fetch(`/api/chapters/${chapterId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: question.trim() || "Question", options, correctAnswerIndex: correctIndex }),
        });
        if (res.ok) onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h4 className="mb-4 font-semibold text-foreground">{initial ? "Edit question" : "Add question"}</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              placeholder="Question text"
              required
            />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <label className="mb-1 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                />
                {String.fromCharCode(65 + i)}
              </label>
              <input
                type="text"
                value={options[i]}
                onChange={(e) => {
                  const next = [...options] as [string, string, string, string];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {saving ? "Saving…" : initial ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
