import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { BookOpen, Building2, Calendar, History, Home, LogOut, MoreHorizontal, ScrollText, ShieldCheck, Smartphone, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useReminderScheduler } from "@/hooks/useReminderScheduler";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/reuniao", label: "Reunião", icon: Sparkles },
  { to: "/biblioteca", label: "Evangelho", icon: BookOpen },
  { to: "/agenda", label: "Agenda", icon: Calendar },
];

export const AppLayout = () => {
  const { user, loading } = useAuth();
  const { isAdminMaster } = useUserRole();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  useReminderScheduler();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2 group min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-soft transition-smooth group-hover:shadow-glow shrink-0">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-serif text-base sm:text-lg font-semibold text-primary truncate">Evangelho no Lar</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground -mt-0.5 hidden xs:block">Estudo & Harmonia</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-smooth flex items-center gap-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-secondary"
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && (user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex" title="Histórico de reuniões">
                  <Link to="/historico"><History className="h-4 w-4 mr-1" /> Histórico</Link>
                </Button>
                {isAdminMaster && (
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex" title="Revisão de capítulos">
                    <Link to="/revisao"><ShieldCheck className="h-4 w-4 mr-1" /> Revisão</Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex" title="Meus grupos">
                  <Link to="/grupos"><Building2 className="h-4 w-4 mr-1" /> Grupos</Link>
                </Button>
                {isAdminMaster && (
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex" title="Painel admin">
                    <Link to="/admin"><ShieldCheck className="h-4 w-4 mr-1" /> Admin</Link>
                  </Button>
                )}
                <NotificationBell />
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <Link to="/perfil"><User className="h-4 w-4 mr-1" /> Perfil</Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="md:hidden" title="Instalar app" aria-label="Instalar app">
                  <Link to="/instalar"><Smartphone className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="hero">
                <Link to="/auth">Entrar</Link>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-smooth min-h-[56px] justify-center",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-border/50 py-6 text-center text-xs text-muted-foreground bg-card/40">
        <p>Feito com serenidade • Inspirado em Allan Kardec</p>
      </footer>
    </div>
  );
};
