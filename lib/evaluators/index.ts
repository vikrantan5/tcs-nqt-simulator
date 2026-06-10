import "server-only";
import { groqJSON } from "../groq/client";

// NOTE: The client-safe `evaluateFillBlank` lives in "./fill-blank".
// Do NOT re-export it from this barrel — this file is server-only,
// and any client component that imports from "@/lib/evaluators" would
// transitively pull in the Groq SDK and break the client build.

export interface PassageEvaluation {
  score: number;
  meaning_score: number;
  key_points_score: number;
  grammar_score: number;
  coherence_score: number;
  vocabulary_score: number;
  feedback: string[];
  missing_points: string[];
  ideal_paraphrase: string;
}

export async function evaluatePassageRecall(
  original: string,
  keyPoints: string[],
  recall: string
): Promise<PassageEvaluation> {
  const sys = `You are an official TCS NQT verbal evaluator.
NEVER evaluate exact wording. NEVER reward memorization.
Evaluate ONLY: concept understanding, meaning retention, key points covered, logical flow, coherence, grammar, vocabulary.
Return valid JSON only.`;

  const user = `Original Passage:
"""${original}"""

Key Points: ${JSON.stringify(keyPoints)}

Candidate Recall:
"""${recall}"""

Score 0-100 each:
- meaning_score (weight 40%)
- key_points_score (weight 25%)
- vocabulary_score (weight 15%)
- grammar_score (weight 10%)
- coherence_score (weight 10%)

Compute "score" as weighted total (0-100, integer).
Return JSON: { "score": int, "meaning_score": int, "key_points_score": int, "grammar_score": int, "coherence_score": int, "vocabulary_score": int, "feedback": [3 short strings], "missing_points": [strings], "ideal_paraphrase": "1-2 sentence paraphrase of the passage" }`;

  return await groqJSON<PassageEvaluation>(sys, user, 0.3);
}

export interface EmailEvaluation {
  score: number;
  professionalism: number;
  grammar: number;
  clarity: number;
  structure: number;
  communication: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  ideal_email: string;
}

export async function evaluateEmail(
  scenario: string,
  task: string,
  emailText: string
): Promise<EmailEvaluation> {
  const sys = `You are an official TCS NQT email-writing evaluator.
Evaluate professional business email writing. Return valid JSON only.`;

  const user = `Scenario: ${scenario}
Task: ${task}
Candidate Email:
"""${emailText}"""

Score 0-100 each:
- professionalism (weight 25%)
- structure (weight 20%)
- grammar (weight 20%)
- clarity (weight 15%)
- communication (weight 20%)

Compute weighted "score" 0-100 integer.
Return JSON: { "score": int, "professionalism": int, "grammar": int, "clarity": int, "structure": int, "communication": int, "strengths": [strings], "weaknesses": [strings], "suggestions": [strings], "ideal_email": "an example ideal email response (subject + body)" }`;

  return await groqJSON<EmailEvaluation>(sys, user, 0.3);
}
