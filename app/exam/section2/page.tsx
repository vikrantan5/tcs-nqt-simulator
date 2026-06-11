"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore, type PassageQ } from "@/store/exam-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { formatTime, countWords } from "@/lib/utils";
import { Loader2, Clock, BookOpen, PenLine } from "lucide-react";
import { toast } from "sonner";

const READ_SECONDS = 30;
const WRITE_SECONDS = 90;

type Phase = "read" | "write";

function Section2Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSolo = searchParams.get("mode") === "solo";

  const {
    setPassageQs,
    passageQs,
    addPassageAnswer,
    addWarning,
    setAttemptId,
    setTestType,
    attemptId,
    passageAnswers,
    warnings,
    reset,
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [passages, setPassages] = useState<PassageQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [timeLeft, setTimeLeft] = useState(READ_SECONDS);
  const [recall, setRecall] = useState("");
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (isSolo) {
          // Solo mode: start a fresh attempt for passage-recall
          reset();
          setTestType("passage_recall");
          const a = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test_type: "passage_recall" }),
          });
          if (!a.ok) throw new Error("Failed to create attempt");
          const aj = await a.json();
          if (cancelled) return;
          setAttemptId(aj.attempt.id);
        } else if (passageQs && passageQs.length === 4) {
          // Continuing the full mock — passages already cached.
          setPassages(passageQs);
          setLoading(false);
          return;
        }

        const r = await fetch("/api/questions/passage");
        if (!r.ok) throw new Error("Failed to load passages");
        const j = await r.json();
        if (cancelled) return;
        setPassages(j.passages);
        setPassageQs(j.passages);
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

  // anti-cheat
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden") { addWarning(); toast.warning("Tab switch detected."); }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [addWarning]);

  // Per-phase timer
  useEffect(() => {
    if (loading || !passages.length) return;
    const duration = phase === "read" ? READ_SECONDS : WRITE_SECONDS;
    setTimeLeft(duration);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current!);
          handlePhaseEnd();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, loading, passages.length]);

  async function handlePhaseEnd() {
    if (phase === "read") {
      setPhase("write");
      return;
    }
    await submitRecall();
  }

  async function finalizeSolo(allAnswers: typeof passageAnswers, allPassages: PassageQ[]) {
    if (!attemptId) return;
    setFinishing(true);
    try {
      await fetch(`/api/attempts/${attemptId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fill_blank_answers: [],
          passage_answers: allAnswers.map((p, i) => ({
            ...p,
            passage: allPassages[i]?.passage,
            key_points: allPassages[i]?.key_points,
          })),
          email_answer: null,
          warnings,
        }),
      });
    } catch {}
    router.push(`/results/${attemptId}`);
    setTimeout(() => reset(), 1500);
  }

  async function submitRecall() {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const p = passages[idx];
    if (!p) { submittingRef.current = false; return; }
    setLoading(true);
    let evaluation: any = { score: 0 };
    try {
      const r = await fetch("/api/evaluate/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage: p.passage, key_points: p.key_points, recall }),
      });
      const j = await r.json();
      evaluation = j.evaluation || { score: 0 };
    } catch {
      evaluation = { score: 0 };
    }

    const newAnswer = {
      passage_index: idx,
      recall,
      score: evaluation.score || 0,
      evaluation,
    };
    addPassageAnswer(newAnswer);
    setRecall("");

    if (idx + 1 >= passages.length) {
      if (isSolo) {
        await finalizeSolo([...passageAnswers, newAnswer], passages);
      } else {
        router.push("/exam/section3");
      }
      return;
    }
    setIdx((i) => i + 1);
    setPhase("read");
    setLoading(false);
    setTimeout(() => { submittingRef.current = false; }, 50);
  }

  if (loading && !passages.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center exam-no-select">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing passages...</p>
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

  const p = passages[idx];
  if (!p) return null;
  const phaseLabel = phase === "read" ? "Reading" : "Recall Writing";
  const PhaseIcon = phase === "read" ? BookOpen : PenLine;
  const progress = (idx / passages.length) * 100;

  return (
    <div className="min-h-screen bg-grid exam-no-select">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {isSolo ? "Practice · Passage Recall" : "Section 2 / 3"}
            </div>
            <div className="font-display text-lg font-semibold flex items-center gap-2"><PhaseIcon className="h-4 w-4 text-primary" /> Passage Recall · {phaseLabel}</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-muted-foreground">Passage <span className="text-foreground font-semibold">{idx + 1}</span> / {passages.length}</div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${timeLeft <= 10 ? "border-destructive text-destructive" : "border-border text-foreground"}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold tabular-nums" data-testid="timer">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="rounded-none h-1 border-0" />
      </header>

      <main className="container py-12 max-w-3xl">
        {phase === "read" ? (
          <Card className="animate-fade-in" data-testid="passage-display">
            <CardContent className="p-8">
              <div className="text-xs uppercase tracking-widest text-primary">Read carefully — passage will disappear</div>
              <p className="text-lg leading-relaxed mt-6">{p.passage}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-in">
            <CardContent className="p-8">
              <div className="text-xs uppercase tracking-widest text-primary">Write the passage in your own words</div>
              <p className="text-sm text-muted-foreground mt-2">Focus on meaning and key ideas. Exact wording is not required.</p>
              <Textarea
                autoFocus
                value={recall}
                onChange={(e) => setRecall(e.target.value)}
                className="mt-6 min-h-[220px]"
                placeholder="Reproduce the passage from memory..."
                data-testid="recall-textarea"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">{countWords(recall)} words</span>
                <Button onClick={submitRecall} data-testid="submit-recall-button">
                  {idx + 1 === passages.length ? (isSolo ? "Finish Test" : "Finish Section") : "Next Passage"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function Section2Page() {
  return (
    <Suspense fallback={null}>
      <Section2Inner />
    </Suspense>
  );
}
