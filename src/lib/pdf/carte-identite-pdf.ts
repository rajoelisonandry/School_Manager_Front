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

// Design de base au format carte de crédit / badge (CR80), le standard pour
// une carte d'identité scolaire — sobre, typographie et filets fins, sans
// aplats ni formes décoratives. Les deux faces sont ensuite imprimées côte à
// côte sur une page A4 portrait, chacune occupant la moitié de la largeur
// disponible (une petite marge de chaque côté de la page, mais aucun espace
// entre les deux cartes).
const PAGE_W = 210;
const PAGE_H = 297;
const PAGE_SIDE_MARGIN = 5;

// Y_STRETCH étire la carte en hauteur (au-delà du simple ratio CR80) pour plus
// d'ergonomie : CARD_ASPECT en tient compte, donc CARD_H grandit d'autant.
// Plafonné pour garder exactement 3 paires recto/verso par page A4 dans
// l'export groupé par classe (voir exportCarteIdentiteClassePdf) : au-delà
// d'environ 91.7 mm de haut, une 4ᵉ ligne ne tiendrait plus et on tomberait à
// 2 par page. 1.435 donne ~90.5 mm, avec une marge de sécurité confortable
// (nécessaire pour absorber le nom et prénom sur 2 lignes, voir drawLabelValue).
const Y_STRETCH = 1.435;
const CARD_ASPECT = 85.6 / (54 * Y_STRETCH);

// CARD_W est dérivé de la largeur de page disponible (une moitié par face) ;
// SCALE convertit ensuite les largeurs et polices dessinées à l'origine pour
// un CR80 de 85.6 mm de large vers cette nouvelle largeur.
const CARD_W = (PAGE_W - 2 * PAGE_SIDE_MARGIN) / 2;
const CARD_H = CARD_W / CARD_ASPECT;
const SCALE = CARD_W / 85.6;
const FONT_SCALE = 1.7;
const s = (v: number) => v * SCALE;
// Taille de police en points, avec un plancher à 8pt : en dessous, même les
// mentions secondaires (légendes, adresse...) deviennent difficiles à lire.
// La plupart des textes de la carte tombent sur ce plancher (8pt uniforme,
// propre et lisible) ; seuls les éléments volontairement plus grands (nom de
// l'école, titre de section, initiales de la photo) dépassent naturellement.
const MIN_FONT_PT = 8;
const f = (v: number) => Math.max(v * SCALE * FONT_SCALE, MIN_FONT_PT);

// Emplacements verticaux du recto/verso : chiffrés directement en mm plutôt
// que dérivés de s()/SCALE, car ils ont été retuned à la main pour le plancher
// à 11pt ci-dessus (un simple facteur d'échelle ne suffit plus : les textes
// autrefois minuscules ont plus que doublé de taille, ceux déjà confortables
// beaucoup moins — l'espacement ne peut donc plus être uniformément dérivé
// d'un seul multiplicateur). BODY_LINE_PITCH est l'écart confortable entre
// deux lignes de texte au plancher 11pt.
const BODY_LINE_PITCH = 4.8;

// Marge interne gauche/droite (padding du contenu par rapport aux bords de la
// carte), volontairement resserrée pour laisser plus de place au contenu.
const MARGIN = s(2.5);
const CENTER_X = CARD_W / 2;
const CONTENT_W = CARD_W - 2 * MARGIN;

// Les deux faces sont dessinées dans un repère local à la carte (origine en
// haut à gauche). Ce contexte se contente d'ajouter un décalage (offsetX,
// offsetY) à chaque appel de dessin, ce qui permet de réutiliser telles
// quelles les fonctions drawRecto/drawVerso pour placer chaque face à un
// endroit différent de la page A4 finale, sans dupliquer leur logique.
interface PdfCtx {
  setFont(fontName: string, fontStyle?: string): void;
  setFontSize(size: number): void;
  setTextColor(...args: number[]): void;
  setDrawColor(...args: number[]): void;
  setLineWidth(width: number): void;
  getTextWidth(text: string): number;
  splitTextToSize(text: string, maxWidth: number): string[];
  saveGraphicsState(): void;
  restoreGraphicsState(): void;
  clip(): void;
  discardPath(): void;
  text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): void;
  rect(x: number, y: number, w: number, h: number, style?: string | null): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  addImage(data: string, format: string, x: number, y: number, w: number, h: number): void;
}

