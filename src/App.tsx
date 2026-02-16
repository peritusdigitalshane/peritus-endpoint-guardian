import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Endpoints from "./pages/Endpoints";
import Groups from "./pages/Groups";
import Threats from "./pages/Threats";
import Policies from "./pages/Policies";
import AgentDownload from "./pages/AgentDownload";
import EventLogs from "./pages/EventLogs";
import Activity from "./pages/Activity";
import Admin from "./pages/Admin";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Recommendations from "./pages/Recommendations";
import ThreatHunting from "./pages/ThreatHunting";
import Network from "./pages/Network";
import Routers from "./pages/Routers";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/endpoints"
                element={
                  <ProtectedRoute>
                    <Endpoints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <ProtectedRoute>
                    <Groups />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/threats"
                element={
                  <ProtectedRoute>
                    <Threats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/policies"
                element={
                  <ProtectedRoute>
                    <Policies />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deploy"
                element={
                  <ProtectedRoute>
                    <AgentDownload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute>
                    <EventLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/threat-hunting"
                element={
                  <ProtectedRoute>
                    <ThreatHunting />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <Activity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/network"
                element={
                  <ProtectedRoute>
                    <Network />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/routers"
                element={
                  <ProtectedRoute>
                    <Routers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
