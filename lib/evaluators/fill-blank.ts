// Client-safe pure function. Does NOT import the Groq SDK.
// Keep this in its own module so client components can import it without
// pulling server-only code into the browser bundle.

export function evaluateFillBlank(userAnswer: string, correctAnswer: string): boolean {
  const u = (userAnswer || "").trim().toLowerCase();
  const c = (correctAnswer || "").trim().toLowerCase();
  if (!u || !c) return false;
  if (u === c) return true;
  // tolerate simple plural / -s / -ing differences
  if (u.replace(/s$/, "") === c.replace(/s$/, "")) return true;
  return false;
}