function createOffsetContext(doc: jsPDF, offsetX: number, offsetY: number): PdfCtx {
  return {
    setFont: (...args) => void (doc.setFont as (...a: unknown[]) => unknown)(...args),
    setFontSize: (...args) => void (doc.setFontSize as (...a: unknown[]) => unknown)(...args),
    setTextColor: (...args) => void (doc.setTextColor as (...a: unknown[]) => unknown)(...args),
    setDrawColor: (...args) => void (doc.setDrawColor as (...a: unknown[]) => unknown)(...args),
    setLineWidth: (...args) => void (doc.setLineWidth as (...a: unknown[]) => unknown)(...args),
    getTextWidth: (...args) => (doc.getTextWidth as (...a: unknown[]) => number)(...args),
    splitTextToSize: (...args) =>
      (doc.splitTextToSize as (...a: unknown[]) => string[])(...args),
    saveGraphicsState: () => doc.saveGraphicsState(),
    restoreGraphicsState: () => doc.restoreGraphicsState(),
    clip: () => doc.clip(),
    discardPath: () => doc.discardPath(),
    text: (text, x, y, options) => {
      doc.text(text as string, x + offsetX, y + offsetY, options);
    },
    rect: (x, y, w, h, style) => {
      doc.rect(x + offsetX, y + offsetY, w, h, style);
    },
    line: (x1, y1, x2, y2) => {
      doc.line(x1 + offsetX, y1 + offsetY, x2 + offsetX, y2 + offsetY);
    },
    addImage: (data, format, x, y, w, h) => {
      doc.addImage(data, format, x + offsetX, y + offsetY, w, h);
    },
  };
}

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

// En-tête partagé par les deux faces : nom, slogan et coordonnées de l'établissement,
// séparés du reste par un simple filet — identique dans l'esprit à celui du certificat
// de scolarité. Le verso n'affiche pas l'adresse/téléphone (déjà repris dans le bloc
// "en cas de perte" juste en dessous) pour rester sobre et laisser plus de place.
// Le nom, le slogan et l'adresse/téléphone sont maintenant repliés sur plusieurs
// lignes au besoin (splitTextToSize) : au plancher de 11pt, l'adresse complète ne
// tient plus sur une seule ligne. Retourne la position Y où le contenu suivant
// (titre de section, bloc "en cas de perte"...) peut commencer, puisque la
// hauteur réelle de l'en-tête varie selon le nombre de lignes.
function drawCardHeader(doc: PdfCtx, showContact = true): number {
  let y = 5.2;

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(f(3));
  doc.setTextColor(...ACCENT);
  doc.text(SCHOOL_LEVEL_LABEL, CENTER_X, y, { align: "center" });
  y += 5.4;

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(6.5));
  doc.setTextColor(...PRIMARY);
  doc.text(SCHOOL_NAME, CENTER_X, y, { align: "center" });
  y += 5.4;

  doc.setFont(POPPINS, "normal");
  doc.setFontSize(f(2.9));
  doc.setTextColor(0, 0, 0);
  const taglineLines = doc.splitTextToSize(SCHOOL_TAGLINE, CONTENT_W);
  doc.text(taglineLines, CENTER_X, y, { align: "center" });
  y += (taglineLines.length - 1) * BODY_LINE_PITCH + 2.0;

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(s(0.35));
  doc.line(MARGIN, y, CARD_W - MARGIN, y);
  y += 3.2;

  if (showContact) {
    doc.setFont(POPPINS, "normal");
    // Volontairement sous le plancher MIN_FONT_PT : l'adresse complète de
    // l'établissement est une mention secondaire, pas un champ à lire de loin.
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    const contactLines = doc.splitTextToSize(
      `${SCHOOL_ADDRESS}  •  Tél. ${SCHOOL_PHONE}`,
      CONTENT_W
    );
    doc.text(contactLines, CENTER_X, y, { align: "center" });
    y += (contactLines.length - 1) * BODY_LINE_PITCH + 1.5;
  } else {
    y -= 0.7;
  }

  return y;
}

