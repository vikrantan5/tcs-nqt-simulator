import { NextResponse } from "next/server";
import { generatePassageBatch } from "@/lib/groq/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const passages = await generatePassageBatch(4);
    if (!passages || passages.length < 4) {
      return NextResponse.json({ error: "AI returned fewer than 4 passages" }, { status: 502 });
    }
    return NextResponse.json({ passages: passages.slice(0, 4) });
  } catch (e: any) {
    console.error("passage generation error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
