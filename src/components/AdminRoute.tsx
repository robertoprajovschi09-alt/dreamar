import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!profile?.is_saas_admin) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}
