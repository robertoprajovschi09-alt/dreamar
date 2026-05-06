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
import Calendar from "./pages/agency/Calendar";
import Content from "./pages/agency/Content";
import Tasks from "./pages/agency/Tasks";
import Campaigns from "./pages/agency/Campaigns";
import Documents from "./pages/agency/Documents";
import Reports from "./pages/agency/Reports";
import Assistant from "./pages/agency/Assistant";
import SwipeLibrary from "./pages/agency/SwipeLibrary";
import Approvals from "./pages/agency/Approvals";
import Strategies from "./pages/agency/Strategies";
import StrategyDetail from "./pages/agency/StrategyDetail";
import StrategyPrint from "./pages/agency/StrategyPrint";
import Analytics from "./pages/agency/Analytics";
import Competitors from "./pages/agency/Competitors";
import Team from "./pages/agency/Team";
import Billing from "./pages/agency/Billing";
import Settings from "./pages/agency/Settings";
import AiActions from "./pages/agency/AiActions";
import AiMemory from "./pages/agency/AiMemory";
import ClientPortal from "./pages/client/ClientPortal";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AiPrompts from "./pages/admin/AiPrompts";
import AiLogs from "./pages/admin/AiLogs";
import AiSafety from "./pages/admin/AiSafety";
import AiMaintainer from "./pages/admin/AiMaintainer";
import AiActionsApprovalQueue from "./pages/admin/AiActionsApprovalQueue";
import ContinuousImprovement from "./pages/admin/ContinuousImprovement";
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
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="content" element={<Content />} />
                  <Route path="approvals" element={<Approvals />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="campaigns" element={<Campaigns />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="strategies" element={<Strategies />} />
                  <Route path="strategies/:id" element={<StrategyDetail />} />
                  <Route path="strategies/:id/print" element={<StrategyPrint />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="swipe" element={<SwipeLibrary />} />
                  <Route path="competitors" element={<Competitors />} />
                  <Route path="assistant" element={<Assistant />} />
                  <Route path="team" element={<Team />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="ai-actions" element={<AiActions />} />
                  <Route path="ai-memory" element={<AiMemory />} />
                  <Route path="admin/ai-prompts" element={<AiPrompts />} />
                  <Route path="admin/ai-logs" element={<AiLogs />} />
                  <Route path="admin/ai-safety" element={<AiSafety />} />
                  <Route path="admin/ai-maintainer" element={<AiMaintainer />} />
                  <Route path="admin/ai-actions" element={<AiActionsApprovalQueue />} />
                </Route>

                <Route
                  path="/client"
                  element={
                    <RoleRoute allow={["client_viewer"]}>
                      <ClientPortal />
                    </RoleRoute>
                  }
                />

                <Route path="/admin" element={<AdminDashboard />} />

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
