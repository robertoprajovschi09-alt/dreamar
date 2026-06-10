import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Check, BarChart3, Users, Calendar, Video, FileText, Sparkles, Shield, Zap } from "lucide-react";

const plans = [
  { tier: "Starter", price: 99, features: ["5 clienți", "1 proprietar", "Rapoarte de bază", "Calendar de conținut", "Spațiu pentru documente"] },
  { tier: "Creștere", price: 150, features: ["15 clienți", "3 membri în echipă", "Rapoarte cu AI", "Portal pentru client", "Dashboard pe nișă", "Flux de aprobări"], featured: true },
  { tier: "Nelimitat", price: 249, features: ["Clienți nelimitați", "Echipă nelimitată", "Rapoarte white-label", "Cameră de strategie AI", "Statistici avansate", "Monitor concurență"] },
  { tier: "White Label Pro", price: 399, features: ["Tot din Nelimitat", "Branding personalizat", "Domeniu propriu", "Permisiuni avansate", "Rapoarte PDF premium"] },
];

const modules = [
  { icon: BarChart3, title: "Panou pentru agenție", desc: "Toți indicatorii tăi, top videoclipuri, sarcini restante, alerte AI și sănătatea clienților, într-un singur loc." },
  { icon: Users, title: "Gestionare clienți", desc: "Dashboard-uri specifice pe nișă: imobiliare, restaurante, clinici, săli de fitness și multe altele." },
  { icon: Calendar, title: "Calendar de conținut", desc: "Planifică, atribuie, aprobă și publică conținut printr-un flux cu 9 stări clare." },
  { icon: Video, title: "Performanță video", desc: "Urmărești peste 25 de indicatori per video — hook, retenție, finalizare, mesaje, impact real în vânzări." },
  { icon: Sparkles, title: "Rapoarte lunare cu AI", desc: "Generezi rapoarte PDF white-label premium, cu rezumat executiv și strategia pentru luna următoare." },
  { icon: FileText, title: "Bibliotecă de documente", desc: "Foldere per client, sumarizări cu AI, fișiere de brand, brief-uri — căutabile și etichetate." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Intră în cont</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Începe gratuit</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 py-20 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" /> Construit pentru agenții de marketing orientate pe rezultate
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-[1.05]">
            Sistemul de operare care îți <span className="text-gradient-accent">conduce toată agenția</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
            Gestionezi clienți, planifici conținut, urmărești impactul real în business al fiecărui video și generezi rapoarte lunare cu AI — totul dintr-un singur loc.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link to="/auth"><Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">Începe perioada gratuită de 14 zile <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Vezi prețurile</Button></Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Fără card</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Anulezi oricând</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Gata în 60 de secunde</div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">Totul într-un singur loc</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Renunță la 12 unelte lipite cu scotch.</h2>
          <p className="text-muted-foreground mt-3">De la onboarding-ul clientului până la raportul lunar, Dreamar înlocuiește spreadsheet-urile, documentele, calendarele și trackerele tale.</p>
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
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">Prețuri</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Planuri care cresc odată cu agenția ta.</h2>
          <p className="text-muted-foreground mt-3">Toate planurile includ 14 zile gratuite.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.tier} className={`rounded-xl border p-6 ${p.featured ? "border-accent bg-gradient-surface shadow-glow" : "border-border bg-card"}`}>
              {p.featured && <div className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2">Cel mai popular</div>}
              <h3 className="font-semibold">{p.tier}</h3>
              <div className="mt-3 mb-4">
                <span className="text-4xl font-bold metric-number">€{p.price}</span>
                <span className="text-sm text-muted-foreground">/lună</span>
              </div>
              <Link to="/auth"><Button className={`w-full mb-4 ${p.featured ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`} variant={p.featured ? "default" : "outline"}>Începe gratuit</Button></Link>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Gata să îți conduci agenția ca un profesionist?</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Alătură-te agențiilor orientate pe performanță care înlocuiesc spreadsheet-urile cu un sistem de operare adevărat.</p>
          <Link to="/auth"><Button size="lg" className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow">Începe gratuit <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Spații de lucru sigure pentru fiecare agenție</span>
            <span>© {new Date().getFullYear()} Dreamar</span>
            <Link to="/admin-login" className="text-muted-foreground/50 hover:text-foreground transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
