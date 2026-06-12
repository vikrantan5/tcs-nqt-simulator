import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import {
  generateFillBlankBatch,
  generatePassageBatch,
  generateEmailScenarioBatch,
} from "@/lib/groq/generators";
import { isDuplicate, jaccardSimilarity } from "@/lib/similarity";
import {
  FB_TEST_SIZE,
  FB_DIFFICULTY_MIX,
  FB_MAX_CATEGORY_RATIO,
  PASSAGE_TEST_SIZE,
  PASSAGE_DIFFICULTY_MIX,
  EMAIL_TEST_SIZE,
  POOL_THRESHOLDS,
  POOL_SAMPLE,
  RECENT_USED_DAYS,
  DUPLICATE_SIMILARITY_THRESHOLD,
} from "@/lib/constants/test-composition";

// ─── Types returned to the client (no DB IDs leak unnecessary info)
export type FBPick = {
  id: string;
  question: string;
  answer: string;
  accepted_answers: string[];
  difficulty: string;
  category: string;
};
export type PassagePick = {
  id: string;
  passage: string;
  topic: string;
  key_points: string[];
  difficulty: string;
};
export type EmailPick = {
  id: string;
  situation: string;
  task: string;
  requirements: string[];
  recipient_role: string;
  topic: string;
  difficulty: string;
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getUserHistoryIds(
  userId: string,
  contentType: "fill_blank" | "passage" | "email"
): Promise<{ recent: Set<string>; allTime: Set<string> }> {
  const supabase = createServiceClient();
  // Lifetime: every content ever served to this user
  const { data: lifetime } = await supabase
    .from("user_attempt_history")
    .select("content_id, used_at")
    .eq("user_id", userId)
    .eq("content_type", contentType);

  const recentCutoff = Date.now() - RECENT_USED_DAYS * 24 * 60 * 60 * 1000;
  const recent = new Set<string>();
  const allTime = new Set<string>();
  for (const row of lifetime ?? []) {
    allTime.add(row.content_id as string);
    if (new Date(row.used_at).getTime() >= recentCutoff) {
      recent.add(row.content_id as string);
    }
  }
  return { recent, allTime };
}

async function poolCount(table: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

// ──────────────────────────────────────────────────────────────────────────
// Pool refill via Groq (idempotent + duplicate-safe)
// ──────────────────────────────────────────────────────────────────────────

async function refillFillBlankPool(target = 60): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("fill_blank_questions")
    .select("question")
    .order("created_at", { ascending: false })
    .limit(60);
  const existingText = (existing ?? []).map((r: { question: string }) => r.question as string);
  const generated = await generateFillBlankBatch(target, {
    avoidSamples: existingText.slice(0, 8),
  });

  const rows: any[] = [];
  for (const q of generated) {
    if (!q?.question || !q?.answer) continue;
    if (isDuplicate(q.question, existingText, DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    // also dedupe within the new batch itself
    if (isDuplicate(q.question, rows.map((r) => r.question), DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    rows.push({
      question: q.question,
      answer: q.answer,
      difficulty: (q.difficulty || "medium").toLowerCase(),
      category: (q.category || "vocabulary").toLowerCase(),
      created_by_ai: true,
      is_active: true,
      usage_count: 0,
    });
  }
  if (rows.length) await supabase.from("fill_blank_questions").insert(rows);
}

async function refillPassagePool(target = 12): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("passage_questions")
    .select("passage")
    .order("created_at", { ascending: false })
    .limit(40);
  const existingText = (existing ?? []).map((r: { passage: string }) => r.passage as string);

  const generated = await generatePassageBatch(target, {
    avoidSamples: existingText.slice(0, 4),
  });

  const rows: any[] = [];
  for (const p of generated) {
    if (!p?.passage) continue;
    if (isDuplicate(p.passage, existingText, DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    if (isDuplicate(p.passage, rows.map((r) => r.passage), DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    rows.push({
      passage: p.passage,
      topic: (p.topic || "technology").toLowerCase(),
      key_points: p.key_points || [],
      difficulty: (p.difficulty || "medium").toLowerCase(),
      created_by_ai: true,
      is_active: true,
    });
  }
  if (rows.length) await supabase.from("passage_questions").insert(rows);
}

async function refillEmailPool(target = 8): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("email_scenarios")
    .select("situation")
    .order("created_at", { ascending: false })
    .limit(20);
  const existingText = (existing ?? []).map((r: { situation: string }) => r.situation as string);

  const generated = await generateEmailScenarioBatch(target, {
    avoidSamples: existingText.slice(0, 4),
  });

  const rows: any[] = [];
  for (const s of generated) {
    if (!s?.situation || !s?.task) continue;
    if (isDuplicate(s.situation, existingText, DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    if (isDuplicate(s.situation, rows.map((r) => r.situation), DUPLICATE_SIMILARITY_THRESHOLD)) continue;
    rows.push({
      situation: s.situation,
      task: s.task,
      requirements: s.requirements || [],
      recipient_role: s.recipient_role || "Manager",
      topic: (s.topic || "general").toLowerCase(),
      difficulty: (s.difficulty || "medium").toLowerCase(),
      created_by_ai: true,
      is_active: true,
    });
  }
  if (rows.length) await supabase.from("email_scenarios").insert(rows);
}

async function ensurePoolHealthy(): Promise<void> {
  const [fbCount, pCount, eCount] = await Promise.all([
    poolCount("fill_blank_questions"),
    poolCount("passage_questions"),
    poolCount("email_scenarios"),
  ]);
  const jobs: Promise<void>[] = [];
  if (fbCount < POOL_THRESHOLDS.fill_blank) jobs.push(refillFillBlankPool(60));
  if (pCount < POOL_THRESHOLDS.passage) jobs.push(refillPassagePool(12));
  if (eCount < POOL_THRESHOLDS.email) jobs.push(refillEmailPool(8));
  if (jobs.length) await Promise.all(jobs);
}

// ──────────────────────────────────────────────────────────────────────────
// Fill-in-the-Blank selection — difficulty balanced + category capped
// ──────────────────────────────────────────────────────────────────────────

async function fetchCandidateFillBlanks(
  excludeIds: Set<string>,
  difficulty: string,
  limit: number
) {
  const supabase = createServiceClient();
  const exclude = Array.from(excludeIds).slice(0, 1000);
  let q = supabase
    .from("fill_blank_questions")
    .select("id, question, answer, difficulty, category")
    .eq("is_active", true)
    .eq("difficulty", difficulty)
    .order("usage_count", { ascending: true })
    .order("last_used", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (exclude.length) q = q.not("id", "in", `(${exclude.join(",")})`);
  const { data } = await q;
  return data ?? [];
}

function pickWithCategoryCap(
  candidates: any[],
  needed: number,
  globalCount: number
): any[] {
  // Shuffle candidates first for randomness
  const pool = shuffle(candidates);
  const maxPerCategory = Math.max(1, Math.floor(globalCount * FB_MAX_CATEGORY_RATIO));
  const picked: any[] = [];
  const catCounter: Record<string, number> = {};

  for (const c of pool) {
    const cat = (c.category || "uncategorized").toLowerCase();
    const used = catCounter[cat] ?? 0;
    if (used >= maxPerCategory) continue;
    picked.push(c);
    catCounter[cat] = used + 1;
    if (picked.length >= needed) break;
  }

  // Backfill if cap was too strict (small pool diversity)
  if (picked.length < needed) {
    for (const c of pool) {
      if (picked.find((p) => p.id === c.id)) continue;
      picked.push(c);
      if (picked.length >= needed) break;
    }
  }
  return picked.slice(0, needed);
}

async function selectFillBlanksForTest(userId: string): Promise<FBPick[]> {
  await ensurePoolHealthy();
  const { recent, allTime } = await getUserHistoryIds(userId, "fill_blank");
  const exclude = new Set<string>([...recent, ...allTime]);

  const buckets: Array<{ difficulty: keyof typeof FB_DIFFICULTY_MIX; n: number }> = [
    { difficulty: "easy", n: FB_DIFFICULTY_MIX.easy },
    { difficulty: "medium", n: FB_DIFFICULTY_MIX.medium },
    { difficulty: "hard", n: FB_DIFFICULTY_MIX.hard },
  ];

  const selected: any[] = [];
  for (const b of buckets) {
    let candidates = await fetchCandidateFillBlanks(exclude, b.difficulty, POOL_SAMPLE.fill_blank);
    if (candidates.length < b.n) {
      // Fallback: drop the lifetime-exclusion (keep recent), to handle small pools / heavy users
      candidates = await fetchCandidateFillBlanks(recent, b.difficulty, POOL_SAMPLE.fill_blank);
    }
    if (candidates.length < b.n) {
      // Final fallback: any difficulty
      const supabase = createServiceClient();
      const { data: anyDiff } = await supabase
        .from("fill_blank_questions")
        .select("id, question, answer, difficulty, category")
        .eq("is_active", true)
        .limit(POOL_SAMPLE.fill_blank);
      candidates = shuffle(anyDiff ?? []).slice(0, b.n);
    }
    const picked = pickWithCategoryCap(candidates, b.n, FB_TEST_SIZE);
    selected.push(...picked);
    picked.forEach((p) => exclude.add(p.id));
  }

  // Try to fetch accepted_answers via groq on the fly? Stored answer already exists.
  // Build accepted_answers heuristic = empty array (evaluator handles synonyms).
  const finalSet = shuffle(selected).slice(0, FB_TEST_SIZE);
  return finalSet.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    accepted_answers: [],
    difficulty: r.difficulty,
    category: r.category,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Passages — 4 with distinct topics, difficulty: 2 medium + 2 hard
// ──────────────────────────────────────────────────────────────────────────

async function selectPassagesForTest(userId: string): Promise<PassagePick[]> {
  await ensurePoolHealthy();
  const { recent, allTime } = await getUserHistoryIds(userId, "passage");
  const exclude = new Set<string>([...recent, ...allTime]);
  const supabase = createServiceClient();

  const fetchByDifficulty = async (difficulty: string) => {
    const ex = Array.from(exclude).slice(0, 1000);
    let q = supabase
      .from("passage_questions")
      .select("id, passage, topic, key_points, difficulty")
      .eq("is_active", true)
      .eq("difficulty", difficulty)
      .order("usage_count", { ascending: true })
      .order("last_used", { ascending: true, nullsFirst: true })
      .limit(POOL_SAMPLE.passage);
    if (ex.length) q = q.not("id", "in", `(${ex.join(",")})`);
    const { data } = await q;
    return data ?? [];
  };

  // We want 2 medium + 2 hard, ALL with distinct topics within the test.
  const usedTopics = new Set<string>();
  const picked: any[] = [];

  const pickFrom = (pool: any[], n: number) => {
    const shuffled = shuffle(pool);
    for (const p of shuffled) {
      const topic = (p.topic || "general").toLowerCase();
      if (usedTopics.has(topic)) continue;
      picked.push(p);
      usedTopics.add(topic);
      if (picked.length >= n) return;
    }
  };

  let mediumPool = await fetchByDifficulty("medium");
  if (mediumPool.length < PASSAGE_DIFFICULTY_MIX.medium) {
    // fallback: just exclude recent, keep allTime
    const ex = Array.from(recent).slice(0, 1000);
    let q = supabase
      .from("passage_questions")
      .select("id, passage, topic, key_points, difficulty")
      .eq("is_active", true)
      .eq("difficulty", "medium")
      .limit(POOL_SAMPLE.passage);
    if (ex.length) q = q.not("id", "in", `(${ex.join(",")})`);
    mediumPool = (await q).data ?? [];
  }
  pickFrom(mediumPool, picked.length + PASSAGE_DIFFICULTY_MIX.medium);

  let hardPool = await fetchByDifficulty("hard");
  if (hardPool.length < PASSAGE_DIFFICULTY_MIX.hard) {
    const ex = Array.from(recent).slice(0, 1000);
    let q = supabase
      .from("passage_questions")
      .select("id, passage, topic, key_points, difficulty")
      .eq("is_active", true)
      .eq("difficulty", "hard")
      .limit(POOL_SAMPLE.passage);
    if (ex.length) q = q.not("id", "in", `(${ex.join(",")})`);
    hardPool = (await q).data ?? [];
  }
  pickFrom(hardPool, picked.length + PASSAGE_DIFFICULTY_MIX.hard);

  // Final fallback: any active passage with new topic
  if (picked.length < PASSAGE_TEST_SIZE) {
    const { data: any } = await supabase
      .from("passage_questions")
      .select("id, passage, topic, key_points, difficulty")
      .eq("is_active", true)
      .limit(POOL_SAMPLE.passage);
    pickFrom(any ?? [], PASSAGE_TEST_SIZE);
  }

  return picked.slice(0, PASSAGE_TEST_SIZE).map((r) => ({
    id: r.id,
    passage: r.passage,
    topic: r.topic,
    key_points: r.key_points || [],
    difficulty: r.difficulty,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Email — 1 scenario, medium-or-hard, unused-by-user-preferred
// ──────────────────────────────────────────────────────────────────────────
async function selectEmailForTest(userId: string): Promise<EmailPick | null> {
  await ensurePoolHealthy();
  const { recent, allTime } = await getUserHistoryIds(userId, "email");
  const exclude = new Set<string>([...recent, ...allTime]);
  const supabase = createServiceClient();

  const ex = Array.from(exclude).slice(0, 1000);
  let q = supabase
    .from("email_scenarios")
    .select("id, situation, task, requirements, recipient_role, topic, difficulty")
    .eq("is_active", true)
    .in("difficulty", ["medium", "hard"])
    .order("usage_count", { ascending: true })
    .order("last_used", { ascending: true, nullsFirst: true })
    .limit(POOL_SAMPLE.email);
  if (ex.length) q = q.not("id", "in", `(${ex.join(",")})`);
  let { data } = await q;

  if (!data || data.length === 0) {
    // fallback: exclude only recent
    const ex2 = Array.from(recent).slice(0, 1000);
    let q2 = supabase
      .from("email_scenarios")
      .select("id, situation, task, requirements, recipient_role, topic, difficulty")
      .eq("is_active", true)
      .limit(POOL_SAMPLE.email);
    if (ex2.length) q2 = q2.not("id", "in", `(${ex2.join(",")})`);
    data = (await q2).data ?? [];
  }
  if (!data || data.length === 0) return null;
  
  // FIXED: Added type assertion for the picked item
  const picked = shuffle(data)[0] as {
    id: string;
    situation: string;
    task: string;
    requirements: string[];
    recipient_role: string;
    topic: string;
    difficulty: string;
  };
  
  return {
    id: picked.id,
    situation: picked.situation,
    task: picked.task,
    requirements: picked.requirements || [],
    recipient_role: picked.recipient_role || "Manager",
    topic: picked.topic || "general",
    difficulty: picked.difficulty || "medium",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Locking + Public API
// ──────────────────────────────────────────────────────────────────────────

async function lockContent(
  userId: string,
  attemptId: string | null,
  contentType: "fill_blank" | "passage" | "email",
  contentIds: string[]
) {
  if (!contentIds.length) return;
  const supabase = createServiceClient();
  // bump usage_count + last_used on each item
  const table =
    contentType === "fill_blank"
      ? "fill_blank_questions"
      : contentType === "passage"
      ? "passage_questions"
      : "email_scenarios";
  await Promise.all(
    contentIds.map((id) =>
      supabase.rpc("noop_increment", { p_table: table, p_id: id }).then(
        () => null,
        async () => {
          // fallback if RPC doesn't exist: do a read-modify-write
          const { data: cur } = await supabase.from(table).select("usage_count").eq("id", id).single();
          await supabase
            .from(table)
            .update({
              usage_count: (cur?.usage_count ?? 0) + 1,
              last_used: new Date().toISOString(),
            })
            .eq("id", id);
        }
      )
    )
  );

  // Insert into user_attempt_history (only if attemptId is provided)
  if (attemptId) {
    const rows = contentIds.map((cid) => ({
      user_id: userId,
      attempt_id: attemptId,
      content_type: contentType,
      content_id: cid,
    }));
    await supabase.from("user_attempt_history").insert(rows);
  }
}

export async function selectFillBlanks(userId: string, attemptId: string | null) {
  const items = await selectFillBlanksForTest(userId);
  await lockContent(userId, attemptId, "fill_blank", items.map((i) => i.id));
  return items;
}

export async function selectPassages(userId: string, attemptId: string | null) {
  const items = await selectPassagesForTest(userId);
  await lockContent(userId, attemptId, "passage", items.map((i) => i.id));
  return items;
}

export async function selectEmail(userId: string, attemptId: string | null) {
  const item = await selectEmailForTest(userId);
  if (item) await lockContent(userId, attemptId, "email", [item.id]);
  return item;
}

// Compute overlap between this test and the user's last test (for monitoring)
export async function computeLastTestOverlap(
  userId: string,
  newIds: { fill_blank: string[]; passage: string[]; email: string[] }
): Promise<number> {
  const supabase = createServiceClient();
  // last completed attempt before now (excluding current)
  const { data: lastAttempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);
  if (!lastAttempts || lastAttempts.length === 0) return 0;
  const lastId = lastAttempts[0].id;
  const { data: lastHist } = await supabase
    .from("user_attempt_history")
    .select("content_id")
    .eq("user_id", userId)
    .eq("attempt_id", lastId);
  const prevIds = new Set((lastHist ?? []).map((r: { content_id: string }) => r.content_id as string));
  const all = [...newIds.fill_blank, ...newIds.passage, ...newIds.email];
  if (all.length === 0) return 0;
  let overlap = 0;
  for (const id of all) if (prevIds.has(id)) overlap++;
  return overlap / all.length;
}