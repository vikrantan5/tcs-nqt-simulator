import "server-only";
import { groqJSON } from "./client";

export interface FillBlankQuestion {
  question: string;
  answer: string;
  accepted_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

export async function generateFillBlankBatch(count = 20): Promise<FillBlankQuestion[]> {
  const sys = `You are an official TCS NQT verbal assessment question creator.
Create realistic Fill-in-the-Blank questions exactly like the TCS NQT exam.
Each question has ONE blank denoted by "______" and the primary answer is a SINGLE WORD.
For every question you MUST also produce an "accepted_answers" array containing 3-6 SINGLE-WORD synonyms or contextually equivalent alternates that would also be correct in the same sentence (do NOT include the primary answer in this list, do NOT include words with a different meaning).
Categories include: vocabulary, grammar, business english, technology, communication, corporate workplace, software industry.
Difficulty: mix of easy, medium, hard.
Return JSON only.`;

  const user = `Generate ${count} TCS NQT-style fill-in-the-blank questions.
Return a JSON object with key "questions" containing an array of exactly ${count} items.
Each item: { "question": "Sentence with ______", "answer": "singleword", "accepted_answers": ["syn1","syn2","syn3"], "difficulty": "easy|medium|hard", "category": "category-name" }
Rules for "accepted_answers":
- Each entry MUST be a single word that fits naturally in the SAME blank without changing the sentence meaning.
- Do not include the primary "answer" in this list.
- If no good synonym exists, return an empty array [] rather than forcing weak alternates.
Ensure variety across categories and difficulty.`;

  const data = await groqJSON<{ questions: FillBlankQuestion[] }>(sys, user, 0.9);
  const out = (data.questions ?? []).map((q) => ({
    ...q,
    accepted_answers: Array.isArray(q.accepted_answers) ? q.accepted_answers : [],
  }));
  return out;
}

export interface PassageItem {
  passage: string;
  topic: string;
  key_points: string[];
}

export async function generatePassageBatch(count = 4): Promise<PassageItem[]> {
  const sys = `You are an official TCS NQT verbal exam passage creator.
Write professional passages 80-120 words on topics like technology, AI, cybersecurity, business, innovation, remote work, education, environment.
Return JSON only.`;

  const user = `Generate ${count} passages.
Return JSON object with key "passages" containing an array of ${count} items.
Each item: { "passage": "full passage text", "topic": "topic name", "key_points": ["point 1", "point 2", "point 3", "point 4"] }
Each passage must be 80-120 words and have 3-5 key conceptual points.`;

  const data = await groqJSON<{ passages: PassageItem[] }>(sys, user, 0.85);
  return data.passages ?? [];
}

export interface EmailScenario {
  situation: string;
  task: string;
  requirements: string[];
  recipient_role: string;
}

export async function generateEmailScenario(): Promise<EmailScenario> {
  const sys = `You are an official TCS NQT email-writing question creator.
Generate realistic workplace email scenarios. Return JSON only.`;

  const user = `Generate ONE professional email writing scenario.
Return JSON: { "situation": "background context", "task": "what the candidate must write", "requirements": ["req 1", "req 2", "req 3"], "recipient_role": "e.g. Project Manager" }
Pick a realistic situation like project delay, client escalation, budget approval, vendor issue, customer complaint, leave request, security incident, etc.`;

  return await groqJSON<EmailScenario>(sys, user, 0.85);
}
