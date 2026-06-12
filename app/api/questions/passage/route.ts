import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectPassages } from "@/lib/services/test-generator";

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

    const passages = await selectPassages(user.id, attemptId);
    if (!passages || passages.length < 4) {
      return NextResponse.json(
        { error: "Could not assemble 4 distinct passages. Pool may be too small." },
        { status: 502 }
      );
    }
    return NextResponse.json({ passages });
  } catch (e: any) {
    console.error("passage generation error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
