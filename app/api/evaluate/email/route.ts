import { NextResponse } from "next/server";
import { evaluateEmail } from "@/lib/evaluators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { scenario, task, email_text } = await req.json();
    if (!email_text) return NextResponse.json({ error: "Missing email_text" }, { status: 400 });
    const evaluation = await evaluateEmail(scenario || "", task || "", email_text);
    return NextResponse.json({ evaluation });
  } catch (e: any) {
    console.error("evaluate email error", e);
    return NextResponse.json({ error: e?.message || "Failed to evaluate" }, { status: 500 });
  }
}
