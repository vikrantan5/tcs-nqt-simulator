import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Mail,
  FileText,
  BookOpen,
  Trophy,
  AlertTriangle,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  full: "Full Mock",
  fill_blank: "Fill in the Blanks",
  passage_recall: "Passage Recall",
  email_writing: "Email Writing",
};

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

  const testType: string = attempt.test_type || "full";
  const showFB = testType === "full" || testType === "fill_blank";
  const showPS = testType === "full" || testType === "passage_recall";
  const showEM = testType === "full" || testType === "email_writing";

  const { data: fbAnswers } = showFB
    ? await supabase
        .from("fill_blank_answers")
        .select("*")
        .eq("attempt_id", attemptId)
        .order("question_index")
    : { data: [] as any[] };

  const { data: psAnswers } = showPS
    ? await supabase
        .from("passage_answers")
        .select("*")
        .eq("attempt_id", attemptId)
        .order("passage_index")
    : { data: [] as any[] };

  const { data: emAnswers } = showEM
    ? await supabase
        .from("email_answers")
        .select("*")
        .eq("attempt_id", attemptId)
        .limit(1)
        .maybeSingle()
    : { data: null as any };

  const fbCorrect = (fbAnswers || []).filter((a: any) => a.is_correct).length;

  const retakeHref =
    testType === "fill_blank"
      ? "/exam/section1?mode=solo"
      : testType === "passage_recall"
      ? "/exam/section2?mode=solo"
      : testType === "email_writing"
      ? "/exam/section3?mode=solo"
      : "/exam/section1";

  return (
    <div className="min-h-screen bg-grid">
      <header className="container py-6 flex items-center justify-between">
        <Link href="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Dashboard</Button></Link>
        <Link href={retakeHref}><Button size="sm" data-testid="retake-button">Retake test <ArrowRight className="h-4 w-4" /></Button></Link>
      </header>

      <main className="container pb-20 max-w-5xl">
        <div className="mt-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Your Results</h1>
          <span className="ml-2 text-xs uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1">
            {TYPE_LABEL[testType] || "Mock"}
          </span>
        </div>

        <Card className="mt-8 border-primary/40">
          <CardContent className="p-8 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Overall Score</div>
            <div className="font-display text-7xl font-bold mt-3" data-testid="total-score">{attempt.total_score}</div>
            <div className="text-sm text-muted-foreground mt-1">/ 100</div>
            <Progress value={attempt.total_score} className="mt-6" />
          </CardContent>
        </Card>

        {/* Section breakdown — only show the sections that were attempted */}
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          {showFB && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">{fbCorrect} / {fbAnswers?.length || 0} correct</span>
                </div>
                <div className="font-display text-3xl font-bold mt-4">{attempt.fill_blank_score}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Fill in the Blanks</div>
                <Progress value={attempt.fill_blank_score} className="mt-3 h-1" />
              </CardContent>
            </Card>
          )}
          {showPS && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">{psAnswers?.length || 0} passages</span>
                </div>
                <div className="font-display text-3xl font-bold mt-4">{attempt.passage_score}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Passage Recall</div>
                <Progress value={attempt.passage_score} className="mt-3 h-1" />
              </CardContent>
            </Card>
          )}
          {showEM && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {emAnswers?.word_count ? `${emAnswers.word_count} words` : "Not submitted"}
                  </span>
                </div>
                <div className="font-display text-3xl font-bold mt-4">{attempt.email_score}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Email Writing</div>
                <Progress value={attempt.email_score} className="mt-3 h-1" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Passage Recall feedback */}
        {showPS && psAnswers && psAnswers.length > 0 && (
          <Card className="mt-6" data-testid="passage-review">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Passage Recall Review
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Your answer vs. the AI evaluation, side-by-side. Use the missing points to improve.</p>
              <div className="space-y-6 mt-5">
                {psAnswers.map((p: any, i: number) => {
                  const ev = p.evaluation || {};
                  return (
                    <div key={p.id} className="rounded-lg border border-border bg-background/40 p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-widest text-primary">Passage {i + 1}</div>
                        <div className="text-sm">
                          Score <span className="font-display text-lg font-bold ml-1">{p.score ?? 0}</span>
                          <span className="text-muted-foreground"> / 100</span>
                        </div>
                      </div>
                      {p.passage && (
                        <details className="mt-3 group">
                          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">Show original passage</summary>
                          <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{p.passage}</p>
                        </details>
                      )}

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">Your Recall</div>
                          <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{p.recall_text || <span className="text-muted-foreground italic">(empty)</span>}</p>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-success">Ideal Paraphrase</div>
                          <p className="text-sm mt-2 leading-relaxed text-muted-foreground">{ev.ideal_paraphrase || "—"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">
                        {[
                          { k: "meaning_score", label: "Meaning" },
                          { k: "key_points_score", label: "Key Points" },
                          { k: "vocabulary_score", label: "Vocabulary" },
                          { k: "grammar_score", label: "Grammar" },
                          { k: "coherence_score", label: "Coherence" },
                        ].map((m) => (
                          <div key={m.k} className="rounded-md border border-border p-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                            <div className="font-display text-base font-bold mt-1">{ev[m.k] ?? 0}</div>
                          </div>
                        ))}
                      </div>

                      {Array.isArray(ev.missing_points) && ev.missing_points.length > 0 && (
                        <div className="mt-5">
                          <div className="text-xs uppercase tracking-widest text-warning flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" /> Mistakes / Missing points
                          </div>
                          <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                            {ev.missing_points.map((m: string, j: number) => <li key={j}>{m}</li>)}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(ev.feedback) && ev.feedback.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                            <Lightbulb className="h-3 w-3" /> Feedback
                          </div>
                          <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                            {ev.feedback.map((m: string, j: number) => <li key={j}>{m}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email feedback */}
        {showEM && emAnswers?.evaluation && (
          <Card className="mt-6" data-testid="email-review">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Email Writing Review</h2>
              <p className="text-sm text-muted-foreground mt-1">Your draft vs. an ideal response, side-by-side. Use weaknesses & suggestions to improve.</p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                {["professionalism", "structure", "grammar", "clarity", "communication"].map((k) => (
                  <div key={k} className="rounded-md border border-border p-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className="font-display text-xl font-bold mt-1">{(emAnswers.evaluation as any)[k] ?? 0}</div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="rounded-lg border border-border p-4 bg-background/40">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Your Email</div>
                  <pre className="text-sm mt-2 leading-relaxed whitespace-pre-wrap font-sans">{emAnswers.email_text || <span className="text-muted-foreground italic">(empty)</span>}</pre>
                </div>
                <div className="rounded-lg border border-border p-4 bg-background/40">
                  <div className="text-xs uppercase tracking-widest text-success">Ideal Email</div>
                  <pre className="text-sm mt-2 leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">{(emAnswers.evaluation as any).ideal_email || "—"}</pre>
                </div>
              </div>

              {(emAnswers.evaluation as any).strengths?.length ? (
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-success flex items-center gap-2"><Sparkles className="h-3 w-3" /> Strengths</div>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    {(emAnswers.evaluation as any).strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              ) : null}

              {(emAnswers.evaluation as any).weaknesses?.length ? (
                <div className="mt-5">
                  <div className="text-xs uppercase tracking-widest text-destructive flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Mistakes / Weaknesses</div>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    {(emAnswers.evaluation as any).weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              ) : null}

              {(emAnswers.evaluation as any).suggestions?.length ? (
                <div className="mt-5">
                  <div className="text-xs uppercase tracking-widest text-warning flex items-center gap-2"><Lightbulb className="h-3 w-3" /> Suggestions</div>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    {(emAnswers.evaluation as any).suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Fill blank review */}
        {showFB && fbAnswers?.length ? (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Fill in the Blanks Review</h2>
              <p className="text-sm text-muted-foreground mt-1">Synonyms that fit the context are accepted.</p>
              <div className="divide-y divide-border mt-4">
                {fbAnswers.map((a: any, i: number) => (
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
