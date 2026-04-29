import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Reuniao from "./pages/Reuniao";
import Biblioteca from "./pages/Biblioteca";
import Leitor from "./pages/Leitor";
import Agenda from "./pages/Agenda";
import Perfil from "./pages/Perfil";
import Revisao from "./pages/Revisao";
import RevisaoCapitulo from "./pages/RevisaoCapitulo";
import Historico from "./pages/Historico";
import MeetingDetail from "./pages/MeetingDetail";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Tenants from "./pages/Tenants";
import TenantMembers from "./pages/TenantMembers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/reuniao" element={<Reuniao />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/biblioteca/:slug" element={<Leitor />} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/revisao" element={<ProtectedRoute><Revisao /></ProtectedRoute>} />
              <Route path="/revisao/:slug" element={<ProtectedRoute><RevisaoCapitulo /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
              <Route path="/historico/:id" element={<ProtectedRoute><MeetingDetail /></ProtectedRoute>} />
              <Route path="/grupos" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
              <Route path="/grupos/:id" element={<ProtectedRoute><TenantMembers /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
