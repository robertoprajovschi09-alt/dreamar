import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Moon, Sun, Calendar as CalendarIcon, FileVideo, BarChart3, ListTodo, Megaphone, FolderOpen, FileText, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/hooks/use-theme";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/agency", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/agency/clients", icon: Users, label: "Clients" },
  { to: "/agency/calendar", icon: CalendarIcon, label: "Calendar" },
  { to: "/agency/content", icon: FileVideo, label: "Content" },
  { to: "/agency/performance", icon: BarChart3, label: "Performance" },
  { to: "/agency/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/agency/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/agency/documents", icon: FolderOpen, label: "Documents" },
  { to: "/agency/reports", icon: FileText, label: "Reports" },
  { to: "/agency/risk", icon: AlertTriangle, label: "Risk" },
  { to: "/agency/assistant", icon: Sparkles, label: "Assistant" },
];

export default function AgencyLayout() {
  const { signOut } = useAuth();
  const { profile, agency } = useUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
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
          {profile?.is_saas_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-2 border-t border-border pt-3",
                  isActive
                    ? "bg-accent/10 text-foreground border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <ShieldCheck className="h-4 w-4" />
              SaaS admin
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="truncate text-sm font-medium">{agency?.name || "Agency"}</span>
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
                  <div className="font-semibold truncate">{profile?.full_name || "Account"}</div>
                  <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur flex justify-around py-2">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 text-[11px] px-3 py-1", isActive ? "text-accent" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" /> {n.label}
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
