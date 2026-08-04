import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, ACCENT, getFinalY, drawPdfHeader, slugify } from "./shared";
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
  amountDue: number;
  amountPaid: number;
  paymentDate: string;
}

const AMBER: [number, number, number] = [180, 130, 20];

function formatCompact(amount: number) {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const rounded = Number.isInteger(thousands) ? thousands : thousands.toFixed(1);
    return `${rounded}k`;
  }
  return `${amount}`;
}

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
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

  const aggregateCell = (matches: TrackingPayment[]) => {
    if (matches.length === 0) return undefined;
    const amountDue = Math.max(...matches.map((m) => m.amountDue));
    const amountPaid = matches.reduce((sum, m) => sum + m.amountPaid, 0);
    const lastPaymentDate = matches.reduce(
      (latest, m) => (m.paymentDate > latest ? m.paymentDate : latest),
      matches[0].paymentDate
    );
    const detail = [...matches]
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      .map((m) => `${formatShortDate(m.paymentDate)} : ${formatAriary(m.amountPaid)}`)
      .join(", ");
    return { amountDue, reste: Math.max(0, amountDue - amountPaid), lastPaymentDate, detail };
  };

  interface Cell {
    text: string;
    partial: boolean;
    detail?: string;
    reste?: number;
  }

  const findTypeCell = (studentId: string, typeId: string): Cell => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const matches = list.filter(
      (p) => p.paymentTypeId === typeId && (p.year === startYear || p.year === endYear)
    );
    const status = aggregateCell(matches);
    if (!status) {
      return { text: isSchoolYearStarted(startYear) ? "—" : "", partial: false };
    }
    const showDetail = status.reste > 0 || matches.length > 1;
    if (status.reste > 0) {
      return {
        text: formatCompact(status.reste),
        partial: true,
        detail: showDetail ? status.detail : undefined,
        reste: status.reste,
      };
    }
    return {
      text: formatShortDate(status.lastPaymentDate),
      partial: false,
      detail: showDetail ? status.detail : undefined,
      reste: 0,
    };
  };

  const findEcolageCell = (
    studentId: string,
    typeId: string,
    monthKey: string,
    year: number,
    monthIndex: number
  ): Cell => {
    const list = paymentsByStudent.get(studentId) ?? [];
    const matches = list.filter(
      (p) => p.paymentTypeId === typeId && p.year === year && normalizeText(p.month) === monthKey
    );
    const status = aggregateCell(matches);
    if (!status) {
      return { text: isMonthDue(monthIndex, year) ? "—" : "", partial: false };
    }
    const showDetail = status.reste > 0 || matches.length > 1;
    if (status.reste > 0) {
      return {
        text: formatCompact(status.reste),
        partial: true,
        detail: showDetail ? status.detail : undefined,
        reste: status.reste,
      };
    }
    return {
      text: formatShortDate(status.lastPaymentDate),
      partial: false,
      detail: showDetail ? status.detail : undefined,
      reste: 0,
    };
  };

  const doc = new jsPDF({ orientation: "landscape" });
  const y = drawPdfHeader(doc, `Suivi des Paiements — ${className}`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(
    `${students.length} élève${students.length > 1 ? "s" : ""} — Légende : date = payé, montant = reste à payer (partiel), — = dû non payé, vide = pas encore dû`,
    14,
    y
  );
  doc.setTextColor(0, 0, 0);

  const STATIC_COLS = 3;

  const head = [
    "N°",
    "Matricule",
    "Nom et Prénom",
    ...otherTypes.map((t) => t.name),
    ...(ecolageType ? SCHOOL_MONTHS.map((m) => m.short) : []),
  ];

  const partialFlags: boolean[][] = [];
  const partialDetailRows: string[][] = [];

  const body = students.map((student, index) => {
    const otherCells = otherTypes.map((type) => findTypeCell(student.id, type.id));
    const ecolageCells = ecolageType
      ? SCHOOL_MONTHS.map((month) => {
          const year = month.yearOffset === 0 ? startYear : endYear;
          return findEcolageCell(student.id, ecolageType.id, month.key, year, month.monthIndex);
        })
      : [];

    partialFlags[index] = [...otherCells, ...ecolageCells].map((cell) => cell.partial);

    const studentName = `${student.lastName} ${student.firstName}`;
    const resteLabel = (cell: Cell) =>
      cell.partial ? formatAriary(cell.reste ?? 0) : "Payé intégralement";
    otherCells.forEach((cell, i) => {
      if (cell.detail) {
        partialDetailRows.push([studentName, otherTypes[i].name, cell.detail, resteLabel(cell)]);
      }
    });
    if (ecolageType) {
      ecolageCells.forEach((cell, i) => {
        if (cell.detail) {
          const month = SCHOOL_MONTHS[i];
          const year = month.yearOffset === 0 ? startYear : endYear;
          partialDetailRows.push([
            studentName,
            `${ecolageType.name} — ${month.label} ${year}`,
            cell.detail,
            resteLabel(cell),
          ]);
        }
      });
    }

    return [
      index + 1,
      student.matricule,
      studentName,
      ...otherCells.map((cell) => cell.text),
      ...ecolageCells.map((cell) => cell.text),
    ];
  });

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
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const colIndex = data.column.index - STATIC_COLS;
      if (colIndex < 0) return;
      if (partialFlags[data.row.index]?.[colIndex]) {
        data.cell.styles.textColor = AMBER;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  if (partialDetailRows.length > 0) {
    let detailY = getFinalY(doc) + 10;
    if (detailY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      detailY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT);
    doc.text("Détail des paiements en plusieurs versements", 14, detailY);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: detailY + 4,
      head: [["Élève", "Période", "Détail (date : montant)", "Statut"]],
      body: partialDetailRows,
      theme: "plain",
      headStyles: {
        fillColor: false,
        textColor: PRIMARY,
        fontStyle: "bold",
        lineWidth: 0.3,
        lineColor: PRIMARY,
      },
      bodyStyles: {
        fillColor: false,
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 55 },
        2: { cellWidth: "wrap" },
        3: { cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 3) return;
        const isPaidInFull = data.cell.raw === "Payé intégralement";
        data.cell.styles.textColor = isPaidInFull ? [22, 130, 70] : AMBER;
        data.cell.styles.fontStyle = "bold";
      },
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      margin: { left: 10, right: 10 },
    });
  }

  doc.save(`suivi-paiements-${slugify(className)}-${schoolYear}.pdf`);
}
