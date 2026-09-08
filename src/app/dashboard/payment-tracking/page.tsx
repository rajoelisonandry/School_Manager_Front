"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { CalendarCheck, Info, FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getStudents } from "../students/actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getPayments } from "../payments/actions";
import {
  SCHOOL_MONTHS,
  normalizeText,
  currentSchoolYear,
  schoolYearOptions,
} from "@/lib/school-year";
import { exportPaymentTrackingPdf } from "@/lib/pdf/payment-tracking-pdf";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { getCachedData, setCachedData } from "@/lib/page-data-cache";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  classId: string;
  createdAt: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface PaymentTypeOption {
  id: string;
  name: string;
  classIds: string[];
}

interface Payment {
  id: string;
  studentId: string;
  paymentTypeId: string;
  month: string;
  year: number;
  amountDue: number;
  amountPaid: number;
  paymentDate: string;
}

interface PaymentDetail {
  date: string;
  amount: number;
}

interface AggregatedStatus {
  amountDue: number;
  amountPaid: number;
  reste: number;
  lastPaymentDate: string;
  details: PaymentDetail[];
}

function aggregate(matches: Payment[]): AggregatedStatus | undefined {
  if (matches.length === 0) return undefined;
  const amountDue = Math.max(...matches.map((m) => m.amountDue));
  const amountPaid = matches.reduce((sum, m) => sum + m.amountPaid, 0);
  const lastPaymentDate = matches.reduce(
    (latest, m) => (m.paymentDate > latest ? m.paymentDate : latest),
    matches[0].paymentDate
  );
  const details = [...matches]
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
    .map((m) => ({ date: m.paymentDate, amount: m.amountPaid }));
  return {
    amountDue,
    amountPaid,
    reste: Math.max(0, amountDue - amountPaid),
    lastPaymentDate,
    details,
  };
}

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

function formatCompact(amount: number) {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const rounded = Number.isInteger(thousands) ? thousands : thousands.toFixed(1);
    return `${rounded}k`;
  }
  return `${amount}`;
}

