"use client";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  Wallet,
  Tag,
  UserCog,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

const navigation = [
  {
    name: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Vue d'ensemble des statistiques de l'établissement",
  },
  {
    name: "Élèves",
    href: "/dashboard/students",
    icon: Users,
    description: "Enregistrer et consulter les fiches des élèves",
  },
  {
    name: "Classes",
    href: "/dashboard/classes",
    icon: GraduationCap,
    description: "Gérer les classes et leurs effectifs",
  },
  {
    name: "Paiements",
    href: "/dashboard/payments",
    icon: DollarSign,
    description: "Enregistrer et consulter les paiements des élèves",
  },
  {
    name: "Types de Paiement",
    href: "/dashboard/payment-types",
    icon: Wallet,
    description: "Définir les catégories de frais (Écolage, Excursion, ...)",
  },
  {
    name: "Tarifs par Classe",
    href: "/dashboard/payment-type-rates",
    icon: Tag,
    description: "Définir un montant spécifique par classe et par année",
  },
  {
    name: "Suivi des Paiements",
    href: "/dashboard/payment-tracking",
    icon: CalendarCheck,
    adminOnly: true,
    description: "Voir qui a payé l'écolage et les autres frais, mois par mois",
  },
  {
    name: "Utilisateurs",
    href: "/dashboard/users",
    icon: UserCog,
    adminOnly: true,
    description: "Gérer les comptes administrateurs et contributeurs",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Au Bel Enfant</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Système de Gestion
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Changer de thème"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation
              .filter((item) => !item.adminOnly || user?.role === "admin")
              .map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-border">
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Fermer votre session</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <header className="bg-card border-b border-border lg:hidden sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-primary">
              Au Bel Enfant
            </h1>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
