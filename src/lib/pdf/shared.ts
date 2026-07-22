import { jsPDF } from "jspdf";
import { currentSchoolYear } from "@/lib/school-year";

export const PRIMARY: [number, number, number] = [21, 60, 94];
export const ACCENT: [number, number, number] = [222, 142, 53];
export const SCHOOL_ADDRESS = "Lot 077 G Bis Ambohibao Antehiroka";
export const SCHOOL_PHONE = "+261 34 01 332 78";

export function getFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function drawPdfHeader(doc: jsPDF, subtitle: string, startY = 42): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Au Bel Enfant", 14, 18);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("Ambition - Motivation - Réussite", 14, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(subtitle, pageWidth - 14, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Année scolaire : ${currentSchoolYear()}`, pageWidth - 14, 25, {
    align: "right",
  });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(14, 31, pageWidth - 14, 31);

  doc.setTextColor(0, 0, 0);
  return startY;
}

const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/\s+/g, "-");
}
