import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Video, TrendingUp, FileText, ListChecks, CreditCard, Shield, LogOut, Moon, Sun, ChevronsUpDown, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { useTheme } from "@/hooks/use-theme";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/clients", icon: Users, label: "Clients" },
  { to: "/app/calendar", icon: Calendar, label: "Content Calendar" },
  { to: "/app/videos", icon: Video, label: "Video Tracker" },
  { to: "/app/impact", icon: TrendingUp, label: "Business Impact" },
  { to: "/app/documents", icon: FileText, label: "Documents" },
  { to: "/app/tasks", icon: ListChecks, label: "Tasks" },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const { agencies, currentAgency, currentRole, plan, switchAgency } = useAgency();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Logo />
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-foreground border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-sidebar-border space-y-0.5">
            <NavLink
              to="/app/billing"
              className={({ isActive }) =>
                cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-accent/10 text-foreground border-l-2 border-accent" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
              }
            >
              <CreditCard className="h-4 w-4" /> Billing
            </NavLink>
            {profile?.is_saas_admin && (
              <NavLink
                to="/app/admin"
                className={({ isActive }) =>
                  cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-accent/10 text-foreground border-l-2 border-accent" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
                }
              >
                <Shield className="h-4 w-4" /> Admin
              </NavLink>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {plan && (
            <div className="rounded-md bg-surface-2 p-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {plan.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {plan.max_clients ? `${plan.max_clients} clients` : "Unlimited clients"} · {plan.max_seats ? `${plan.max_seats} seats` : "Unlimited seats"}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={() => navigate("/app/billing")}>
                Manage plan
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 max-w-[260px]">
                  <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
                  <span className="truncate text-sm font-medium">{currentAgency?.name || "No agency"}</span>
                  {currentRole && <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{currentRole.replace("_"," ")}</Badge>}
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
                {agencies.map((a) => (
                  <DropdownMenuItem key={a.id} onClick={() => switchAgency(a.id)}>
                    <span className="h-2 w-2 rounded-full bg-accent mr-2" />
                    <span className="flex-1 truncate">{a.name}</span>
                    {a.id === currentAgency?.id && <span className="text-accent text-xs">●</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding")}>
                  <Plus className="h-4 w-4 mr-2" /> New agency
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <div className="font-semibold truncate">{profile?.full_name || "Account"}</div>
                  <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app/billing")}><CreditCard className="h-4 w-4 mr-2" /> Billing</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur flex justify-around py-2">
          {nav.slice(0, 5).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 text-[10px] px-2 py-1", isActive ? "text-accent" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" /> {n.label.split(" ")[0]}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
