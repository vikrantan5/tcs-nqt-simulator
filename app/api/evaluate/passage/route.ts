import { NextResponse } from "next/server";
import { evaluatePassageRecall } from "@/lib/evaluators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { passage, key_points, recall } = await req.json();
    if (!passage || !recall) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const evaluation = await evaluatePassageRecall(passage, key_points || [], recall);
    return NextResponse.json({ evaluation });
  } catch (e: any) {
    console.error("evaluate passage error", e);
    return NextResponse.json({ error: e?.message || "Failed to evaluate" }, { status: 500 });
  }
}
