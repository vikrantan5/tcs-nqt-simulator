"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore, type EmailQ } from "@/store/exam-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { formatTime, countWords } from "@/lib/utils";
import { Loader2, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

const EMAIL_SECONDS = 540;
const MIN_WORDS = 100;

function Section3Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSolo = searchParams.get("mode") === "solo";

  const {
    setEmailQ,
    setEmailAnswer,
    setAttemptId,
    setTestType,
    attemptId,
    fillBlankAnswers,
    passageAnswers,
    warnings,
    passageQs,
    reset,
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scenario, setScenario] = useState<EmailQ | null>(null);
  const [emailText, setEmailText] = useState("");
  const [timeLeft, setTimeLeft] = useState(EMAIL_SECONDS);
  const tickRef = useRef<NodeJS.Timeout | null>(null);


  
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (isSolo) {
          reset();
          setTestType("email_writing");
          const a = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test_type: "email_writing" }),
          });
          if (!a.ok) throw new Error("Failed to create attempt");
          const aj = await a.json();
          if (cancelled) return;
          setAttemptId(aj.attempt.id);
          var currentAttemptId: string | null = aj.attempt.id;
        } else {
          var currentAttemptId: string | null = attemptId;
        }

        const r = await fetch(currentAttemptId ? `/api/questions/email?attemptId=${currentAttemptId}` : "/api/questions/email");
        if (!r.ok) throw new Error("Failed to load scenario");
        const j = await r.json();
        if (cancelled) return;
        setScenario(j.scenario);
        setEmailQ(j.scenario);
        setLoading(false);
      } catch (e: any) {
        toast.error(e?.message || "Init failed");
      }
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (loading) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function handleSubmit(auto = false) {
    if (submitting) return;
    if (!auto && countWords(emailText) < MIN_WORDS) {
      toast.error(`Minimum ${MIN_WORDS} words required (currently ${countWords(emailText)}).`);
      return;
    }
    setSubmitting(true);
    if (tickRef.current) clearInterval(tickRef.current);

    let evaluation: any = { score: 0 };
    try {
      const r = await fetch("/api/evaluate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenario?.situation,
          task: scenario?.task,
          email_text: emailText,
        }),
      });
      const j = await r.json();
      evaluation = j.evaluation || evaluation;
    } catch {}

      setEmailAnswer({ scenario_id: scenario?.id, text: emailText, score: evaluation.score || 0, evaluation });
    if (attemptId) {
      try {
        await fetch(`/api/attempts/${attemptId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fill_blank_answers: isSolo ? [] : fillBlankAnswers,
            passage_answers: isSolo
              ? []
              : passageAnswers.map((p, i) => ({
                  ...p,
                  passage: passageQs[i]?.passage,
                  key_points: passageQs[i]?.key_points,
                })),
            email_answer: {
              scenario,
              text: emailText,
              word_count: countWords(emailText),
              evaluation,
              score: evaluation.score || 0,
            },
            warnings,
          }),
        });
      } catch {}
    }
    router.push(`/results/${attemptId}`);
    setTimeout(() => reset(), 1500);
  }

  if (loading || !scenario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center exam-no-select">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing your email scenario...</p>
      </div>
    );
  }

  const wordCount = countWords(emailText);
  const progress = ((EMAIL_SECONDS - timeLeft) / EMAIL_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-grid exam-no-select">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {isSolo ? "Practice · Email Writing" : "Section 3 / 3"}
            </div>
            <div className="font-display text-lg font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Writing</div>
          </div>
          <div className="flex items-center gap-6">
            <div className={`text-sm ${wordCount >= MIN_WORDS ? "text-success" : "text-muted-foreground"}`} data-testid="word-count">
              <span className="font-semibold">{wordCount}</span> / {MIN_WORDS} words
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${timeLeft <= 30 ? "border-destructive text-destructive" : "border-border text-foreground"}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold tabular-nums" data-testid="timer">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="rounded-none h-1 border-0" />
      </header>

      <main className="container py-10 max-w-4xl grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2 h-fit">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-primary">Scenario</div>
            <p className="text-sm leading-relaxed mt-3" data-testid="scenario-text">{scenario.situation}</p>
            <div className="text-xs uppercase tracking-widest text-primary mt-6">Your Task</div>
            <p className="text-sm leading-relaxed mt-3">{scenario.task}</p>
            <div className="text-xs uppercase tracking-widest text-primary mt-6">Recipient</div>
            <p className="text-sm mt-2">{scenario.recipient_role}</p>
            {scenario.requirements?.length ? (
              <>
                <div className="text-xs uppercase tracking-widest text-primary mt-6">Requirements</div>
                <ul className="text-sm mt-3 space-y-2 list-disc list-inside text-muted-foreground">
                  {scenario.requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-primary">Compose Email</div>
            <Textarea
              autoFocus
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              className="mt-4 min-h-[420px] font-mono"
              placeholder={"Subject: ... n Dear ..., n Write your professional response here..."}
              data-testid="email-textarea"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">Auto-submits when timer ends</span>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} data-testid="submit-email-button">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isSolo ? "Submit & Finish Test" : "Submit & Finish Exam"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function Section3Page() {
  return (
    <Suspense fallback={null}>
      <Section3Inner />
    </Suspense>
  );
}
