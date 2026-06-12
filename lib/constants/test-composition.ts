// Test composition + diversity rules

export const FB_CATEGORIES = [
  "vocabulary",
  "grammar",
  "business english",
  "communication",
  "technology",
  "corporate workplace",
  "software industry",
] as const;

export const PASSAGE_TOPICS = [
  "artificial intelligence",
  "cybersecurity",
  "business",
  "environment",
  "remote work",
  "innovation",
  "education",
  "cloud computing",
  "healthcare technology",
  "digital transformation",
  "data privacy",
  "fintech",
  "sustainability",
  "automation",
] as const;

export const EMAIL_SCENARIOS = [
  "project delay",
  "client escalation",
  "budget approval",
  "security incident",
  "leave request",
  "vendor failure",
  "deployment failure",
  "meeting reschedule",
  "team conflict",
  "customer complaint",
  "performance issue",
  "promotion request",
  "training proposal",
  "compliance breach",
  "resource shortage",
] as const;

// Composition for a single test
export const FB_TEST_SIZE = 20;
export const FB_DIFFICULTY_MIX = { easy: 7, medium: 7, hard: 6 } as const;
export const FB_MAX_CATEGORY_RATIO = 0.3; // no category > 30%

export const PASSAGE_TEST_SIZE = 4;
export const PASSAGE_DIFFICULTY_MIX = { medium: 2, hard: 2 } as const;

export const EMAIL_TEST_SIZE = 1;

// Pool refill thresholds
export const POOL_THRESHOLDS = {
  fill_blank: 500,
  passage: 100,
  email: 50,
} as const;

// "Recently used" window (in days)
export const RECENT_USED_DAYS = 30;

// Duplicate similarity threshold (Jaccard)
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

// Sample size when fetching the candidate pool
export const POOL_SAMPLE = {
  fill_blank: 200,
  passage: 100,
  email: 50,
} as const;
