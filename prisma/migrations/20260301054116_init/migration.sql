-- CreateTable
CREATE TABLE "QuizSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER,
    "email" TEXT,
    "chapterId" TEXT
);

-- CreateIndex
CREATE INDEX "QuizSubmission_chapterId_idx" ON "QuizSubmission"("chapterId");

-- CreateIndex
CREATE INDEX "QuizSubmission_submittedAt_idx" ON "QuizSubmission"("submittedAt");