function isMonthDue(monthIndex: number, year: number): boolean {
  const now = new Date();
  const target = new Date(year, monthIndex, 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return target <= currentMonthStart;
}

function isSchoolYearStarted(startYear: number): boolean {
  return new Date(startYear, 8, 1) <= new Date();
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

interface PaymentTrackingPageCache {
  students: Student[];
  classes: ClassOption[];
  paymentTypes: PaymentTypeOption[];
  payments: Payment[];
}
// Voir @/lib/page-data-cache : affiche instantanément les données de la
// dernière visite pendant qu'un rafraîchissement silencieux se termine.
const CACHE_KEY = "payment-tracking-page";

export default function PaymentTrackingPage() {
  const [students, setStudents] = useState<Student[]>(
    () => getCachedData<PaymentTrackingPageCache>(CACHE_KEY)?.students ?? []
  );
  const [classes, setClasses] = useState<ClassOption[]>(
    () => getCachedData<PaymentTrackingPageCache>(CACHE_KEY)?.classes ?? []
  );
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>(
    () => getCachedData<PaymentTrackingPageCache>(CACHE_KEY)?.paymentTypes ?? []
  );
  const [payments, setPayments] = useState<Payment[]>(
    () => getCachedData<PaymentTrackingPageCache>(CACHE_KEY)?.payments ?? []
  );
  const [classId, setClassId] = useState<string>("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [isLoading, setIsLoading] = useState(
    () => getCachedData<PaymentTrackingPageCache>(CACHE_KEY) === undefined
  );

  useEffect(() => {
    const loadData = async () => {
      if (getCachedData<PaymentTrackingPageCache>(CACHE_KEY) === undefined) setIsLoading(true);
      const [studentsData, classesData, typesData, paymentsData] = await Promise.all([
        getStudents(),
        getClasses(),
        getPaymentTypes(),
        getPayments(),
      ]);
      setCachedData<PaymentTrackingPageCache>(CACHE_KEY, {
        students: studentsData,
        classes: classesData,
        paymentTypes: typesData,
        payments: paymentsData,
      });
      setStudents(studentsData);
      setClasses(classesData);
      setPaymentTypes(typesData);
      setPayments(paymentsData);
      setClassId((prev) => prev || classesData[0]?.id || "");
      setIsLoading(false);
    };
    loadData();
  }, []);

  const [startYear, endYear] = useMemo(
    () => schoolYear.split("-").map(Number) as [number, number],
    [schoolYear]
  );

  const ecolageType = useMemo(
    () => paymentTypes.find((t) => normalizeText(t.name) === "ecolage"),
    [paymentTypes]
  );

  const otherTypes = useMemo(
    () => paymentTypes.filter((t) => t.id !== ecolageType?.id),
    [paymentTypes, ecolageType]
  );

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.classId === classId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [students, classId]
  );

  const paymentsByStudent = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const payment of payments) {
      const list = map.get(payment.studentId) ?? [];
      list.push(payment);
      map.set(payment.studentId, list);
    }
    return map;
  }, [payments]);

  const findTypeStatus = (studentId: string, typeId: string) => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const matches = list.filter(
      (p) => p.paymentTypeId === typeId && (p.year === startYear || p.year === endYear)
    );
    return aggregate(matches);
  };

  const findEcolageStatus = (
    studentId: string,
    typeId: string,
    monthKey: string,
    year: number
  ) => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const matches = list.filter(
      (p) => p.paymentTypeId === typeId && p.year === year && normalizeText(p.month) === monthKey
    );
    return aggregate(matches);
  };

  const renderStatusCell = (status: AggregatedStatus | undefined, due: boolean) => {
    if (!status) {
      return due ? <span className="text-red-500 font-bold">—</span> : "";
    }

    const isPartial = status.reste > 0;
    const hasInstallments = status.details.length > 1;

    // Un seul versement qui couvre tout le montant dû : pas besoin de détail.
    if (!isPartial && !hasInstallments) {
      return (
        <span className="text-green-600 dark:text-green-400">
          {formatShortDate(status.lastPaymentDate)}
        </span>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {isPartial ? (
            <span className="text-amber-600 dark:text-amber-400 font-semibold cursor-help">
              {formatCompact(status.reste)}
            </span>
          ) : (
            <span className="text-green-600 dark:text-green-400 cursor-help underline decoration-dotted">
              {formatShortDate(status.lastPaymentDate)}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5">
            {status.details.map((detail, i) => (
              <div key={i}>
                {formatShortDate(detail.date)} : {formatAriary(detail.amount)}
              </div>
            ))}
            <div className="mt-1 border-t border-border/50 pt-1 font-semibold">
              {isPartial
                ? `Dû ${formatAriary(status.amountDue)} — Reste ${formatAriary(status.reste)}`
                : `Payé intégralement — ${formatAriary(status.amountDue)}`}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const handleExportPdf = () => {
    const className = classes.find((c) => c.id === classId)?.name ?? "Classe";
    exportPaymentTrackingPdf(className, schoolYear, classStudents, otherTypes, ecolageType, payments);
  };

  if (isLoading) {
    return (
      <PageListSkeleton
        filters={3}
        tableCols={9}
        tableRows={6}
        tableHeaderControls={0}
        withHeaderActionButton={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarCheck}
        title="Suivi des Paiements"
        subtitle="Suivi par classe de l'écolage mensuel et des autres frais scolaires"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={schoolYear} onValueChange={setSchoolYear}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Année scolaire" />
          </SelectTrigger>
          <SelectContent>
            {schoolYearOptions().map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={classStudents.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter le suivi de cette classe en PDF</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            Payé (date)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 font-bold">12k</span>
            Partiel (reste à payer)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-red-500 font-bold">—</span>
            Dû, non payé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground/40" />
            Pas encore dû
          </span>
        </div>
      </div>

      {!classId ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Aucune classe disponible
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              {classes.find((c) => c.id === classId)?.name} — {classStudents.length} élève
              {classStudents.length > 1 ? "s" : ""}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Écolage : une colonne par mois (Septembre à Juin). Les autres frais
                  n&apos;ont qu&apos;une seule colonne pour l&apos;année scolaire.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom et Prénom</TableHead>
                  {otherTypes.map((type) => (
                    <TableHead key={type.id} className="text-center whitespace-nowrap">
                      {type.name}
                    </TableHead>
                  ))}
                  {ecolageType &&
                    SCHOOL_MONTHS.map((month) => (
                      <TableHead key={month.key} className="text-center whitespace-nowrap">
                        {month.short}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.matricule}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {student.lastName} {student.firstName}
                    </TableCell>

                    {otherTypes.map((type) => {
                      const status = findTypeStatus(student.id, type.id);
                      const due = isSchoolYearStarted(startYear);
                      return (
                        <TableCell key={type.id} className="text-center text-xs">
                          {renderStatusCell(status, due)}
                        </TableCell>
                      );
                    })}

                    {ecolageType &&
                      SCHOOL_MONTHS.map((month) => {
                        const year = month.yearOffset === 0 ? startYear : endYear;
                        const status = findEcolageStatus(
                          student.id,
                          ecolageType.id,
                          month.key,
                          year
                        );
                        const due = isMonthDue(month.monthIndex, year);
                        return (
                          <TableCell key={month.key} className="text-center text-xs">
                            {renderStatusCell(status, due)}
                          </TableCell>
                        );
                      })}
                  </TableRow>
                ))}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3 + otherTypes.length + (ecolageType ? SCHOOL_MONTHS.length : 0)}
                      className="text-center text-muted-foreground py-8"
                    >
                      Aucun élève dans cette classe
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
