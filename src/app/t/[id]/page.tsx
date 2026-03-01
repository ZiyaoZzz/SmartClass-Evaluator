import { QuizAssessment } from "@/components/QuizAssessment";

export default async function TestLinkPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <main className="min-h-screen">
      <QuizAssessment />
    </main>
  );
}
