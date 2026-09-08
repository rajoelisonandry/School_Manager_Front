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

// compact réduit les tailles de police et l'espacement pour libérer de la place
// verticale (utilisé quand un tableau doit absolument tenir sur une seule
// page — voir exportStudentsPdf) ; sans effet sur les appelants existants qui
// ne le passent pas. accentColor : couleur du nom de l'école et du filet
// (bleu PRIMARY par défaut) — passer [0, 0, 0] pour un rendu tout en noir
// (voir exportStudentsPdf, le seul export volontairement sans couleur).
export function drawPdfHeader(
  doc: jsPDF,
  subtitle: string,
  startY?: number,
  compact = false,
  accentColor: [number, number, number] = PRIMARY,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  const nameY = compact ? 12 : 18;
  const taglineY = compact ? 17 : 25;
  const lineY = compact ? 21 : 31;

  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 12 : 18);
  doc.text(SCHOOL_NAME, 14, nameY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(compact ? 7 : 10);
  doc.text(SCHOOL_TAGLINE, 14, taglineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 9 : 12);
  doc.text(subtitle, pageWidth - 14, nameY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(compact ? 7 : 9);
  doc.text(`Année scolaire : ${currentSchoolYear()}`, pageWidth - 14, taglineY, {
    align: "right",
  });

  doc.setDrawColor(...accentColor);
  doc.setLineWidth(compact ? 0.3 : 0.4);
  doc.line(14, lineY, pageWidth - 14, lineY);

  doc.setTextColor(0, 0, 0);
  return startY ?? (compact ? 27 : 42);
}

const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/\s+/g, "-");
}
