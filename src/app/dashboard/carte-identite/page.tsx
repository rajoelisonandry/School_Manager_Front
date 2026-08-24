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
import { FileDown, IdCard, Info, Loader2, User, Users } from "lucide-react";
import { getStudents } from "../students/actions";
import { getClasses } from "../classes/actions";
import { exportCarteIdentitePdf, exportCarteIdentiteClassePdf } from "@/lib/pdf/carte-identite-pdf";
import { backendFileUrl } from "@/lib/backend/public-url";
import { PageHeader } from "@/components/page-header";
import { PageHeaderSkeleton } from "@/components/loading-skeletons";
import { currentSchoolYear, schoolYearOptions } from "@/lib/school-year";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classId: string;
  gender: string;
  address: string;
  phones: string[];
  identityPhotoUrl: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const ALL_CLASSES = "all";

export default function CarteIdentitePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);
  const [studentId, setStudentId] = useState("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingClass, setIsGeneratingClass] = useState(false);

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
  const selectedClassName = classes.find((c) => c.id === selectedStudent?.classId)?.name ?? "-";
  const filterClassName = classes.find((c) => c.id === classFilter)?.name ?? "-";

  const handleClassFilterChange = (value: string) => {
    setClassFilter(value);
    setStudentId((current) => {
      const stillValid = students.some(
        (s) => s.id === current && (value === ALL_CLASSES || s.classId === value)
      );
      return stillValid ? current : "";
    });
  };

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    try {
      await exportCarteIdentitePdf(
        {
          matricule: selectedStudent.matricule,
          firstName: selectedStudent.firstName,
          lastName: selectedStudent.lastName,
          dateOfBirth: selectedStudent.dateOfBirth,
          gender: selectedStudent.gender,
          address: selectedStudent.address,
          phones: selectedStudent.phones,
          identityPhotoUrl: backendFileUrl(selectedStudent.identityPhotoUrl) ?? undefined,
        },
        selectedClassName,
        schoolYear
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClass = async () => {
    if (classFilter === ALL_CLASSES || studentsForSelect.length === 0) return;
    setIsGeneratingClass(true);
    try {
      await exportCarteIdentiteClassePdf(
        studentsForSelect.map((student) => ({
          matricule: student.matricule,
          firstName: student.firstName,
          lastName: student.lastName,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          address: student.address,
          phones: student.phones,
          identityPhotoUrl: backendFileUrl(student.identityPhotoUrl) ?? undefined,
        })),
        filterClassName,
        schoolYear
      );
    } finally {
      setIsGeneratingClass(false);
    }
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
        icon={IdCard}
        title="Carte d'Identité Scolaire"
        subtitle="Générer la carte d'identité (recto/verso) d'un élève"
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
                    L&apos;année scolaire imprimée au dos de la carte
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

            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      onClick={handleGenerate}
                      disabled={!selectedStudent || isGenerating}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {isGenerating ? "Génération..." : "Générer le PDF"}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  PDF au format carte (85,6 × 54 mm) : recto identité, verso QR code et signatures
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="outline"
                      onClick={handleGenerateClass}
                      disabled={
                        classFilter === ALL_CLASSES ||
                        studentsForSelect.length === 0 ||
                        isGeneratingClass
                      }
                      className="gap-2"
                    >
                      {isGeneratingClass ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      {isGeneratingClass ? "Génération..." : "Exporter la classe"}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  {classFilter === ALL_CLASSES
                    ? "Sélectionnez une classe pour exporter les cartes de tous ses élèves"
                    : `Un seul PDF A4 pour les ${studentsForSelect.length} élève(s) de ${filterClassName}, plusieurs cartes par page pour limiter le gaspillage de papier`}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <div className="space-y-4">
                <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  {selectedStudent.identityPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backendFileUrl(selectedStudent.identityPhotoUrl) ?? undefined}
                      alt="Photo d'identité"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
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
