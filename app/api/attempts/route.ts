import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(["full", "fill_blank", "passage_recall", "email_writing"]);

// Create a new attempt (optionally for a single section)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let testType = "full";
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.test_type === "string" && ALLOWED.has(body.test_type)) {
      testType = body.test_type;
    }
  } catch {
    // no body is fine
  }

  const { data, error } = await supabase
    .from("attempts")
    .insert({ user_id: user.id, status: "in_progress", test_type: testType })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: data });
}
