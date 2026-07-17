"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, GraduationCap, Wallet, TrendingUp, Info, BarChart3, LayoutDashboard } from "lucide-react";
import { getStudents } from "./students/actions";
import { getClasses } from "./classes/actions";
import { getPayments } from "./payments/actions";
import { CollectedPaymentsChart } from "@/components/collected-payments-chart";
import { PageHeader } from "@/components/page-header";

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

export default function DashboardPage() {
  const { user: currentUser } = useAuth();
  const canSeeStats = currentUser?.role === "admin";
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [studentsByLevel, setStudentsByLevel] = useState<Record<string, number>>({});
  const [recentPayments, setRecentPayments] = useState<
    Awaited<ReturnType<typeof getPayments>>
  >([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPayments>>>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [students, classes, payments] = await Promise.all([
        getStudents(),
        getClasses(),
        getPayments(),
      ]);

      setTotalStudents(students.length);
      setTotalClasses(classes.length);

      const byLevel: Record<string, number> = {};
      for (const cls of classes) {
        const count = cls._count?.students ?? 0;
        if (count > 0) {
          byLevel[cls.level] = (byLevel[cls.level] || 0) + count;
        }
      }
      setStudentsByLevel(byLevel);

      setRecentPayments(payments.slice(0, 5));
      setPayments(payments);
      setTotalCollected(payments.reduce((sum, p) => sum + p.amountPaid, 0));
      setTotalExpected(payments.reduce((sum, p) => sum + p.amountDue, 0));

      setIsLoading(false);
    };
    loadData();
  }, []);

  const totalPending = totalExpected - totalCollected;
  const progress = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Tableau de bord"
        subtitle="Vue d'ensemble de l'établissement scolaire"
      />

      {/* Statistics Cards */}
      <div className={`grid gap-6 md:grid-cols-2 ${canSeeStats ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-1.5">
              Total Élèves
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Nombre total d&apos;élèves enregistrés, tous statuts confondus
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalStudents}</div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
            <p className="text-xs text-blue-100 mt-2">
              Répartis dans {totalClasses} classes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-1.5">
              Total Classes
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Nombre de classes actives dans l&apos;établissement
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalClasses}</div>
              <GraduationCap className="h-8 w-8 text-green-200" />
            </div>
            <p className="text-xs text-green-100 mt-2">
              Classes actives
            </p>
          </CardContent>
        </Card>

        {canSeeStats && (
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-1.5">
              Paiements Collectés
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Somme totale déjà payée par les élèves, sur le total attendu
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{formatAriary(totalCollected)}</div>
              <Wallet className="h-8 w-8 text-amber-200" />
            </div>
            <p className="text-xs text-amber-100 mt-2">
              Sur {formatAriary(totalExpected)} attendu
            </p>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students by Level */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Élèves par Niveau
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Répartition des élèves inscrits par niveau (primaire, collège, lycée)
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(studentsByLevel).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{level}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${totalStudents > 0 ? (count / totalStudents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(studentsByLevel).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnée disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Paiements Récents
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Les 5 derniers paiements enregistrés</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {payment.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paymentTypeName} · {payment.month} {payment.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatAriary(payment.amountPaid)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.paymentDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
              {recentPayments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun paiement récent
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Overview */}
      {canSeeStats && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aperçu des Paiements
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Répartition du montant collecté, en attente et attendu sur l&apos;ensemble des paiements
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Collecté</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatAriary(totalCollected)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">En Attente</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatAriary(totalPending)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Attendu</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatAriary(totalExpected)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Collected Payments Over Time */}
      {canSeeStats && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Paiements Collectés dans le Temps
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Montant collecté regroupé par jour, semaine ou mois
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CollectedPaymentsChart payments={payments} />
        </CardContent>
      </Card>
      )}
    </div>
  );
}
