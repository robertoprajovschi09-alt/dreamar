import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Moon, Sun, Calendar as CalendarIcon, FileVideo, BarChart3, ListTodo, Megaphone, FolderOpen, FileText, Sparkles, ShieldCheck, BookmarkPlus, ClipboardCheck, Lightbulb, Target, UserCog, CreditCard, Settings as SettingsIcon, ChevronDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
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
  { to: "/agency/analytics", icon: BarChart3, label: "Analitice" },
  { to: "/agency/reports", icon: FileText, label: "Rapoarte" },
];

const secondaryNav = [
  { to: "/agency/campaigns", icon: Megaphone, label: "Campanii" },
  { to: "/agency/strategies", icon: Lightbulb, label: "Strategii" },
  { to: "/agency/tasks", icon: ListTodo, label: "Sarcini" },
  { to: "/agency/documents", icon: FolderOpen, label: "Documente" },
  { to: "/agency/swipe", icon: BookmarkPlus, label: "Bibliotecă idei" },
  { to: "/agency/competitors", icon: Target, label: "Concurenți" },
  { to: "/agency/assistant", icon: Sparkles, label: "Asistent AI" },
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
    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
    isActive
      ? "bg-accent/10 text-foreground border-l-2 border-accent"
      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
  );

export default function AgencyLayout() {
  const { signOut } = useAuth();
  const { profile, agency } = useUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const mobilePrimary = [
    { to: "/agency", icon: LayoutDashboard, label: "Panou", end: true },
    { to: "/agency/clients", icon: Users, label: "Clienți" },
    { to: "/agency/content", icon: FileVideo, label: "Conținut" },
    { to: "/agency/approvals", icon: ClipboardCheck, label: "Aprobări" },
  ];
  const mobileMore = [
    { to: "/agency/calendar", icon: CalendarIcon, label: "Calendar" },
    { to: "/agency/analytics", icon: BarChart3, label: "Analitice" },
    { to: "/agency/reports", icon: FileText, label: "Rapoarte" },
    ...secondaryNav,
    ...remainingNav,
  ];



  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Logo />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {primaryNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navLinkClass}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}

          <Collapsible defaultOpen={false} className="pt-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors [&[data-state=open]>svg]:rotate-180">
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

          {remainingNav.map((n) => (
            <NavLink key={n.to} to={n.to} className={navLinkClass}>
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}

          {profile?.is_saas_admin && (
            <>
              <div className="mt-3 pt-3 border-t border-border" />
              {[
                { to: "/admin", label: "SaaS admin" },
                { to: "/agency/admin/ai-prompts", label: "AI Prompts" },
                { to: "/agency/admin/ai-logs", label: "AI Logs" },
                { to: "/agency/admin/ai-safety", label: "AI Safety" },
                { to: "/agency/admin/ai-maintainer", label: "AI Maintainer" },
                { to: "/agency/admin/ai-actions", label: "AI Action Approvals" },
                { to: "/agency/admin/continuous-improvement", label: "Continuous Improvement" },
              ].map((a) => (
                <NavLink
                  key={a.to}
                  to={a.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-foreground border-l-2 border-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  {a.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="truncate text-sm font-medium">{agency?.name || "Agenție"}</span>
            {profile?.role && <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{profile.role.replace("_", " ")}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="h-9 w-9">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[11px] bg-accent text-accent-foreground">
                      {initials(profile?.full_name || profile?.email || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  <div className="font-semibold truncate">{profile?.full_name || "Cont"}</div>
                  <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {soonNav.map((n) => (
                  <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>
                    <n.icon className="h-4 w-4 mr-2" />
                    <span className="flex-1">{n.label}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-wide">În curând</Badge>
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
