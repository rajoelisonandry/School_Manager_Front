"use client";

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
import classesData from "@/lib/data/classes.json";
import studentsData from "@/lib/data/students.json";

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
  enrollmentDate: string;
  status: string;
}

export default function ClassStudentsPage({
  params,
}: {
  params: { classId: string };
}) {
  const router = useRouter();
  const classes = classesData.classes;
  const students = studentsData.students;

  const selectedClass = classes.find((c) => c.id === params.classId);
  const classStudents = students.filter((s) => s.classId === params.classId);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
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
                      {student.firstName} {student.lastName}
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
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
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
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Élèves</p>
              <p className="text-2xl font-bold text-blue-700">
                {classStudents.length}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Places Disponibles</p>
              <p className="text-2xl font-bold text-green-700">
                {selectedClass.capacity - classStudents.length}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-600 font-medium">Taux d'Occupation</p>
              <p className="text-2xl font-bold text-amber-700">
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