// Titre de section, centré, souligné d'un trait court — même motif que le titre
// "CERTIFICAT DE SCOLARITÉ" du certificat.
function drawSectionTitle(doc: PdfCtx, y: number, text: string) {
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(6.2));
  doc.setTextColor(0, 0, 0);
  doc.text(text, CENTER_X, y, { align: "center" });
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(s(0.4));
  doc.line(CENTER_X - s(14), y + 1.6, CENTER_X + s(14), y + 1.6);
}

// Ligne "libellé : valeur" toute simple, comme dans le bloc identité du certificat.
// boldValue met la valeur en gras (utilisé pour le nom et prénom de l'élève, pour
// qu'il ressorte davantage que les autres champs). wrap autorise la valeur à
// passer à la ligne plutôt que d'être tronquée si elle ne tient pas à côté du
// libellé (utilisé pour le nom et prénom, qui doit toujours s'afficher en
// entier). Retourne la hauteur supplémentaire (mm) consommée au-delà d'une
// ligne normale, pour que l'appelant puisse décaler la ligne suivante d'autant.
function drawLabelValue(
  doc: PdfCtx,
  x: number,
  y: number,
  maxWidth: number,
  label: string,
  value: string,
  boldValue = false,
  wrap = false
): number {
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(3.7));
  doc.setTextColor(...PRIMARY);
  const labelText = `${label} : `;
  doc.text(labelText, x, y);
  const labelW = doc.getTextWidth(labelText);

  doc.setFont(POPPINS, boldValue ? "bold" : "normal");
  doc.setFontSize(f(4));
  doc.setTextColor(0, 0, 0);

  if (wrap) {
    // Essaie d'abord à côté du libellé comme les autres champs ; si la valeur
    // ne tient pas sur cette largeur réduite, replie plutôt la valeur entière
    // sur la largeur complète de la colonne, sous le libellé.
    const sameLineFit = doc.splitTextToSize(value || "-", maxWidth - labelW);
    if (sameLineFit.length <= 1) {
      doc.text(sameLineFit[0] ?? "-", x + labelW, y);
      return 0;
    }
    // Lignes dessinées une par une (plutôt qu'un seul appel doc.text avec un
    // tableau) pour contrôler nous-mêmes l'interligne : le pas par défaut de
    // jsPDF est trop serré à cette taille de police.
    const wrappedLines = doc.splitTextToSize(value || "-", maxWidth);
    const linePitch = 4.0;
    wrappedLines.forEach((line, i) => {
      doc.text(line, x, y + linePitch * (i + 1));
    });
    return linePitch * wrappedLines.length;
  }

  const valueLine = doc.splitTextToSize(value || "-", maxWidth - labelW)[0];
  doc.text(valueLine, x + labelW, y);
  return 0;
}

