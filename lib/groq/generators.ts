import "server-only";
import { groqJSON } from "./client";
import { FB_CATEGORIES, PASSAGE_TOPICS, EMAIL_SCENARIOS } from "@/lib/constants/test-composition";

export interface FillBlankQuestion {
  question: string;
  answer: string;
  accepted_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

const HIGH_CREATIVITY = {
  temperature: 1.2,
  top_p: 0.95,
  frequency_penalty: 0.7,
  presence_penalty: 0.8,
};

function sampleArr<T>(arr: readonly T[], k: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

/**
 * Generate fill-in-the-blank questions with explicit diversity hints.
 * `avoidSamples` is a small list of recent existing questions so the model
 * does not generate near-duplicates.
 */
export async function generateFillBlankBatch(
  count = 25,
  opts: {
    avoidSamples?: string[];
    difficulty?: "easy" | "medium" | "hard";
    categoriesHint?: string[];
  } = {}
): Promise<FillBlankQuestion[]> {
  const categories = opts.categoriesHint?.length
    ? opts.categoriesHint
    : sampleArr(FB_CATEGORIES, 5);

  const avoidBlock = (opts.avoidSamples ?? []).slice(0, 8)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("");

  const sys = `You are an official TCS NQT verbal assessment question creator.
Create realistic Fill-in-the-Blank questions exactly like the TCS NQT exam.
Each question has ONE blank denoted by "______" and the primary answer is a SINGLE WORD.
For every question you MUST also produce an "accepted_answers" array containing 3-6 SINGLE-WORD synonyms or contextually equivalent alternates that would also be correct in the same sentence (do NOT include the primary answer in this list, do NOT include words with a different meaning).
Be highly creative. Vary sentence structure, subject domain, and tone. Never repeat phrasings.
Return JSON only.`;

  const user = `Generate ${count} TCS NQT-style fill-in-the-blank questions.
Difficulty: ${opts.difficulty ?? "mixed (easy/medium/hard)"}.
Use ONLY these categories (spread items across them): ${categories.join(", ")}.
${avoidBlock ? `AVOID generating anything similar to these existing items:
${avoidBlock}` : ""}
Return a JSON object with key "questions" containing an array of exactly ${count} items.
Each item: { "question": "Sentence with ______", "answer": "singleword", "accepted_answers": ["syn1","syn2","syn3"], "difficulty": "easy|medium|hard", "category": "category-name" }
Rules for "accepted_answers":
- Each entry MUST be a single word that fits naturally in the SAME blank without changing the sentence meaning.
- Do not include the primary "answer" in this list.
- If no good synonym exists, return [] rather than forcing weak alternates.
Force uniqueness: no two questions in the batch should share the same sentence skeleton or use the same answer word.`;

  const data = await groqJSON<{ questions: FillBlankQuestion[] }>(sys, user, HIGH_CREATIVITY);
  return (data.questions ?? []).map((q) => ({
    ...q,
    accepted_answers: Array.isArray(q.accepted_answers) ? q.accepted_answers : [],
  }));
}

export interface PassageItem {
  passage: string;
  topic: string;
  key_points: string[];
  difficulty?: "medium" | "hard";
}

export async function generatePassageBatch(
  count = 6,
  opts: {
    avoidSamples?: string[];
    topicsHint?: string[];
    difficulty?: "medium" | "hard";
  } = {}
): Promise<PassageItem[]> {
  const topics = opts.topicsHint?.length
    ? opts.topicsHint
    : sampleArr(PASSAGE_TOPICS, Math.min(count, PASSAGE_TOPICS.length));

  const avoidBlock = (opts.avoidSamples ?? []).slice(0, 4)
    .map((s, i) => `${i + 1}. ${s.slice(0, 220)}…`)
    .join("");

  const sys = `You are an official TCS NQT verbal exam passage creator.
Write professional, dense passages 80-120 words each. Each passage must be on a DIFFERENT topic from the others.
Be creative — every passage should have a fresh angle, do not reuse openings, transitions, or stock phrases.
Return JSON only.`;

  const user = `Generate ${count} passages.
Use these distinct topics (one passage per topic): ${topics.join(", ")}.
Difficulty: ${opts.difficulty ?? "mix of medium and hard"}.
${avoidBlock ? `AVOID similarity to:
${avoidBlock}` : ""}
Return JSON object with key "passages" containing an array of ${count} items.
Each item: { "passage": "full passage text", "topic": "topic name", "key_points": ["point 1", "point 2", "point 3", "point 4"], "difficulty": "medium|hard" }
Each passage must be 80-120 words and have 3-5 key conceptual points.`;

  const data = await groqJSON<{ passages: PassageItem[] }>(sys, user, HIGH_CREATIVITY);
  return data.passages ?? [];
}

export interface EmailScenarioItem {
  situation: string;
  task: string;
  requirements: string[];
  recipient_role: string;
  topic: string;
  difficulty?: "medium" | "hard";
}

export async function generateEmailScenarioBatch(
  count = 5,
  opts: {
    avoidSamples?: string[];
    topicsHint?: string[];
    difficulty?: "medium" | "hard";
  } = {}
): Promise<EmailScenarioItem[]> {
  const topics = opts.topicsHint?.length
    ? opts.topicsHint
    : sampleArr(EMAIL_SCENARIOS, Math.min(count, EMAIL_SCENARIOS.length));

  const avoidBlock = (opts.avoidSamples ?? []).slice(0, 4)
    .map((s, i) => `${i + 1}. ${s.slice(0, 200)}…`)
    .join("");

  const sys = `You are an official TCS NQT email-writing question creator.
Generate realistic, fresh workplace email scenarios. Each scenario should feel different from the rest.
Return JSON only.`;

  const user = `Generate ${count} professional email writing scenarios.
Use these topics (one scenario per topic): ${topics.join(", ")}.
Difficulty: ${opts.difficulty ?? "mix of medium and hard"}.
${avoidBlock ? `AVOID similarity to existing scenarios:
${avoidBlock}` : ""}
Return JSON object with key "scenarios" containing an array of exactly ${count} items.
Each item: { "situation": "background context (2-3 sentences)", "task": "what the candidate must write", "requirements": ["req 1", "req 2", "req 3"], "recipient_role": "e.g. Project Manager", "topic": "topic-name", "difficulty": "medium|hard" }`;

  const data = await groqJSON<{ scenarios: EmailScenarioItem[] }>(sys, user, HIGH_CREATIVITY);
  return data.scenarios ?? [];
}

// Back-compat single email scenario
export async function generateEmailScenario(): Promise<EmailScenarioItem> {
  const batch = await generateEmailScenarioBatch(1);
  return batch[0];
}
