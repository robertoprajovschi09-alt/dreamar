import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Check, BarChart3, Users, Calendar, Video, FileText, Sparkles, Shield, Zap } from "lucide-react";

const plans = [
  { tier: "Starter Agency", price: 99, features: ["5 clients", "1 owner", "Basic reports", "Content calendar", "Document storage"] },
  { tier: "Growth Agency", price: 150, features: ["15 clients", "3 team members", "AI reports", "Client portal", "Niche dashboards", "Approval workflow"], featured: true },
  { tier: "Unlimited Agency", price: 249, features: ["Unlimited clients", "Unlimited team", "White-label reports", "AI Strategy Room", "Advanced analytics", "Competitor watch"] },
  { tier: "White Label Pro", price: 399, features: ["Everything in Unlimited", "Custom branding", "Custom domain", "Advanced permissions", "Premium PDF reports"] },
];

const modules = [
  { icon: BarChart3, title: "Agency Dashboard", desc: "All your KPIs, top videos, overdue tasks, AI alerts and client health in one place." },
  { icon: Users, title: "Client Management", desc: "Niche-specific dashboards for real estate, restaurants, dental clinics, fitness gyms and more." },
  { icon: Calendar, title: "Content Calendar", desc: "Plan, assign, approve, and ship content with a 9-stage status pipeline." },
  { icon: Video, title: "Video Performance Tracker", desc: "Track 25+ metrics per video — hooks, retention, completion, DMs, real sales impact." },
  { icon: Sparkles, title: "AI Monthly Reports", desc: "Generate premium, white-label PDF reports with executive summary and next-month strategy." },
  { icon: FileText, title: "Document Library", desc: "Per-client folders, AI summaries, brand files, briefs — searchable and tagged." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Start free trial</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 py-20 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" /> Built for performance-driven marketing agencies
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-[1.05]">
            The operating system that runs <span className="text-gradient-accent">your entire agency</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
            Manage clients, plan content, track every video's real business impact, and generate AI-powered monthly reports — all from one premium workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link to="/auth"><Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">Start 14-day free trial <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">See pricing</Button></Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> No credit card</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Cancel anytime</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Setup in 60 seconds</div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">Everything in one place</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Stop duct-taping 12 tools together.</h2>
          <p className="text-muted-foreground mt-3">From client onboarding to monthly reports, AgencyOS replaces your spreadsheets, docs, calendars, and trackers.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div key={m.title} className="rounded-lg border border-border bg-card p-6 hover:border-accent/40 hover:shadow-glow transition-all">
              <div className="h-10 w-10 rounded-md bg-accent/10 flex items-center justify-center mb-4"><m.icon className="h-5 w-5 text-accent" /></div>
              <h3 className="font-semibold">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Plans that scale with your agency.</h2>
          <p className="text-muted-foreground mt-3">All plans include 14-day free trial.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.tier} className={`rounded-xl border p-6 ${p.featured ? "border-accent bg-gradient-surface shadow-glow" : "border-border bg-card"}`}>
              {p.featured && <div className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2">Most popular</div>}
              <h3 className="font-semibold">{p.tier}</h3>
              <div className="mt-3 mb-4">
                <span className="text-4xl font-bold metric-number">€{p.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <Link to="/auth"><Button className={`w-full mb-4 ${p.featured ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`} variant={p.featured ? "default" : "outline"}>Start trial</Button></Link>
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" /><span>{f}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl border border-accent/30 bg-gradient-surface p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
          <Zap className="h-8 w-8 text-accent mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to run your agency like a pro?</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Join performance-focused agencies replacing spreadsheets with a real operating system.</p>
          <Link to="/auth"><Button size="lg" className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">Start your free trial <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure multi-tenant workspaces</span>
            <span>© {new Date().getFullYear()} AgencyOS AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
