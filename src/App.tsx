import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { RoleRoute } from "@/components/RoleRoute";
import AgencyLayout from "@/components/AgencyLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import AgencyDashboard from "./pages/agency/AgencyDashboard";
import Clients from "./pages/agency/Clients";
import ClientProfile from "./pages/agency/ClientProfile";
import ClientPortal from "./pages/client/ClientPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                <Route
                  path="/agency"
                  element={
                    <RoleRoute allow={["agency_owner", "agency_team", "saas_admin"]}>
                      <AgencyLayout />
                    </RoleRoute>
                  }
                >
                  <Route index element={<AgencyDashboard />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="clients/:id" element={<ClientProfile />} />
                </Route>

                <Route
                  path="/client"
                  element={
                    <RoleRoute allow={["client_viewer"]}>
                      <ClientPortal />
                    </RoleRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
