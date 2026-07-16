"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, DollarSign, TrendingUp } from "lucide-react";
import studentsData from "@/lib/data/students.json";
import classesData from "@/lib/data/classes.json";
import teachersData from "@/lib/data/teachers.json";
import tuitionData from "@/lib/data/tuition.json";

export default function DashboardPage() {
  const students = studentsData.students;
  const classes = classesData.classes;
  const teachers = teachersData.teachers;
  const tuitions = tuitionData.tuitions;

  // Calculate statistics
  const totalStudents = students.length;
  const totalClasses = classes.length;
  const totalTeachers = teachers.length;
  
  // Calculate total tuition and paid amount
  const totalTuition = tuitions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalPaid = tuitions.reduce((sum, t) => sum + t.totalPaid, 0);
  const totalPending = totalTuition - totalPaid;

  // Calculate students by level
  const studentsByLevel = classes.reduce((acc, cls) => {
    const studentCount = students.filter(s => s.classId === cls.id).length;
    if (studentCount > 0) {
      acc[cls.level] = (acc[cls.level] || 0) + studentCount;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get recent payments
  const recentPayments = tuitions.flatMap(t => 
    t.monthlyPayments
      .filter(p => p.status === "paid")
      .map(p => ({
        month: p.month,
        amount: p.amount,
        date: p.paymentDate,
        studentId: t.studentId
      }))
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-muted-foreground mt-2">
          Vue d'ensemble de l'établissement scolaire
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Total Élèves
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
            <CardTitle className="text-sm font-medium text-green-100">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalClasses}</div>
              <GraduationCap className="h-8 w-8 text-green-200" />
            </div>
            <p className="text-xs text-green-100 mt-2">
              Du 13 ème à la Terminale
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">
              Total Professeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalTeachers}</div>
              <BookOpen className="h-8 w-8 text-primary-foreground/60" />
            </div>
            <p className="text-xs text-primary-foreground/80 mt-2">
              Personnel enseignant actif
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-100">
              Écolage Collecté
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalPaid.toLocaleString()} &nbsp; MGA</div>
              <DollarSign className="h-8 w-8 text-amber-200" />
            </div>
            <p className="text-xs text-amber-100 mt-2">
              Sur {totalTuition.toLocaleString()} &nbsp; MGA total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students by Level */}
        <Card>
          <CardHeader>
            <CardTitle>Élèves par Niveau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(studentsByLevel).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{level}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(count / totalStudents) * 100}%`,
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
            <CardTitle>Paiements Récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {payment.month}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.date ? new Date(payment.date).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {payment.amount} &nbsp; MGA
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Élève #{payment.studentId}
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

      {/* Tuition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aperçu de l'Écolage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Total Collecté</p>
              <p className="text-2xl font-bold text-green-700">
                {totalPaid.toLocaleString()} &nbsp; MGA
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-600 font-medium">En Attente</p>
              <p className="text-2xl font-bold text-amber-700">
                {totalPending.toLocaleString()} &nbsp; MGA
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Annuel</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalTuition.toLocaleString()} &nbsp; MGA
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">
                {((totalPaid / totalTuition) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                style={{ width: `${(totalPaid / totalTuition) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
