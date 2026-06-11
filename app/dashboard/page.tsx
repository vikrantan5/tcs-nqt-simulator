import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SignOutButton from "./sign-out-button";
import { ArrowRight, BarChart3, Clock, FileText, Mail, TrendingUp, Trophy, BookOpen, Sparkles } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  full: "Full Mock",
  fill_blank: "Fill in the Blanks",
  passage_recall: "Passage Recall",
  email_writing: "Email Writing",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id,total_score,fill_blank_score,passage_score,email_score,completed_at,status,test_type")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  const completed = attempts ?? [];
  const avg = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.total_score || 0), 0) / completed.length)
    : 0;
  const best = completed.length ? Math.max(...completed.map((a) => a.total_score || 0)) : 0;

  return (
    <div className="min-h-screen bg-grid">
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-lg font-bold">TCS NQT Simulator</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="dashboard-user-email">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="container pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Your Dashboard</h1>
            <p className="text-muted-foreground mt-2">Track performance and pick a test to start practicing.</p>
          </div>
          <Link href="/exam/section1">
            <Button size="lg" className="group" data-testid="start-exam-button">
              Start Full Mock <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-10">
          {[
            { icon: TrendingUp, label: "Avg Score", value: avg },
            { icon: Trophy, label: "Best Score", value: best },
            { icon: BarChart3, label: "Tests Taken", value: completed.length },
            { icon: Clock, label: "Streak", value: "—" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-4xl font-bold mt-3" data-testid={`stat-${s.label.toLowerCase().replace(/s/g, "-")}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Practice individual sections */}
        <div className="mt-12">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl font-semibold">Practice a single section</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Focus on one format at a time. Each test is timed exactly like the real exam.</p>
          <div className="grid gap-4 md:grid-cols-3 mt-5">
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold mt-4">Fill in the Blanks</h3>
                <p className="text-sm text-muted-foreground mt-2">20 questions · 25s each · context-aware AI grading.</p>
                <Link href="/exam/section1?mode=solo">
                  <Button className="mt-5 w-full" data-testid="start-fill-blank-button">
                    Start Test <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold mt-4">Passage Recall</h3>
                <p className="text-sm text-muted-foreground mt-2">4 passages · 30s read + 90s recall · graded on meaning.</p>
                <Link href="/exam/section2?mode=solo">
                  <Button className="mt-5 w-full" data-testid="start-passage-recall-button">
                    Start Test <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold mt-4">Email Writing</h3>
                <p className="text-sm text-muted-foreground mt-2">1 scenario · 540s · min 100 words · professional tone.</p>
                <Link href="/exam/section3?mode=solo">
                  <Button className="mt-5 w-full" data-testid="start-email-writing-button">
                    Start Test <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent attempts */}
        <div className="mt-12">
          <h2 className="font-display text-xl font-semibold">Recent attempts</h2>
          <Card className="mt-4">
            <CardContent className="p-0">
              {completed.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No attempts yet. Start your first mock test.</div>
              ) : (
                <div className="divide-y divide-border">
                  {completed.map((a) => (
                    <Link key={a.id} href={`/results/${a.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-card/60 transition-colors">
                      <div>
                        <div className="text-sm font-medium">{TYPE_LABEL[a.test_type as string] || "Mock attempt"}</div>
                        <div className="text-xs text-muted-foreground mt-1">{a.completed_at ? new Date(a.completed_at).toLocaleString() : ""}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-display text-2xl font-bold">{a.total_score}</div>
                          <div className="text-xs text-muted-foreground">/ 100</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
