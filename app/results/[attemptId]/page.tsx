import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Mail, FileText, BookOpen, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempt } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) notFound();

  const { data: fbAnswers } = await supabase
    .from("fill_blank_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("question_index");

  const { data: psAnswers } = await supabase
    .from("passage_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("passage_index");

  const { data: emAnswers } = await supabase
    .from("email_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .limit(1)
    .maybeSingle();

  const fbCorrect = (fbAnswers || []).filter((a) => a.is_correct).length;

  return (
    <div className="min-h-screen bg-grid">
      <header className="container py-6 flex items-center justify-between">
        <Link href="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Dashboard</Button></Link>
        <Link href="/exam/section1"><Button size="sm">Retake exam <ArrowRight className="h-4 w-4" /></Button></Link>
      </header>

      <main className="container pb-20 max-w-5xl">
        <div className="mt-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Your Results</h1>
        </div>

        <Card className="mt-8 border-primary/40">
          <CardContent className="p-8 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Overall Score</div>
            <div className="font-display text-7xl font-bold mt-3" data-testid="total-score">{attempt.total_score}</div>
            <div className="text-sm text-muted-foreground mt-1">/ 100</div>
            <Progress value={attempt.total_score} className="mt-6" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          {[
            { icon: FileText, label: "Fill in the Blanks", score: attempt.fill_blank_score, meta: `${fbCorrect} / ${fbAnswers?.length || 0} correct` },
            { icon: BookOpen, label: "Passage Recall", score: attempt.passage_score, meta: `${psAnswers?.length || 0} passages` },
            { icon: Mail, label: "Email Writing", score: attempt.email_score, meta: emAnswers?.word_count ? `${emAnswers.word_count} words` : "Not submitted" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.meta}</span>
                </div>
                <div className="font-display text-3xl font-bold mt-4">{s.score}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
                <Progress value={s.score} className="mt-3 h-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Email feedback */}
        {emAnswers?.evaluation && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Email Feedback</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                {["professionalism", "structure", "grammar", "clarity", "communication"].map((k) => (
                  <div key={k} className="rounded-md border border-border p-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className="font-display text-xl font-bold mt-1">{(emAnswers.evaluation as any)[k] ?? 0}</div>
                  </div>
                ))}
              </div>
              {(emAnswers.evaluation as any).strengths?.length ? (
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-success">Strengths</div>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    {(emAnswers.evaluation as any).strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              ) : null}
              {(emAnswers.evaluation as any).suggestions?.length ? (
                <div className="mt-5">
                  <div className="text-xs uppercase tracking-widest text-warning">Suggestions</div>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    {(emAnswers.evaluation as any).suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Fill blank review */}
        {fbAnswers?.length ? (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Fill in the Blanks Review</h2>
              <div className="divide-y divide-border mt-4">
                {fbAnswers.map((a, i) => (
                  <div key={a.id} className="py-3 flex items-start gap-3">
                    {a.is_correct ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                    <div className="flex-1 text-sm">
                      <div>{i + 1}. {a.question}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Your answer: <span className={a.is_correct ? "text-success" : "text-destructive"}>{a.user_answer || "—"}</span>
                        {!a.is_correct && <> · Correct: <span className="text-success">{a.correct_answer}</span></>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
