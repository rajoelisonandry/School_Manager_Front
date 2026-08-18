import { jsPDF } from "jspdf";
import { PRIMARY, ACCENT, SCHOOL_ADDRESS, SCHOOL_PHONE, slugify } from "./shared";
import { formatDate } from "./students-pdf";
import { SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_LEVEL_LABEL } from "@/lib/branding";
import { POPPINS, registerPoppins, loadPhoto, fitContain, generateQrCode } from "./pdf-assets";

export interface StudentForCard {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  phones: string[];
  identityPhotoUrl?: string;
}

// Format carte de crédit / badge (CR80), le standard pour une carte d'identité
// scolaire : assez petit pour tenir dans un porte-carte, imprimable directement.
// Recto = identité complète (façon badge d'entreprise) ; verso = vérification
// (QR code) + signatures.
const CARD_W = 85.6;
const CARD_H = 54;
const MARGIN = 3;
const CORNER_MARK = 3.5;
const CONTENT_W = CARD_W - 2 * MARGIN;

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function buildQrContent(
  student: StudentForCard,
  className: string,
  schoolYear: string
): string {
  return [
    `${SCHOOL_NAME} — Carte d'identité scolaire`,
    `Matricule : ${student.matricule || "-"}`,
    `Nom et prénom : ${student.lastName} ${student.firstName}`,
    `Classe : ${className || "-"}`,
    `Né(e) le : ${formatDate(student.dateOfBirth)}`,
    `Adresse : ${student.address || "-"}`,
    `Téléphone : ${student.phones?.filter(Boolean).join(", ") || "-"}`,
    `Année scolaire : ${schoolYear}`,
  ].join("\n");
}

// Petits repères d'angle façon "viseur" (plutôt qu'un simple encadré) autour de la
// photo, pour un rendu plus soigné/moderne — même motif que le cadre du carnet de
// correspondance, pour une signature visuelle cohérente entre les documents.
function drawCornerMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    doc.line(cx, cy, cx + dx * CORNER_MARK, cy);
    doc.line(cx, cy, cx, cy + dy * CORNER_MARK);
  }
}

// Ligne "libellé : valeur" précédée d'une puce ACCENT — la brique de base répétée
// pour chaque information de la carte, façon liste moderne plutôt qu'un simple tiret.
function drawBulletField(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  label: string,
  value: string,
  emphasize = false
) {
  doc.setFillColor(...ACCENT);
  doc.circle(x + 0.5, y - 1.1, 0.5, "F");
  const textX = x + 2.4;

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(4);
  doc.setTextColor(...PRIMARY);
  const labelText = `${label.toUpperCase()} : `;
  doc.text(labelText, textX, y);
  const labelW = doc.getTextWidth(labelText);

  doc.setFont(POPPINS, emphasize ? "bold" : "normal");
  doc.setFontSize(4.4);
  doc.setTextColor(...(emphasize ? PRIMARY : ([0, 0, 0] as [number, number, number])));
  const valueLine = doc.splitTextToSize(value || "-", maxWidth - (textX - x) - labelW)[0];
  doc.text(valueLine, textX + labelW, y);
}

