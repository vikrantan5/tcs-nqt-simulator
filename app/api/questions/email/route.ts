import { NextResponse } from "next/server";
import { generateEmailScenario } from "@/lib/groq/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const scenario = await generateEmailScenario();
    return NextResponse.json({ scenario });
  } catch (e: any) {
    console.error("email scenario error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
