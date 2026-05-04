import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

export function RoleRoute({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: userLoading } = useUser();
  const location = useLocation();

  if (authLoading || userLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  const role = profile?.role;

  if (!role) {
    // Logged in but no role yet — likely a brand-new account whose trigger is still finishing,
    // or an invitee who hasn't accepted any invite. Send to /auth which will route them.
    return <Navigate to="/auth" replace />;
  }

  if (!allow.includes(role)) {
    if (role === "client_viewer") return <Navigate to="/client" replace />;
    if (role === "agency_owner" || role === "agency_team") return <Navigate to="/agency" replace />;
    if (role === "saas_admin") return <Navigate to="/agency" replace />;
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export function roleHome(role: Role | null | undefined): string {
  if (role === "client_viewer") return "/client";
  if (role === "agency_owner" || role === "agency_team" || role === "saas_admin") return "/agency";
  return "/auth";
}
