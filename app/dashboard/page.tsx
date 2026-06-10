import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SignOutButton from "./sign-out-button";
import { ArrowRight, BarChart3, Clock, FileText, Mail, TrendingUp, Trophy } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id,total_score,fill_blank_score,passage_score,email_score,completed_at,status")
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
            <p className="text-muted-foreground mt-2">Track performance and start a new mock exam.</p>
          </div>
          <Link href="/exam/section1">
            <Button size="lg" className="group" data-testid="start-exam-button">
              Start New Mock <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
                <div className="font-display text-4xl font-bold mt-3" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sections preview */}
        <div className="grid gap-4 md:grid-cols-3 mt-10">
          {[
            { icon: FileText, num: "01", title: "Fill in the Blanks", meta: "20 questions × 25s" },
            { icon: BarChart3, num: "02", title: "Passage Recall", meta: "4 passages × 30s + 90s" },
            { icon: Mail, num: "03", title: "Email Writing", meta: "1 prompt × 540s · min 100 words" },
          ].map((s) => (
            <Card key={s.num}>
              <CardContent className="p-6">
                <s.icon className="h-5 w-5 text-primary" />
                <div className="font-display text-3xl font-bold text-primary/40 mt-4">{s.num}</div>
                <h3 className="font-display text-lg font-semibold mt-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.meta}</p>
              </CardContent>
            </Card>
          ))}
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
                        <div className="text-sm font-medium">Mock attempt</div>
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
