"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, FileText, Info } from "lucide-react";
import { getStudents } from "../students/actions";
import { getClasses } from "../classes/actions";
import { exportCertificatScolaritePdf } from "@/lib/pdf/certificat-scolarite-pdf";
import { PageHeader } from "@/components/page-header";
import { PageHeaderSkeleton } from "@/components/loading-skeletons";
import { currentSchoolYear, schoolYearOptions } from "@/lib/school-year";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  classId: string;
  gender: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const ALL_CLASSES = "all";

export default function CertificatScolaritePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);
  const [studentId, setStudentId] = useState("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  useEffect(() => {
    Promise.all([getStudents(), getClasses()]).then(([s, c]) => {
      setStudents(s);
      setClasses(c);
      setIsLoading(false);
    });
  }, []);

  const studentsForSelect =
    classFilter === ALL_CLASSES ? students : students.filter((s) => s.classId === classFilter);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const selectedClassName =
    classes.find((c) => c.id === selectedStudent?.classId)?.name ?? "-";

  const handleClassFilterChange = (value: string) => {
    setClassFilter(value);
    setStudentId((current) => {
      const stillValid = students.some(
        (s) => s.id === current && (value === ALL_CLASSES || s.classId === value)
      );
      return stillValid ? current : "";
    });
  };

  const handleGenerate = () => {
    if (!selectedStudent) return;
    exportCertificatScolaritePdf(
      {
        matricule: selectedStudent.matricule,
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        dateOfBirth: selectedStudent.dateOfBirth,
        placeOfBirth: selectedStudent.placeOfBirth,
        gender: selectedStudent.gender,
      },
      selectedClassName,
      schoolYear
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Certificat de Scolarité"
        subtitle="Générer un certificat de scolarité pour un élève"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Choisir un élève</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select value={classFilter} onValueChange={handleClassFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>Toutes les classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Élève<span className="text-destructive">*</span>
              </label>
              <SearchableSelect
                value={studentId}
                onValueChange={setStudentId}
                placeholder="Sélectionner un élève"
                searchPlaceholder="Matricule, nom ou prénom..."
                emptyMessage="Aucun élève dans cette classe"
                options={studentsForSelect.map((student) => ({
                  value: student.id,
                  label: `${student.matricule} - ${student.lastName} ${student.firstName}`,
                  keywords: `${student.matricule} ${student.firstName} ${student.lastName}`,
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                Année scolaire
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56">
                    L&apos;année scolaire imprimée sur le certificat
                  </TooltipContent>
                </Tooltip>
              </label>
              <Select value={schoolYear} onValueChange={setSchoolYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schoolYearOptions().map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button onClick={handleGenerate} disabled={!selectedStudent} className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Générer le PDF
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Certificat officiel attestant l&apos;inscription de l&apos;élève
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className="space-y-1 text-center">
                <p className="font-semibold text-foreground">
                  {selectedStudent.lastName} {selectedStudent.firstName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Matricule {selectedStudent.matricule}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedClassName} — {schoolYear}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sélectionnez un élève pour voir l&apos;aperçu
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
