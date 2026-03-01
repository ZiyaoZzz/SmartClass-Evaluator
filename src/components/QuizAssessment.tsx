"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  Lock,
} from "lucide-react";
import type { QuizQuestion } from "@/data/quiz-data";

const QUIZ_TITLE = "CogniGrade-AI Assessment";
const DEFAULT_TIME_SECONDS = 600; // 10 minutes

export function QuizAssessment() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(DEFAULT_TIME_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [requiredFields, setRequiredFields] = useState<{ name?: boolean; email?: boolean }>({});
  const [requireAccessCode, setRequireAccessCode] = useState(false);
  const [testNotAvailable, setTestNotAvailable] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const loadQuestions = useCallback(() => {
    setQuestionsLoading(true);
    setAccessCodeError("");
    fetch("/api/quiz/questions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = data?.questions ?? [];
        const needCode = data?.requireAccessCode === true && (!list || list.length === 0);
        const notAvailable = data?.testNotAvailable === true;
        setRequireAccessCode(!!needCode && !notAvailable);
        setTestNotAvailable(!!notAvailable);
        setQuestions(needCode || notAvailable ? [] : list);
        const limit = typeof data?.timeLimitSeconds === "number" ? data.timeLimitSeconds : DEFAULT_TIME_SECONDS;
        setTimeLimitSeconds(limit);
        setTimeLeft(limit);
        setRequiredFields(data?.requiredFields ?? {});
      })
      .catch(() => { setQuestions([]); setRequireAccessCode(false); })
      .finally(() => setQuestionsLoading(false));
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Countdown timer
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    const unansweredCount = questions.filter((q) => answers[q.id] == null).length;
    if (unansweredCount > 0 && !confirm(`You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`)) return;
    setSubmitted(true);
  }, [questions, answers]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFlag = (id: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  if (questionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-muted-foreground">Loading quiz…</div>
      </div>
    );
  }
  if (requireAccessCode && totalQuestions === 0) {
    return (
      <AccessCodeScreen
        accessCode={accessCode}
        onAccessCodeChange={(v) => { setAccessCode(v); setAccessCodeError(""); }}
        error={accessCodeError}
        onConfirm={async () => {
          const code = accessCode.trim();
          if (!code) { setAccessCodeError("Please enter the access code."); return; }
          setAccessCodeError("");
          try {
            const res = await fetch("/api/quiz/verify-access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (data?.success) {
              loadQuestions();
            } else {
              setAccessCodeError(data?.error || "Invalid access code.");
            }
          } catch {
            setAccessCodeError("Something went wrong. Please try again.");
          }
        }}
      />
    );
  }
  if (testNotAvailable) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Test not available</h2>
          <p className="text-muted-foreground">
            This test is not open at this time. It may have ended or not yet started. Please check with your instructor.
          </p>
        </div>
      </div>
    );
  }
  if (totalQuestions === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-muted-foreground">No quiz available yet.</div>
      </div>
    );
  }

  if (submitted && !nameConfirmed) {
    const needName = requiredFields.name !== false;
    const needEmail = !!requiredFields.email;
    const canConfirm =
      (needName ? !!studentName.trim() : true) && (needEmail ? !!email.trim() : true);
    const displayName = studentName.trim() || "—";
    return (
      <NameEntryScreen
        requiredFields={requiredFields}
        studentName={studentName}
        onNameChange={setStudentName}
        email={email}
        onEmailChange={setEmail}
        onConfirm={async () => {
          if (!canConfirm) return;
          const durationSeconds = timeLimitSeconds - timeLeft;
          setSubmitError("");
          try {
            const res = await fetch("/api/quiz/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentName: displayName,
                email: email.trim() || undefined,
                answers,
                durationSeconds,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setSubmitError(data?.error || "Submission failed.");
              return;
            }
            setStudentName(displayName);
            setNameConfirmed(true);
          } catch {
            setSubmitError("Submission failed. Please try again.");
          }
        }}
        canConfirm={!!canConfirm}
        submitError={submitError}
      />
    );
  }

  if (submitted && nameConfirmed) {
    return (
      <ResultSummary
        questions={questions}
        answers={answers}
        studentName={studentName.trim() || "—"}
        onRestart={() => {
          setSubmitted(false);
          setNameConfirmed(false);
          setStudentName("");
          setAnswers({});
          setFlagged(new Set());
          setCurrentIndex(0);
          setTimeLeft(timeLimitSeconds);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Top bar on mobile, sidebar on desktop */}
      <aside className="w-full border-b border-border bg-card md:w-72 md:border-b-0 md:border-r md:shadow-sm">
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span
              className={`font-mono text-sm font-medium ${
                timeLeft <= 60 ? "text-red-600" : "text-foreground"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {currentIndex + 1} / {totalQuestions}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setReviewMode(!reviewMode)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                reviewMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Flag className="h-4 w-4" />
              Review mode
            </button>
          </div>

          {reviewMode && (
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToQuestion(i)}
                  className={`flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                    currentIndex === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : answers[q.id] !== undefined
                        ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-border bg-muted/50 hover:bg-muted"
                  } ${flagged.has(q.id) ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
                  title={flagged.has(q.id) ? "Flagged" : `Question ${i + 1}`}
                >
                  {i + 1}
                  {flagged.has(q.id) && (
                    <Flag className="ml-0.5 h-3 w-3 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col p-4 md:p-8">
        <div className="mx-auto w-full max-w-2xl">
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
            selectedIndex={answers[currentQuestion.id]}
            onSelect={(index) => setAnswer(currentQuestion.id, index)}
            isFlagged={flagged.has(currentQuestion.id)}
            onToggleFlag={() => toggleFlag(currentQuestion.id)}
          />

          <nav className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Submit
                <Send className="h-4 w-4" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  onSelect,
  isFlagged,
  onToggleFlag,
}: {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedIndex: number | undefined;
  onSelect: (index: number) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
        <button
          type="button"
          onClick={onToggleFlag}
          className={`rounded-lg border p-2 transition-colors ${
            isFlagged
              ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={isFlagged ? "Unflag for review" : "Flag for review"}
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>
      <h2 className="mb-6 text-lg font-medium leading-snug text-foreground md:text-xl">
        {question.question}
      </h2>
      <ul className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm font-medium text-foreground md:text-base">
                  {option}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function AccessCodeScreen({
  accessCode,
  onAccessCodeChange,
  error,
  onConfirm,
}: {
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  error: string;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Access code
        </h2>
        <p className="mb-6 text-muted-foreground">
          Enter the access code provided by your instructor to start the exam.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        <label htmlFor="access-code" className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Access code <span className="text-red-500">*</span>
        </label>
        <input
          id="access-code"
          type="password"
          value={accessCode}
          onChange={(e) => onAccessCodeChange(e.target.value)}
          placeholder="Enter access code"
          autoComplete="one-time-code"
          className="mb-6 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={!accessCode.trim()}
          className="w-full rounded-lg border border-primary bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function NameEntryScreen({
  requiredFields,
  studentName,
  onNameChange,
  email,
  onEmailChange,
  onConfirm,
  canConfirm,
  submitError,
}: {
  requiredFields: { name?: boolean; email?: boolean };
  studentName: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onConfirm: () => void;
  canConfirm: boolean;
  submitError?: string;
}) {
  const needName = requiredFields.name !== false;
  const needEmail = !!requiredFields.email;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Quiz complete
        </h2>
        <p className="mb-6 text-muted-foreground">
          Please enter your details to view your results.
        </p>
        {submitError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {submitError}
          </p>
        )}
        <div className="space-y-4">
          {needName && (
            <div>
              <label htmlFor="student-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                Name {needName && <span className="text-red-500">*</span>}
              </label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}
          {needEmail && (
            <div>
              <label htmlFor="email" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Email"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="mt-6 w-full rounded-lg border border-primary bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          View results
        </button>
      </div>
    </div>
  );
}

function ResultSummary({
  questions,
  answers,
  studentName,
  onRestart,
}: {
  questions: QuizQuestion[];
  answers: Record<string, number>;
  studentName: string;
  onRestart: () => void;
}) {
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctAnswerIndex
  ).length;
  const score = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 md:py-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="mb-2 text-2xl font-semibold text-foreground">
          Results
        </h2>
        <p className="mb-6 text-muted-foreground">
          {studentName} · {QUIZ_TITLE}
        </p>

        <div className="mb-8 flex items-center justify-center rounded-xl bg-muted/50 py-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary md:text-5xl">
              {score}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {correctCount} of {questions.length} correct
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correctAnswerIndex;
            const hasAnswered = userAnswer !== undefined;
            return (
              <li
                key={q.id}
                className="rounded-lg border border-border bg-muted/20 p-4"
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : hasAnswered ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  ) : (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40 text-xs">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {i + 1}. {q.question}
                    </p>
                    {hasAnswered ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your answer: {q.options[userAnswer]}
                        {!isCorrect && (
                          <>
                            {" · "}
                            <span className="text-green-600 dark:text-green-400">
                              Correct: {q.options[q.correctAnswerIndex]}
                            </span>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        Not answered · Correct: {q.options[q.correctAnswerIndex]}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
