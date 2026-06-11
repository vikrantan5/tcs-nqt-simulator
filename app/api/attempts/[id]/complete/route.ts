import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Finalize attempt: receives full results, persists answers + final scores.
// Handles full mock as well as solo single-section attempts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fill_blank_answers = [], passage_answers = [], email_answer, warnings = 0 } = body;

  // Look up the existing attempt to know its test_type
  const { data: existing } = await supabase
    .from("attempts")
    .select("test_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const testType: string = existing?.test_type || "full";

  // Fill blank score: % correct
  const fbCorrect = fill_blank_answers.filter((a: any) => a.is_correct).length;
  const fbScore = fill_blank_answers.length ? Math.round((fbCorrect / fill_blank_answers.length) * 100) : 0;

  // Passage score: average of evaluations
  const psScore = passage_answers.length
    ? Math.round(passage_answers.reduce((s: number, p: any) => s + (p.score || 0), 0) / passage_answers.length)
    : 0;

  // Email score
  const emScore = email_answer?.score ?? 0;

  // Total depends on test type. For solo tests, total = that section's score.
  let total = 0;
  if (testType === "fill_blank") total = fbScore;
  else if (testType === "passage_recall") total = psScore;
  else if (testType === "email_writing") total = emScore;
  else total = Math.round(fbScore * 0.33 + psScore * 0.34 + emScore * 0.33);

  // Insert answers
  if (fill_blank_answers.length) {
    const rows = fill_blank_answers.map((a: any, i: number) => ({
      attempt_id: id,
      question_index: i,
      question: a.question,
      correct_answer: a.correct,
      user_answer: a.user,
      is_correct: a.is_correct,
      category: a.category,
      difficulty: a.difficulty,
    }));
    await supabase.from("fill_blank_answers").insert(rows);
  }
  if (passage_answers.length) {
    const rows = passage_answers.map((p: any, i: number) => ({
      attempt_id: id,
      passage_index: i,
      passage: p.passage,
      key_points: p.key_points,
      recall_text: p.recall,
      evaluation: p.evaluation,
      score: p.score,
    }));
    await supabase.from("passage_answers").insert(rows);
  }
  if (email_answer) {
    await supabase.from("email_answers").insert({
      attempt_id: id,
      scenario: email_answer.scenario,
      email_text: email_answer.text,
      word_count: email_answer.word_count,
      evaluation: email_answer.evaluation,
      score: email_answer.score,
    });
  }

  const { data: updated, error } = await supabase
    .from("attempts")
    .update({
      status: "completed",
      fill_blank_score: fbScore,
      passage_score: psScore,
      email_score: emScore,
      total_score: total,
      warnings,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: updated });
}
