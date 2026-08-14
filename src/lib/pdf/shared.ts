import { jsPDF } from "jspdf";
import { currentSchoolYear } from "@/lib/school-year";
import { SCHOOL_NAME, SCHOOL_TAGLINE } from "@/lib/branding";

export const PRIMARY: [number, number, number] = [21, 60, 94];
export const ACCENT: [number, number, number] = [222, 142, 53];
// Réexportés ici pour ne pas casser les imports existants (`from "./shared"`) ;
// la source de vérité est désormais @/lib/branding.
export { SCHOOL_ADDRESS, SCHOOL_PHONE } from "@/lib/branding";

export function getFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function drawPdfHeader(doc: jsPDF, subtitle: string, startY = 42): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(SCHOOL_NAME, 14, 18);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(SCHOOL_TAGLINE, 14, 25);

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
