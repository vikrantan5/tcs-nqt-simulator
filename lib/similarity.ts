// Simple text similarity utilities for duplicate detection.
// Uses normalized Jaccard similarity over word shingles -> fast, dependency-free.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/_{2,}/g, " ___ ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text: string, n = 3): Set<string> {
  const tokens = normalize(text).split(" ").filter(Boolean);
  if (tokens.length < n) return new Set(tokens);
  const set = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    set.add(tokens.slice(i, i + n).join(" "));
  }
  return set;
}

export function jaccardSimilarity(a: string, b: string, n = 3): number {
  const A = shingles(a, n);
  const B = shingles(b, n);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function isDuplicate(candidate: string, existing: string[], threshold = 0.85): boolean {
  for (const e of existing) {
    if (jaccardSimilarity(candidate, e) >= threshold) return true;
  }
  return false;
}

// Fast pre-filter: exact-normalized match
export function exactNormalizedEquals(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}