async function drawRecto(
  doc: PdfCtx,
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  const headerBottom = drawCardHeader(doc);
  const sectionTitleY = headerBottom + 5.5;
  drawSectionTitle(doc, sectionTitleY, "CARTE D'IDENTITÉ SCOLAIRE");

  // ---- Photo, simple filet gris plutôt qu'un cadre en couleur ----
  const photoY = sectionTitleY + 5.0;
  const photoH = 38;
  const photoW = photoH * 0.78; // ratio de la photo recadrée à l'envoi, pour un cadrage sans bande vide
  const photoX = MARGIN;

  const photo = student.identityPhotoUrl ? await loadPhoto(student.identityPhotoUrl) : null;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(s(0.3));
  doc.rect(photoX, photoY, photoW, photoH, "S");
  if (photo) {
    const fit = fitContain(photo.width, photo.height, photoW - s(0.6), photoH - s(0.6));
    doc.saveGraphicsState();
    doc.rect(photoX + s(0.3), photoY + s(0.3), photoW - s(0.6), photoH - s(0.6), null);
    doc.clip();
    doc.discardPath();
    doc.addImage(
      photo.dataUrl,
      photo.format,
      photoX + s(0.3) + fit.x,
      photoY + s(0.3) + fit.y,
      fit.w,
      fit.h
    );
    doc.restoreGraphicsState();
  } else {
    doc.setFont(POPPINS, "bold");
    doc.setFontSize(f(9));
    doc.setTextColor(...PRIMARY);
    doc.text(initials(student.firstName, student.lastName), photoX + photoW / 2, photoY + photoH / 2 + 1.6, {
      align: "center",
    });
  }

  // ---- Informations, simples lignes "libellé : valeur" ----
  const infoX = photoX + photoW + s(3);
  const infoW = CARD_W - MARGIN - infoX;
  const rows: [string, string][] = [
    ["Nom et prénom", `${student.lastName.toUpperCase()} ${student.firstName}`],
    ["Classe", className],
    ["Né(e) le", formatDate(student.dateOfBirth)],
    ["Matricule", student.matricule],
    ["Adresse", student.address],
    ["Téléphone", student.phones?.filter(Boolean).join(" • ") || "-"],
  ];
  const ROW_PITCH = 6.0;
  let y = photoY + 1.0;
  for (const [label, value] of rows) {
    const isName = label === "Nom et prénom";
    const extra = drawLabelValue(doc, infoX, y, infoW, label, value, isName, isName);
    y += ROW_PITCH + extra;
  }

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(3.8));
  doc.setTextColor(...PRIMARY);
  doc.text(`Année scolaire : ${schoolYear}`, CENTER_X, CARD_H - 3.0, { align: "center" });
}

async function drawVerso(
  doc: PdfCtx,
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  const headerBottom = drawCardHeader(doc, false);

  // ---- Rangée "en cas de perte" (à gauche) + QR code (à droite) : pas de titre
  // de section, pour laisser le plus de place possible aux signatures en dessous.
  const rowY = headerBottom + 2.5;
  const qrSize = 22;
  const qrX = CARD_W - MARGIN - qrSize;
  const qrY = rowY - 3.5;
  const textMaxW = qrX - s(3) - MARGIN;

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(3.3));
  doc.setTextColor(...PRIMARY);
  doc.text("EN CAS DE PERTE", MARGIN, rowY);

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(f(4.2));
  doc.setTextColor(0, 0, 0);
  const contactY = rowY + 5.4;
  doc.text(`Contactez : ${SCHOOL_PHONE}`, MARGIN, contactY);

  doc.setFont(POPPINS, "normal");
  doc.setFontSize(f(3));
  doc.setTextColor(110, 110, 110);
  const noticeLines = doc.splitTextToSize(
    "Carte à usage strictement personnel, à présenter à l'entrée de l'établissement.",
    textMaxW
  );
  // Lignes dessinées une par une (plutôt qu'un seul appel doc.text avec un
  // tableau) pour contrôler nous-mêmes l'interligne : le pas par défaut de
  // jsPDF est trop serré à cette taille de police.
  const noticeY0 = contactY + 5.6;
  const noticeLinePitch = 4.0;
  noticeLines.forEach((line, i) => {
    doc.text(line, MARGIN, noticeY0 + noticeLinePitch * i);
  });
  const noticeEnd = noticeY0 + (noticeLines.length - 1) * noticeLinePitch;

  const qrDataUrl = await generateQrCode(buildQrContent(student, className, schoolYear));
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // ---- Signatures : élève/parent d'un côté, établissement de l'autre ----
  // Le filet et le bloc signatures démarrent après le plus bas des deux
  // colonnes ci-dessus (texte "en cas de perte" à gauche, QR code à droite),
  // avec un espace blanc généreux au-dessus des traits pour que le stylo
  // tienne vraiment dans la boîte, pas seulement le trait lui-même.
  const leftColumnBottom = noticeEnd + 3.0;
  const rightColumnBottom = qrY + qrSize + 2.0;
  const sepY = Math.max(leftColumnBottom, rightColumnBottom) + 2.0;

  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(s(0.2));
  doc.line(MARGIN, sepY, CARD_W - MARGIN, sepY);

  const contentW = CARD_W - 2 * MARGIN;
  const sigGap = s(4);
  const sigW = (contentW - sigGap) / 2;
  const leftSigX = MARGIN;
  const rightSigX = MARGIN + sigW + sigGap;
  // Ancrées depuis le bas de la carte (plutôt que juste après sepY) pour que
  // les signatures restent tout en bas quelle que soit la hauteur du contenu
  // au-dessus, au lieu de flotter au milieu de l'espace restant.
  const sigCaptionY = CARD_H - 3.0;
  const sigLineY = sigCaptionY - 3.5;

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(s(0.25));
  doc.line(leftSigX, sigLineY, leftSigX + sigW, sigLineY);
  doc.line(rightSigX, sigLineY, rightSigX + sigW, sigLineY);

  doc.setFont(POPPINS, "normal");
  doc.setFontSize(f(3));
  doc.setTextColor(90, 90, 90);
  doc.text("Signature élève / parent", leftSigX + sigW / 2, sigCaptionY, { align: "center" });
  doc.text("Signature établissement", rightSigX + sigW / 2, sigCaptionY, {
    align: "center",
  });
}

