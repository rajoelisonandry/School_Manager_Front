import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, ACCENT, drawPdfHeader, getFinalY, slugify } from "./shared";
import { collectDsLabels, formatGrade } from "@/lib/bulletin";

export interface BulletinGradeDetailForPdf {
  label: string;
  type: string;
  value: number;
}

export interface BulletinSubjectRowForPdf {
  subjectName: string;
  coefficient: number;
  dsAverage: number | null;
  examValue: number | null;
  subjectAverage: number | null;
  classSubjectAverage: number | null;
  grades: BulletinGradeDetailForPdf[];
}

export interface BulletinForPdf {
  matricule: string;
  firstName: string;
  lastName: string;
  subjects: BulletinSubjectRowForPdf[];
  generalAverage: number | null;
  classGeneralAverage: number | null;
  rank: number | null;
  totalStudents: number;
}

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1er Trimestre",
  2: "2e Trimestre",
  3: "3e Trimestre",
};

const MARGIN = 14;

function drawBulletinPage(
  doc: jsPDF,
  bulletin: BulletinForPdf,
  className: string,
  trimester: number,
  dsLabels: string[]
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const y = drawPdfHeader(doc, `Bulletin — ${TRIMESTER_LABELS[trimester] ?? `Trimestre ${trimester}`}`);

  // Bloc identité
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(`${bulletin.lastName} ${bulletin.firstName}`, MARGIN, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Matricule : ${bulletin.matricule}  —  Classe : ${className}`, MARGIN, y + 12);

  if (bulletin.rank !== null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PRIMARY);
    doc.text(
      `Rang : ${bulletin.rank} / ${bulletin.totalStudents}`,
      pageWidth - MARGIN,
      y + 9,
      { align: "right" }
    );
  }

  const detailed = dsLabels.length > 0;
  const head = detailed
    ? [["Matière", ...dsLabels, "Examen", "Moyenne", "Coeff.", "Moy. Classe"]]
    : [["Matière", "Moy. DS", "Examen", "Moyenne", "Coeff.", "Moy. Classe"]];

  const body = bulletin.subjects.map((s) => {
    if (!detailed) {
      return [
        s.subjectName,
        formatGrade(s.dsAverage),
        formatGrade(s.examValue),
        formatGrade(s.subjectAverage),
        String(s.coefficient),
        formatGrade(s.classSubjectAverage),
      ];
    }
    const dsByLabel = new Map(s.grades.filter((g) => g.type === "ds").map((g) => [g.label, g.value]));
    return [
      s.subjectName,
      ...dsLabels.map((label) => formatGrade(dsByLabel.get(label))),
      formatGrade(s.examValue),
      formatGrade(s.subjectAverage),
      String(s.coefficient),
      formatGrade(s.classSubjectAverage),
    ];
  });

  autoTable(doc, {
    startY: y + 18,
    head,
    body,
    theme: "grid",
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: detailed ? 8.5 : 10,
    },
    bodyStyles: { halign: "center", fontSize: detailed ? 8.5 : 9.5 },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  const tableEndY = getFinalY(doc);
  const summaryY = tableEndY + 10;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, summaryY - 5, pageWidth - MARGIN, summaryY - 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Moyenne générale : ${formatGrade(bulletin.generalAverage)} / 20`, MARGIN, summaryY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Moyenne de la classe : ${formatGrade(bulletin.classGeneralAverage)} / 20`,
    pageWidth - MARGIN,
    summaryY,
    { align: "right" }
  );

  // Visa, à compléter à la main
  const signatureY = Math.min(summaryY + 40, doc.internal.pageSize.getHeight() - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Fait à ....................................., le .....................................", MARGIN, signatureY);

  const signatureX = pageWidth - MARGIN - 55;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(signatureX, signatureY + 16, signatureX + 55, signatureY + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("La Directrice", signatureX + 27.5, signatureY + 21, { align: "center" });
}

// Un bulletin par élève : un seul (aperçu / réimpression) ou toute une classe d'un coup.
// `detailed` affiche une colonne par DS (DS1, DS2, ...) au lieu de leur seule moyenne,
// avec des colonnes communes à tous les bulletins exportés pour rester alignées.
export function exportBulletinsPdf(
  bulletins: BulletinForPdf[],
  className: string,
  schoolYear: string,
  trimester: number,
  detailed = false
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const dsLabels = detailed ? collectDsLabels(bulletins) : [];

  bulletins.forEach((bulletin, index) => {
    if (index > 0) doc.addPage();
    drawBulletinPage(doc, bulletin, className, trimester, dsLabels);
  });

  const suffix =
    bulletins.length === 1
      ? slugify(`${bulletins[0].lastName}-${bulletins[0].firstName}`)
      : slugify(className);
  doc.save(`bulletin-${suffix}-t${trimester}-${slugify(schoolYear)}.pdf`);
}
