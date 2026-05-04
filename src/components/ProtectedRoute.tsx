import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/contexts/AgencyContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { agencies, loading: agencyLoading } = useAgency();

  if (loading || agencyLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (agencies.length === 0) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
