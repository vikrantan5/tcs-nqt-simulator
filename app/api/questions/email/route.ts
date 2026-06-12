import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectEmail } from "@/lib/services/test-generator";

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

    const scenario = await selectEmail(user.id, attemptId);
    if (!scenario) {
      return NextResponse.json({ error: "No email scenario available" }, { status: 502 });
    }
    return NextResponse.json({ scenario });
  } catch (e: any) {
    console.error("email scenario error", e);
    return NextResponse.json({ error: e?.message || "Failed to generate" }, { status: 500 });
  }
}
