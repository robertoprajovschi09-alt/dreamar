import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Moon, Sun, Calendar as CalendarIcon, FileVideo, BarChart3, ListTodo, Megaphone, FolderOpen, FileText, Sparkles, ShieldCheck, BookmarkPlus, ClipboardCheck, Lightbulb, Target, UserCog, CreditCard, Settings as SettingsIcon, ChevronDown, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { hexToHslTriplet, adjustLightness } from "@/lib/color";

import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/hooks/use-theme";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/agency", icon: LayoutDashboard, label: "Panou", end: true },
  { to: "/agency/clients", icon: Users, label: "Clienți" },
  { to: "/agency/content", icon: FileVideo, label: "Conținut" },
  { to: "/agency/calendar", icon: CalendarIcon, label: "Calendar" },
  { to: "/agency/approvals", icon: ClipboardCheck, label: "Aprobări" },
  { to: "/agency/analytics", icon: BarChart3, label: "Statistici" },
  { to: "/agency/reports", icon: FileText, label: "Rapoarte" },
];

const secondaryNav = [
  { to: "/agency/campaigns", icon: Megaphone, label: "Campanii" },
  { to: "/agency/strategies", icon: Lightbulb, label: "Strategii" },
  { to: "/agency/tasks", icon: ListTodo, label: "Sarcini" },
  { to: "/agency/documents", icon: FolderOpen, label: "Documente" },
  { to: "/agency/swipe", icon: BookmarkPlus, label: "Inspirație" },
  { to: "/agency/competitors", icon: Target, label: "Concurență" },
  { to: "/agency/assistant", icon: Sparkles, label: "Asistent" },
];

const remainingNav = [
  { to: "/agency/settings", icon: SettingsIcon, label: "Setări" },
];

const soonNav = [
  { to: "/agency/team", icon: UserCog, label: "Echipă" },
  { to: "/agency/billing", icon: CreditCard, label: "Facturare" },
];

const mobileNav = [...primaryNav, ...secondaryNav, ...remainingNav];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
    isActive
      ? "bg-accent/10 text-accent before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-accent"
      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
  );

const sectionLabelClass = "px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70";

export default function AgencyLayout() {
  const { signOut } = useAuth();
  const { profile, agency } = useUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const hex = agency?.brand_color?.trim();
    const hsl = hex ? hexToHslTriplet(hex) : null;
    if (!hsl) {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-glow");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
      return;
    }
    const glow = adjustLightness(hsl, 8);
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--accent-glow", glow);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-ring", hsl);
  }, [agency?.brand_color]);


  const mobilePrimary = [
    { to: "/agency", icon: LayoutDashboard, label: "Panou", end: true },
    { to: "/agency/clients", icon: Users, label: "Clienți" },
    { to: "/agency/content", icon: FileVideo, label: "Conținut" },
    { to: "/agency/approvals", icon: ClipboardCheck, label: "Aprobări" },
  ];
  const mobileMore = [
    { to: "/agency/calendar", icon: CalendarIcon, label: "Calendar" },
    { to: "/agency/analytics", icon: BarChart3, label: "Statistici" },
    { to: "/agency/reports", icon: FileText, label: "Rapoarte" },
    ...secondaryNav,
    ...remainingNav,
  ];



  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-20 flex items-center px-6">
          <Logo />
        </div>
        <nav className="flex-1 px-4 pb-6 space-y-0.5 overflow-y-auto">
          <div className={sectionLabelClass}>Meniu</div>
          {primaryNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navLinkClass}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}

          <Collapsible defaultOpen={false} className="pt-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>Mai multe</span>
              <ChevronDown className="h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pt-0.5">
              {secondaryNav.map((n) => (
                <NavLink key={n.to} to={n.to} className={navLinkClass}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <div className={sectionLabelClass}>General</div>
          {remainingNav.map((n) => (
            <NavLink key={n.to} to={n.to} className={navLinkClass}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}

          {profile?.is_saas_admin && (
            <>
              <div className={sectionLabelClass}>Administrare</div>
              {[
                { to: "/admin", label: "Administrare SaaS" },
                { to: "/agency/admin/ai-prompts", label: "Prompt-uri AI" },
                { to: "/agency/admin/ai-logs", label: "Loguri AI" },
                { to: "/agency/admin/ai-safety", label: "Siguranță AI" },
                { to: "/agency/admin/ai-maintainer", label: "Mentenanță AI" },
                { to: "/agency/admin/ai-actions", label: "Aprobări acțiuni AI" },
                { to: "/agency/admin/continuous-improvement", label: "Îmbunătățire continuă" },
              ].map((a) => (
                <NavLink key={a.to} to={a.to} className={navLinkClass}>
                  <ShieldCheck className="h-4 w-4" />
                  {a.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-4 md:px-8 gap-3 bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xl">
            <div className="hidden md:flex items-center gap-2 px-4 h-11 rounded-full bg-card shadow-soft border border-border/60 flex-1">
              <span className="text-muted-foreground text-sm">🔍</span>
              <span className="text-sm text-muted-foreground flex-1 truncate">{agency?.name || "Agenție"}</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 text-[10px] font-mono text-muted-foreground">⌘F</kbd>
            </div>
            <div className="md:hidden flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="truncate text-sm font-semibold">{agency?.name || "Agenție"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="h-10 w-10 rounded-full bg-card shadow-soft border border-border/60">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-11 flex items-center gap-2 pl-1.5 pr-4 rounded-full bg-card shadow-soft border border-border/60 hover:bg-surface-1 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[11px] bg-gradient-accent text-accent-foreground font-bold">
                      {initials(profile?.full_name || profile?.email || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
                    {profile?.email && profile?.full_name && (
                      <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">{profile.email}</span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel className="text-xs">
                  <div className="font-semibold truncate">{profile?.full_name || "Cont"}</div>
                  <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
                  {profile?.role && (
                    <Badge variant="secondary" className="mt-1 text-[10px] uppercase tracking-wide">{({ agency_owner: "Proprietar agenție", agency_team: "Echipă agenție", saas_admin: "Admin SaaS", client_viewer: "Client" } as Record<string, string>)[profile.role] || profile.role.replace("_", " ")}</Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {soonNav.map((n) => (
                  <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>
                    <n.icon className="h-4 w-4 mr-2" />
                    <span className="flex-1">{n.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Deconectare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur grid grid-cols-5 py-2">
          {mobilePrimary.map((n) => (
            <NavLink key={n.to} to={n.to} end={(n as any).end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 text-[11px] px-1 py-1", isActive ? "text-accent" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" /> {n.label}
            </NavLink>
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 text-[11px] px-1 py-1 text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" /> Mai multe
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Mai multe</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-1 gap-1">
                {mobileMore.map((n) => (
                  <SheetClose asChild key={n.to}>
                    <NavLink to={n.to} className={navLinkClass}>
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </NavLink>
                  </SheetClose>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </nav>


        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
