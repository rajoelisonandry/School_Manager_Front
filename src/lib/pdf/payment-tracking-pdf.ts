import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, drawPdfHeader, slugify } from "./shared";
import { SCHOOL_MONTHS, normalizeText, schoolYearStart } from "@/lib/school-year";

interface TrackingStudent {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
}

interface TrackingPaymentType {
  id: string;
  name: string;
}

interface TrackingPayment {
  studentId: string;
  paymentTypeId: string;
  month: string;
  year: number;
  paymentDate: string;
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

export function exportPaymentTrackingPdf(
  className: string,
  schoolYear: string,
  students: TrackingStudent[],
  otherTypes: TrackingPaymentType[],
  ecolageType: TrackingPaymentType | undefined,
  payments: TrackingPayment[],
) {
  const startYear = schoolYearStart(schoolYear);
  const endYear = startYear + 1;

  const paymentsByStudent = new Map<string, TrackingPayment[]>();
  for (const payment of payments) {
    const list = paymentsByStudent.get(payment.studentId) ?? [];
    list.push(payment);
    paymentsByStudent.set(payment.studentId, list);
  }

  const findTypeCell = (studentId: string, typeId: string) => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const matches = list.filter(
      (p) => p.paymentTypeId === typeId && (p.year === startYear || p.year === endYear)
    );
    if (matches.length === 0) {
      return isSchoolYearStarted(startYear) ? "—" : "";
    }
    const latest = matches.reduce((a, b) => (b.paymentDate > a.paymentDate ? b : a));
    return formatShortDate(latest.paymentDate);
  };

  const findEcolageCell = (studentId: string, typeId: string, monthKey: string, year: number, monthIndex: number) => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const match = list.find(
      (p) => p.paymentTypeId === typeId && p.year === year && normalizeText(p.month) === monthKey
    );
    if (match) return formatShortDate(match.paymentDate);
    return isMonthDue(monthIndex, year) ? "—" : "";
  };

  const doc = new jsPDF({ orientation: "landscape" });
  const y = drawPdfHeader(doc, `Suivi des Paiements — ${className}`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(
    `${students.length} élève${students.length > 1 ? "s" : ""} — Légende : date = payé, — = dû non payé, vide = pas encore dû`,
    14,
    y
  );
  doc.setTextColor(0, 0, 0);

  const head = [
    "N°",
    "Matricule",
    "Nom et Prénom",
    ...otherTypes.map((t) => t.name),
    ...(ecolageType ? SCHOOL_MONTHS.map((m) => m.short) : []),
  ];

  const body = students.map((student, index) => [
    index + 1,
    student.matricule,
    `${student.lastName} ${student.firstName}`,
    ...otherTypes.map((type) => findTypeCell(student.id, type.id)),
    ...(ecolageType
      ? SCHOOL_MONTHS.map((month) => {
          const year = month.yearOffset === 0 ? startYear : endYear;
          return findEcolageCell(student.id, ecolageType.id, month.key, year, month.monthIndex);
        })
      : []),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [head],
    body,
    theme: "plain",
    headStyles: {
      fillColor: false,
      textColor: PRIMARY,
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: PRIMARY,
      halign: "center",
    },
    bodyStyles: {
      fillColor: false,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      halign: "center",
    },
    columnStyles: {
      1: { halign: "left" },
      2: { halign: "left" },
    },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 10, right: 10 },
  });

  doc.save(`suivi-paiements-${slugify(className)}-${schoolYear}.pdf`);
}
