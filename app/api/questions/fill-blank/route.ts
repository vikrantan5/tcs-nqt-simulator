import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectFillBlanks } from "@/lib/services/test-generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const attemptId = url.searchParams.get("attemptId");

    const questions = await selectFillBlanks(user.id, attemptId);
    if (!questions || questions.length < 20) {
      return NextResponse.json(
        { error: "Could not assemble 20 unique questions. Pool may be too small." },
        { status: 502 }
      );
    }
    return NextResponse.json({ questions });
  } catch (e: any) {
    console.error("fill-blank generation error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
