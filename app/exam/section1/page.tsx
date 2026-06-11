"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore, type FillBlankQ } from "@/store/exam-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { evaluateFillBlank } from "@/lib/evaluators/fill-blank";
import { formatTime } from "@/lib/utils";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PER_QUESTION_SECONDS = 25;

function Section1Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSolo = searchParams.get("mode") === "solo";

  const {
    setAttemptId,
    setTestType,
    setFillBlankQs,
    addFillBlankAnswer,
    addWarning,
    reset,
    attemptId,
    fillBlankAnswers,
    warnings,
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [questions, setQuestions] = useState<FillBlankQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const submittingRef = useRef(false);

  // Init: reset store, create attempt, fetch 20 questions
  useEffect(() => {
    let cancelled = false;
    async function init() {
      reset();
      const testType = isSolo ? "fill_blank" : "full";
      setTestType(testType);
      try {
        const a = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test_type: testType }),
        });
        if (!a.ok) throw new Error("Failed to create attempt");
        const aj = await a.json();
        if (cancelled) return;
        setAttemptId(aj.attempt.id);

        const r = await fetch("/api/questions/fill-blank");
        if (!r.ok) throw new Error("Failed to load questions");
        const j = await r.json();
        if (cancelled) return;
        setQuestions(j.questions);
        setFillBlankQs(j.questions);
        setLoading(false);
      } catch (e: any) {
        toast.error(e?.message || "Init failed");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anti-cheat
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden") {
        addWarning();
        toast.warning("Warning: tab switch detected.");
      }
    }
    function onCtx(e: MouseEvent) { e.preventDefault(); }
    function onCopy(e: ClipboardEvent) { e.preventDefault(); }
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onCopy);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onCopy);
    };
  }, [addWarning]);

  // Timer per question
  useEffect(() => {
    if (loading || !questions.length) return;
    setTimeLeft(PER_QUESTION_SECONDS);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current!);
          submit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, loading, questions.length]);

  async function finalizeSolo(finalAnswers: typeof fillBlankAnswers) {
    if (!attemptId) return;
    setFinishing(true);
    try {
      await fetch(`/api/attempts/${attemptId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fill_blank_answers: finalAnswers,
          passage_answers: [],
          email_answer: null,
          warnings,
        }),
      });
    } catch {}
    router.push(`/results/${attemptId}`);
    setTimeout(() => reset(), 1500);
  }

  function submit(auto = false) {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const q = questions[idx];
    if (!q) { submittingRef.current = false; return; }
    const is_correct = evaluateFillBlank(answer, q.answer, q.accepted_answers || []);
    const newAnswer = {
      question: q.question,
      correct: q.answer,
      accepted_answers: q.accepted_answers || [],
      user: answer,
      is_correct,
      category: q.category,
      difficulty: q.difficulty,
    };
    addFillBlankAnswer(newAnswer);
    setAnswer("");

    if (idx + 1 >= questions.length) {
      if (isSolo) {
        finalizeSolo([...fillBlankAnswers, newAnswer]);
      } else {
        router.push("/exam/section2");
      }
      return;
    }
    setIdx((i) => i + 1);
    // release submit lock after state transitions in next tick
    setTimeout(() => { submittingRef.current = false; }, 50);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center exam-no-select">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Generating your unique test set with AI...</p>
      </div>
    );
  }

  if (finishing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center exam-no-select">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Finalizing your test...</p>
      </div>
    );
  }

  const q = questions[idx];
  const progress = ((idx) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-grid exam-no-select">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {isSolo ? "Practice · Fill in the Blanks" : "Section 1 / 3"}
            </div>
            <div className="font-display text-lg font-semibold">Fill in the Blanks</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-muted-foreground"><span className="text-foreground font-semibold">{idx + 1}</span> / {questions.length}</div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${timeLeft <= 5 ? "border-destructive text-destructive" : "border-border text-foreground"}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold tabular-nums" data-testid="timer">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="rounded-none h-1 border-0" />
      </header>

      <main className="container py-12 max-w-3xl">
        <Card className="animate-fade-in">
          <CardContent className="p-8">
            <div className="text-xs uppercase tracking-widest text-primary">Question {idx + 1}</div>
            <p className="font-display text-xl sm:text-2xl mt-4 leading-relaxed" data-testid="question-text">
              {q.question}
            </p>
            <form
              className="mt-8 flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => { e.preventDefault(); submit(false); }}
            >
              <Input
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value.replace(/s+/g, ""))}
                placeholder="Type one word..."
                className="flex-1"
                data-testid="answer-input"
              />
              <Button type="submit" size="lg" data-testid="next-button">
                {idx + 1 === questions.length ? (isSolo ? "Finish Test" : "Finish Section") : "Next"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Single-word answer · Synonyms in context accepted · Auto-submits in {timeLeft}s · No going back
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function Section1Page() {
  return (
    <Suspense fallback={null}>
      <Section1Inner />
    </Suspense>
  );
}
