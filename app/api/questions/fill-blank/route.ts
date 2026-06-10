import { NextResponse } from "next/server";
import { generateFillBlankBatch } from "@/lib/groq/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const questions = await generateFillBlankBatch(20);
    if (!questions || questions.length < 20) {
      return NextResponse.json({ error: "AI returned fewer than 20 questions" }, { status: 502 });
    }
    return NextResponse.json({ questions: questions.slice(0, 20) });
  } catch (e: any) {
    console.error("fill-blank generation error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
