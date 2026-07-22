"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { getClasses } from "../actions";
import { getStudents } from "../../students/actions";
import { TableSkeleton, StatCardsSkeleton } from "@/components/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  classId: string;
  gender: string;
  address: string;
  phones: string[];
  fatherName: string;
  fatherProfession: string;
  motherName: string;
  motherProfession: string;
  status: string;
}

interface ClassInfo {
  id: string;
  name: string;
  capacity: number;
}

export default function ClassStudentsPage({
  params,
}: {
  params: { classId: string };
}) {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [classes, students] = await Promise.all([getClasses(), getStudents()]);
      setSelectedClass(classes.find((c) => c.id === params.classId) ?? null);
      setClassStudents(students.filter((s) => s.classId === params.classId));
      setIsLoading(false);
    };
    loadData();
  }, [params.classId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Skeleton className="h-9 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
        <TableSkeleton rows={5} cols={8} headerControls={0} />
        <StatCardsSkeleton count={3} />
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Classe non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {selectedClass.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Élèves de la classe ({classStudents.length})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Capacité: {selectedClass.capacity}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Élèves</CardTitle>
        </CardHeader>
        <CardContent>
          {classStudents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom Complet</TableHead>
                  <TableHead>Date de Naissance</TableHead>
                  <TableHead>Sexe</TableHead>
                  <TableHead>Téléphone(s)</TableHead>
                  <TableHead>Père</TableHead>
                  <TableHead>Mère</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.matricule}</TableCell>
                    <TableCell className="font-medium">
                      {student.lastName} {student.firstName}
                    </TableCell>
                    <TableCell>
                      {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {student.gender === "M" ? "Masculin" : "Féminin"}
                    </TableCell>
                    <TableCell>{student.phones?.join(", ") || "-"}</TableCell>
                    <TableCell>{student.fatherName || "-"}</TableCell>
                    <TableCell>{student.motherName || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {student.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucun élève inscrit dans cette classe
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques de la Classe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Élèves</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {classStudents.length}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Places Disponibles</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {selectedClass.capacity - classStudents.length}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Taux d'Occupation</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {((classStudents.length / selectedClass.capacity) * 100).toFixed(
                  0
                )}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