// Dessine le recto et le verso d'un élève côte à côte à la position (x, y)
// donnée sur la page courante, avec les repères de découpe autour — utilisé
// aussi bien pour l'export d'un seul élève que pour l'export d'une classe
// entière, où plusieurs paires sont empilées sur la même page.
async function drawCardPair(
  doc: jsPDF,
  student: StudentForCard,
  className: string,
  schoolYear: string,
  x: number,
  y: number
) {
  const rectoX = x;
  const versoX = x + CARD_W;

  await drawRecto(createOffsetContext(doc, rectoX, y), student, className, schoolYear);
  await drawVerso(createOffsetContext(doc, versoX, y), student, className, schoolYear);

  // Repères de découpe : un filet gris autour du bloc des deux cartes, et un
  // second au milieu pour séparer le recto du verso.
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(rectoX, y, CARD_W * 2, CARD_H, "S");
  doc.line(versoX, y, versoX, y + CARD_H);
}

export async function exportCarteIdentitePdf(
  student: StudentForCard,
  className: string,
  schoolYear: string
) {
  // Une seule page A4 portrait, avec le recto et le verso placés côte à côte,
  // sans espace entre eux mais avec une petite marge de part et d'autre de
  // la page.
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerPoppins(doc);

  const startY = (PAGE_H - CARD_H) / 2;
  await drawCardPair(doc, student, className, schoolYear, PAGE_SIDE_MARGIN, startY);

  doc.save(`carte-identite-${slugify(`${student.lastName}-${student.firstName}`)}.pdf`);
}

// Export groupé pour une classe entière : un seul fichier PDF, avec plusieurs
// paires recto/verso empilées sur chaque page A4 (au lieu d'une page par
// élève) pour limiter le gaspillage de papier à l'impression. CARD_H est
// dimensionné (voir Y_STRETCH plus haut) pour que ce nombre reste exactement 3.
export async function exportCarteIdentiteClassePdf(
  students: StudentForCard[],
  className: string,
  schoolYear: string
) {
  if (students.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerPoppins(doc);

  const rowGap = 6;
  const rowsPerPage = Math.max(
    1,
    Math.floor((PAGE_H - 2 * PAGE_SIDE_MARGIN + rowGap) / (CARD_H + rowGap))
  );

  for (let i = 0; i < students.length; i++) {
    const rowOnPage = i % rowsPerPage;
    if (i > 0 && rowOnPage === 0) {
      doc.addPage("a4", "portrait");
    }

    // Nombre de lignes sur la page courante (peut être inférieur à
    // rowsPerPage sur la dernière page) — sert à centrer verticalement le
    // bloc de cartes plutôt que de le coller en haut de page.
    const rowsOnThisPage = Math.min(rowsPerPage, students.length - (i - rowOnPage));
    const blockH = rowsOnThisPage * CARD_H + (rowsOnThisPage - 1) * rowGap;
    const blockStartY = (PAGE_H - blockH) / 2;
    const rowY = blockStartY + rowOnPage * (CARD_H + rowGap);

    await drawCardPair(doc, students[i], className, schoolYear, PAGE_SIDE_MARGIN, rowY);
  }

  doc.save(`cartes-identite-${slugify(className || "classe")}.pdf`);
}
