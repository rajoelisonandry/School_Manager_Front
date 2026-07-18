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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      {
        name: "Tableau de bord",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Vue d'ensemble des statistiques de l'établissement",
      },
    ],
  },
  {
    label: "Établissement",
    items: [
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
    ],
  },
  {
    label: "Paiements",
    items: [
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
        description: "Voir qui a payé l'écolage et les autres frais, mois par mois",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        name: "Utilisateurs",
        href: "/dashboard/users",
        icon: UserCog,
        adminOnly: true,
        description: "Gérer les comptes administrateurs et contributeurs",
      },
    ],
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
          <div className="p-5 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lycée Privé
                </p>
                <h1 className="truncate text-lg font-bold leading-tight text-foreground">
                  Au Bel Enfant
                </h1>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Changer de thème"
                  className="shrink-0"
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
          <nav className="flex-1 overflow-y-auto p-3 space-y-5">
            {navigationGroups.map((group) => {
              const items = group.items.filter(
                (item) => !item.adminOnly || user?.role === "admin"
              );
              if (items.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isActive
                                    ? "bg-white/15"
                                    : "bg-muted text-muted-foreground group-hover:bg-background"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-medium">{item.name}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.description}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
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
            <div className="text-center">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lycée Privé
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Au Bel Enfant
              </h1>
            </div>
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
