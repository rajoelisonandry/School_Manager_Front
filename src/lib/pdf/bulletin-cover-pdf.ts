// Couverture du bulletin de notes : A4 paysage plié en deux (contenu sur la moitié
// droite), comme la 1ère page du carnet de correspondance, mais sans fond abstrait —
// une mise en page typographique, sur fond blanc, faite de filets fins.
import { jsPDF } from "jspdf";
import { PRIMARY, ACCENT, SCHOOL_ADDRESS, SCHOOL_PHONE, slugify } from "./shared";
import { SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_LEVEL_LABEL } from "@/lib/branding";
import { POPPINS, registerPoppins, loadPhoto, fitContain } from "./pdf-assets";

export interface StudentForBulletinCover {
  matricule: string;
  firstName: string;
  lastName: string;
  identityPhotoUrl?: string;
}

const MARGIN = 14;
const BLACK: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [125, 125, 125];
// Gris plus foncé pour le slogan et les coordonnées, plus lisibles à l'impression.
const DARK_GRAY: [number, number, number] = [80, 80, 80];
const RULE: [number, number, number] = [225, 225, 225];

// Texte espacé (lettres écartées) centré sur cx : jsPDF ne compte pas charSpace dans
// le calcul d'alignement, on positionne donc le début du texte à la main.
function spacedText(doc: jsPDF, text: string, cx: number, y: number, charSpace: number) {
  const width = doc.getTextWidth(text) + charSpace * (text.length - 1);
  doc.text(text, cx - width / 2, y, { charSpace });
}

// Réduit la police jusqu'à ce que le texte tienne dans la largeur (noms longs).
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, size: number, min: number) {
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

function drawFoldGuide(doc: jsPDF, centerX: number, pageHeight: number) {
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(centerX, MARGIN, centerX, pageHeight - MARGIN);
  doc.setLineDashPattern([], 0);
}

async function drawCover(
  doc: jsPDF,
  student: StudentForBulletinCover,
  className: string,
  schoolYear: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  drawFoldGuide(doc, centerX, pageHeight);

  const frameX = centerX + 8;
  const frameY = MARGIN;
  const frameW = pageWidth - MARGIN - frameX;
  const frameH = pageHeight - 2 * MARGIN;

  // Sans cadre, le contenu occupe presque toute la hauteur de la page.
  const pad = 6;
  const contentW = frameW - 2 * pad;
  const cx = frameX + frameW / 2;
  const top = frameY + 4;
  const bottom = frameY + frameH + 2;

  // École
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  spacedText(doc, SCHOOL_LEVEL_LABEL, cx, top + 4, 1.4);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(21);
  doc.setTextColor(...PRIMARY);
  doc.text(SCHOOL_NAME, cx, top + 13, { align: "center" });
  doc.setFont(POPPINS, "italic");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GRAY);
  doc.text(SCHOOL_TAGLINE, cx, top + 19.5, { align: "center" });

  // Titre : "BULLETIN" en grand, "DE NOTES" espacé en dessous, séparés par un filet
  // orange, avec de l'air au-dessus et en dessous pour bien le détacher.
  const titleY = top + 47;
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(36);
  doc.setTextColor(...PRIMARY);
  doc.text("BULLETIN", cx, titleY, { align: "center" });
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(cx - 9, titleY + 5, cx + 9, titleY + 5);
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  spacedText(doc, "DE NOTES", cx, titleY + 13.5, 2.4);

  // Année scolaire : libellé espacé puis valeur en gras, encadrée de deux traits orange.
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  spacedText(doc, "ANNÉE SCOLAIRE", cx, titleY + 29, 1);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  const yearY = titleY + 36;
  const yearW = doc.getTextWidth(schoolYear);
  doc.text(schoolYear, cx, yearY, { align: "center" });
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(cx - yearW / 2 - 14, yearY - 2, cx - yearW / 2 - 4, yearY - 2);
  doc.line(cx + yearW / 2 + 4, yearY - 2, cx + yearW / 2 + 14, yearY - 2);

  // Photo d'identité, coins arrondis, entourée d'un filet décalé.
  const photoH = 46;
  const photoW = photoH * 0.78;
  const photoX = cx - photoW / 2;
  const photoY = yearY + 9;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX - 2, photoY - 2, photoW + 4, photoH + 4, 4, 4, "S");

  const photo = student.identityPhotoUrl ? await loadPhoto(student.identityPhotoUrl) : null;
  if (photo) {
    const fit = fitContain(photo.width, photo.height, photoW, photoH);
    doc.saveGraphicsState();
    doc.roundedRect(photoX, photoY, photoW, photoH, 3, 3, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(photo.dataUrl, photo.format, photoX + fit.x, photoY + fit.y, fit.w, fit.h);
    doc.restoreGraphicsState();
  } else {
    doc.setFont(POPPINS, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Photo", cx, photoY + photoH / 2 + 1, { align: "center" });
  }

  // Élève
  const nameY = photoY + photoH + 12;
  const fullName = `${student.lastName} ${student.firstName}`;
  doc.setFont(POPPINS, "bold");
  fitFontSize(doc, fullName, contentW, 16, 10);
  doc.setTextColor(...BLACK);
  doc.text(fullName, cx, nameY, { align: "center" });

  // Matricule | Classe, de part et d'autre d'un filet vertical.
  const infoLabelY = nameY + 9;
  const infoValueY = infoLabelY + 6.5;
  const half = contentW / 4;
  const infos: [string, string, number][] = [
    ["MATRICULE", student.matricule || "-", cx - half],
    ["CLASSE", className || "-", cx + half],
  ];
  for (const [label, value, x] of infos) {
    doc.setFont(POPPINS, "semibold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    spacedText(doc, label, x, infoLabelY, 1);
    doc.setFont(POPPINS, "semibold");
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.text(value, x, infoValueY, { align: "center" });
  }
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(cx, infoLabelY - 3, cx, infoValueY + 1.5);

  // Pied : coordonnées de l'école sous un filet fin.
  doc.setDrawColor(...RULE);
  doc.line(frameX + pad, bottom - 5.5, frameX + frameW - pad, bottom - 5.5);
  doc.setFont(POPPINS, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...DARK_GRAY);
  doc.text(`${SCHOOL_ADDRESS}  ·  Tél. : ${SCHOOL_PHONE}`, cx, bottom, { align: "center" });

  doc.setTextColor(0, 0, 0);
}

// Une couverture par élève : un seul, ou toute la classe d'un coup.
export async function exportBulletinCoversPdf(
  students: StudentForBulletinCover[],
  className: string,
  schoolYear: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registerPoppins(doc);

  for (const [index, student] of students.entries()) {
    if (index > 0) doc.addPage("a4", "landscape");
    await drawCover(doc, student, className, schoolYear);
  }

  const suffix =
    students.length === 1
      ? slugify(`${students[0].lastName}-${students[0].firstName}`)
      : slugify(className);
  doc.save(`couverture-bulletin-${suffix}-${slugify(schoolYear)}.pdf`);
}
