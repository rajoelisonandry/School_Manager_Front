"use client";

import { useState, useEffect, useMemo } from "react";
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
import { BookUser, FileDown, Info, Loader2, User } from "lucide-react";
import { getStudents } from "../students/actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getPaymentTypeRates } from "../payment-type-rates/actions";
import { getPayments } from "../payments/actions";
import { exportCarnetCoverPdf, type CarnetPaymentSummary } from "@/lib/pdf/carnet-pdf";
import { backendFileUrl } from "@/lib/backend/public-url";
import { PageHeader } from "@/components/page-header";
import { PageHeaderSkeleton } from "@/components/loading-skeletons";
import {
  currentSchoolYear,
  schoolYearOptions,
  schoolYearStart,
  normalizeText,
  SCHOOL_MONTHS,
} from "@/lib/school-year";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  classId: string;
  gender: string;
  status: string;
  address: string;
  phones: string[];
  fatherName: string;
  fatherProfession: string;
  motherName: string;
  motherProfession: string;
  guardianName: string;
  guardianProfession: string;
  identityPhotoUrl: string;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface PaymentTypeOption {
  id: string;
  name: string;
  amount: number;
}

interface PaymentTypeRate {
  paymentTypeId: string;
  classId: string;
  year: number;
  amount: number;
}

interface Payment {
  studentId: string;
  paymentTypeId: string;
  month: string;
  year: number;
  amountPaid: number;
  paymentDate: string;
}

const ALL_CLASSES = "all";
// Certains élèves paient "Inscription" (nouvel élève), d'autres "Réinscription"
// (élève déjà présent l'année précédente) : les deux valent pour la ligne FG.
const REGISTRATION_TYPE_NAMES = ["inscription", "reinscription"];

export default function CarnetCorrespondancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [paymentTypeRates, setPaymentTypeRates] = useState<PaymentTypeRate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);
  const [studentId, setStudentId] = useState("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      getStudents(),
      getClasses(),
      getPaymentTypes(),
      getPaymentTypeRates(),
      getPayments(),
    ]).then(([s, c, pt, ptr, p]) => {
      setStudents(s);
      setClasses(c);
      setPaymentTypes(pt);
      setPaymentTypeRates(ptr);
      setPayments(p);
      setIsLoading(false);
    });
  }, []);

  const studentsForSelect =
    classFilter === ALL_CLASSES ? students : students.filter((s) => s.classId === classFilter);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const selectedClass = classes.find((c) => c.id === selectedStudent?.classId);
  const selectedClassName = selectedClass?.name ?? "-";
  const selectedClassLevel = selectedClass?.level ?? "";

  // Montant de l'écolage pour la classe de l'élève : le tarif spécifique
  // (classe + année) s'il existe, sinon le montant par défaut du type de paiement.
  const ecolageAmount = useMemo(() => {
    const ecolageType = paymentTypes.find((t) => normalizeText(t.name) === "ecolage");
    if (!ecolageType || !selectedClass) return 0;
    const year = schoolYearStart(schoolYear);
    const rate = paymentTypeRates.find(
      (r) => r.paymentTypeId === ecolageType.id && r.classId === selectedClass.id && r.year === year
    );
    return rate?.amount ?? ecolageType.amount ?? 0;
  }, [paymentTypes, paymentTypeRates, selectedClass, schoolYear]);

  // Paiements déjà encaissés (à la date d'aujourd'hui, donc à la date d'export du
  // PDF) pour préremplir le tableau : la ligne FG avec l'inscription/réinscription,
  // et chaque mois d'écolage déjà réglé avec sa date et son montant.
  const paymentSummary = useMemo<CarnetPaymentSummary>(() => {
    if (!selectedStudent) return {};

    const [startYear, endYear] = schoolYear.split("-").map(Number);
    const now = new Date();
    const studentPayments = payments.filter(
      (p) => p.studentId === selectedStudent.id && new Date(p.paymentDate) <= now
    );

    const aggregate = (matches: Payment[]) => {
      if (matches.length === 0) return undefined;
      const amount = matches.reduce((sum, m) => sum + m.amountPaid, 0);
      const date = matches.reduce(
        (latest, m) => (m.paymentDate > latest ? m.paymentDate : latest),
        matches[0].paymentDate
      );
      return { date, amount };
    };

    const registrationTypeIds = new Set(
      paymentTypes
        .filter((t) => REGISTRATION_TYPE_NAMES.includes(normalizeText(t.name)))
        .map((t) => t.id)
    );
    const registration = aggregate(
      studentPayments.filter(
        (p) => registrationTypeIds.has(p.paymentTypeId) && (p.year === startYear || p.year === endYear)
      )
    );

    const ecolageType = paymentTypes.find((t) => normalizeText(t.name) === "ecolage");
    const ecolageByMonth: Record<string, { date: string; amount: number }> = {};
    if (ecolageType) {
      for (const month of SCHOOL_MONTHS) {
        if (month.key === "aout") continue;
        const year = month.yearOffset === 0 ? startYear : endYear;
        const agg = aggregate(
          studentPayments.filter(
            (p) =>
              p.paymentTypeId === ecolageType.id &&
              p.year === year &&
              normalizeText(p.month) === month.key
          )
        );
        if (agg) ecolageByMonth[month.key] = agg;
      }
    }

    return { registration, ecolageByMonth };
  }, [selectedStudent, payments, paymentTypes, schoolYear]);

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
      await exportCarnetCoverPdf(
        {
          matricule: selectedStudent.matricule,
          firstName: selectedStudent.firstName,
          lastName: selectedStudent.lastName,
          dateOfBirth: selectedStudent.dateOfBirth,
          placeOfBirth: selectedStudent.placeOfBirth,
          gender: selectedStudent.gender,
          status: selectedStudent.status,
          address: selectedStudent.address,
          phones: selectedStudent.phones,
          fatherName: selectedStudent.fatherName,
          fatherProfession: selectedStudent.fatherProfession,
          motherName: selectedStudent.motherName,
          motherProfession: selectedStudent.motherProfession,
          guardianName: selectedStudent.guardianName,
          guardianProfession: selectedStudent.guardianProfession,
          identityPhotoUrl: backendFileUrl(selectedStudent.identityPhotoUrl) ?? undefined,
        },
        selectedClassName,
        schoolYear,
        selectedClassLevel,
        ecolageAmount,
        paymentSummary
      );
    } finally {
      setIsGenerating(false);
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
        icon={BookUser}
        title="Carnet de Correspondance"
        subtitle="Générer la page de couverture et la fiche de renseignements d'un élève"
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
                    L&apos;année scolaire imprimée sur la couverture du carnet
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
                PDF paysage de 2 pages : couverture avec photo, puis fiche de renseignements
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
              <div className="space-y-4">
                <div className="mx-auto flex h-32 w-28 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
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
