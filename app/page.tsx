import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, FileText, Mail, Sparkles, Shield, BarChart3, CheckCircle2 } from "lucide-react";

const features = [
  { icon: FileText, title: "Real Exam Pattern", desc: "Exact TCS NQT Verbal pattern — Fill in the Blanks, Passage Recall, Email Writing." },
  { icon: Sparkles, title: "AI-Powered Questions", desc: "Fresh questions every attempt via Groq Llama 3.3 70B — never repeat the same test." },
  { icon: Clock, title: "Strict Timer & Auto-Submit", desc: "Identical to the live exam: 25s per blank, 30+90s per passage, 540s for email." },
  { icon: Shield, title: "Anti-Cheat Engine", desc: "Tab-switch detection, fullscreen lock, copy/paste disabled, violation tracking." },
  { icon: BarChart3, title: "Granular Analytics", desc: "Section-wise scores, weak areas, category breakdown, performance trends." },
  { icon: Mail, title: "AI Evaluator", desc: "Passage recall scored on meaning — not memorization. Email scored on tone & structure." },
];

const sections = [
  { num: "01", title: "Fill in the Blanks", meta: "20 Questions × 25s each", desc: "Vocabulary, grammar, business English, technology and corporate communication." },
  { num: "02", title: "Passage Recall", meta: "4 Passages × (30s read + 90s write)", desc: "Read a short passage, then reproduce its meaning in your own words." },
  { num: "03", title: "Email Writing", meta: "1 Email × 540s · Min 100 words", desc: "A realistic workplace scenario. Demonstrate professional business communication." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-grid">
      {/* Subtle blue glow */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />

      {/* Nav */}
      <nav className="container relative z-10 flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">TCS NQT Simulator</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
          <Link href="/signup"><Button size="sm">Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container relative z-10 pt-16 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Production-grade simulator · Powered by Llama 3.3 70B
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05]">
            Practice TCS NQT Verbal like you&apos;re sitting in the
            <span className="text-primary"> real exam.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            25 questions. Three timed sections. AI-generated content for every attempt. AI evaluation that grades on meaning — not memorization.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup"><Button size="lg" className="group">Start Free Test <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Button></Link>
            <Link href="#pattern"><Button size="lg" variant="outline">View Exam Pattern</Button></Link>
          </div>
          <div className="mt-10 grid grid-cols-3 max-w-md gap-6">
            {[{n: "25", l: "Questions"}, {n: "3", l: "Sections"}, {n: "AI", l: "Evaluation"}].map((s) => (
              <div key={s.l}>
                <div className="font-display text-3xl font-bold">{s.n}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exam Pattern */}
      <section id="pattern" className="container relative z-10 py-20">
        <div className="mb-12">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Exam Pattern</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">Three sections. One real exam experience.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.num} className="group transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <div className="font-display text-5xl font-bold text-primary/30 mb-4">{s.num}</div>
                <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                <p className="text-xs uppercase tracking-wider text-primary mt-1">{s.meta}</p>
                <p className="text-sm text-muted-foreground mt-4">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container relative z-10 py-20">
        <div className="mb-12">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Why this platform</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">Built like a corporate assessment portal.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-colors hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mt-4">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container relative z-10 py-20">
        <Card className="overflow-hidden border-primary/30">
          <CardContent className="p-12 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            <div className="relative">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <h2 className="font-display text-3xl sm:text-4xl font-bold mt-4">Ready to simulate the real exam?</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Sign up and start a complete TCS NQT Verbal mock in under 30 seconds.</p>
              <Link href="/signup" className="inline-block mt-6">
                <Button size="lg" className="group">Start Free Test <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="container relative z-10 py-10 border-t border-border mt-10">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} TCS NQT Verbal Simulator. Not affiliated with TCS.</p>
      </footer>
    </div>
  );
}