async function drawRecto(
  doc: jsPDF,
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  // ---- En-tête façon badge d'entreprise : bandeau de couleur + touche géométrique ----
  const headerH = 13.5;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, CARD_W, headerH, "F");
  // Petit angle en aplat ACCENT, coupé en biseau : la touche "moderne" façon badge
  // corporate plutôt qu'un bandeau plat uniforme.
  doc.setFillColor(...ACCENT);
  doc.triangle(CARD_W - 22, headerH, CARD_W, headerH - 8, CARD_W, headerH, "F");

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(3.3);
  doc.setTextColor(...ACCENT);
  doc.text(SCHOOL_LEVEL_LABEL, MARGIN, 3.6);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(SCHOOL_NAME, MARGIN, 7.6);
  doc.setFont(POPPINS, "normal");
  doc.setFontSize(3.3);
  doc.setTextColor(222, 230, 240);
  const taglineLine = doc.splitTextToSize(SCHOOL_TAGLINE, CARD_W - 2 * MARGIN - 8)[0];
  doc.text(taglineLine, MARGIN, 10.9);

  // ---- Photo, encadrée de repères d'angle plutôt qu'un simple rectangle ----
  const photoW = 15;
  const photoH = 17;
  const photoX = MARGIN;
  const photoY = headerH + 2.5;

  const photo = student.identityPhotoUrl ? await loadPhoto(student.identityPhotoUrl) : null;
  doc.setDrawColor(232, 232, 232);
  doc.setLineWidth(0.2);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1.1, 1.1, "S");
  if (photo) {
    const fit = fitContain(photo.width, photo.height, photoW - 1, photoH - 1);
    doc.saveGraphicsState();
    doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 0.7, 0.7, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(
      photo.dataUrl,
      photo.format,
      photoX + 0.5 + fit.x,
      photoY + 0.5 + fit.y,
      fit.w,
      fit.h
    );
    doc.restoreGraphicsState();
  } else {
    doc.setFont(POPPINS, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PRIMARY);
    doc.text(initials(student.firstName, student.lastName), photoX + photoW / 2, photoY + photoH / 2 + 1.2, {
      align: "center",
    });
  }
  drawCornerMarks(doc, photoX, photoY, photoW, photoH);

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(4.1);
  doc.setTextColor(...PRIMARY);
  doc.text(student.matricule || "-", photoX + photoW / 2, photoY + photoH + 3.2, { align: "center" });

  // ---- Colonne d'identité, alignée sur le haut de la photo ----
  const infoX = photoX + photoW + 3.5;
  const infoW = CARD_W - MARGIN - infoX;

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(6.3);
  doc.setTextColor(0, 0, 0);
  const nameLine = doc.splitTextToSize(
    `${student.lastName.toUpperCase()} ${student.firstName}`,
    infoW
  )[0];
  doc.text(nameLine, infoX, photoY + 3);

  const fieldY = photoY + 6.6;
  drawBulletField(doc, infoX, fieldY, infoW, "Classe", className);
  drawBulletField(doc, infoX, fieldY + 3.4, infoW, "Né(e) le", formatDate(student.dateOfBirth));
  drawBulletField(doc, infoX, fieldY + 6.8, infoW, "Année scolaire", schoolYear, true);

  // ---- Coordonnées de l'élève, sous la ligne photo/identité ----
  const contactSeparatorY = photoY + photoH + 4.5;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, contactSeparatorY, CARD_W - MARGIN, contactSeparatorY);

  drawBulletField(doc, MARGIN, contactSeparatorY + 3.3, CONTENT_W, "Adresse", student.address);
  drawBulletField(
    doc,
    MARGIN,
    contactSeparatorY + 6.6,
    CONTENT_W,
    "Téléphone",
    student.phones?.filter(Boolean).join(" • ") || "-"
  );

  // ---- Pied de carte : adresse de l'établissement ----
  const footerH = 6;
  doc.setFillColor(...ACCENT);
  doc.rect(0, CARD_H - footerH, CARD_W, footerH, "F");
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(3.5);
  doc.setTextColor(255, 255, 255);
  const addressLine = doc.splitTextToSize(SCHOOL_ADDRESS, CARD_W - 2 * MARGIN)[0];
  doc.text(addressLine, CARD_W / 2, CARD_H - footerH / 2 + 1.2, { align: "center" });
}

async function drawVerso(
  doc: jsPDF,
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  // ---- Bandeau assorti au recto (biseau en miroir), pour une carte cohérente ----
  const bandH = 5.5;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, CARD_W, bandH, "F");
  doc.setFillColor(...ACCENT);
  doc.triangle(0, bandH, 12, 0, 0, 0, "F");
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(4.2);
  doc.setTextColor(255, 255, 255);
  doc.text("VÉRIFICATION", CARD_W / 2, bandH / 2 + 1.3, { align: "center" });

  drawBulletField(doc, MARGIN, 10.5, CONTENT_W, "En cas de perte, contactez", SCHOOL_PHONE, true);

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 13.5, CARD_W - MARGIN, 13.5);

  // ---- QR code, bien plus grand qu'avant : le verso lui est presque dédié ----
  // reprend toutes les informations de l'élève, pour une vérification rapide.
  const qrSize = 20;
  const qrX = (CARD_W - qrSize) / 2;
  const qrY = 16;
  const qrDataUrl = await generateQrCode(buildQrContent(student, className, schoolYear));
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFont(POPPINS, "normal");
  doc.setFontSize(3);
  doc.setTextColor(130, 130, 130);
  doc.text("Scanner pour toutes les informations", CARD_W / 2, qrY + qrSize + 2.8, { align: "center" });

  // ---- Signatures : élève/parent d'un côté, établissement de l'autre ----
  const sigSeparatorY = qrY + qrSize + 5.6;
  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, sigSeparatorY, CARD_W - MARGIN, sigSeparatorY);

  const sigGap = 6;
  const sigW = (CONTENT_W - sigGap) / 2;
  const leftSigX = MARGIN;
  const rightSigX = MARGIN + sigW + sigGap;
  const sigLineY = sigSeparatorY + 4.5;

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.25);
  doc.line(leftSigX, sigLineY, leftSigX + sigW, sigLineY);
  doc.line(rightSigX, sigLineY, rightSigX + sigW, sigLineY);

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(3.3);
  doc.setTextColor(90, 90, 90);
  doc.text("Signature élève / parent", leftSigX + sigW / 2, sigLineY + 2.6, { align: "center" });
  doc.text("Signature et cachet établissement", rightSigX + sigW / 2, sigLineY + 2.6, {
    align: "center",
  });
}

export async function exportCarteIdentitePdf(
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [CARD_W, CARD_H] });
  await registerPoppins(doc);

  await drawRecto(doc, student, className, schoolYear);

  doc.addPage([CARD_W, CARD_H], "landscape");
  await drawVerso(doc, student, className, schoolYear);

  doc.save(`carte-identite-${slugify(`${student.lastName}-${student.firstName}`)}.pdf`);
}
