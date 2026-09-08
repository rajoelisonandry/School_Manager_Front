import { jsPDF, GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, ACCENT, SCHOOL_ADDRESS, SCHOOL_PHONE, slugify } from "./shared";
import { genderLabel, formatDate } from "./students-pdf";
import { SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_LEVEL_LABEL } from "@/lib/branding";
import { SCHOOL_MONTHS } from "@/lib/school-year";
import { POPPINS, registerPoppins, loadPhoto, fitContain } from "./pdf-assets";

export interface StudentForCarnet {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  status: string;
  address: string;
  phones: string[];
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;
  guardianName?: string;
  guardianProfession?: string;
  identityPhotoUrl?: string;
}

export interface CarnetPaidEntry {
  date: string;
  amount: number;
}

// Paiements déjà encaissés à la date d'export, pour préremplir le tableau au lieu
// de le laisser entièrement vide : chaque mois d'écolage déjà réglé avec sa date
// et son montant (`ecolageByMonth`, indexé par la clé de mois — voir
// SCHOOL_MONTHS), et pour chaque "autre" type de paiement positionné (voir
// OtherPaymentType), son propre paiement déjà réglé (`byPaymentTypeId`, indexé
// par l'ID du type).
export interface CarnetPaymentSummary {
  ecolageByMonth?: Partial<Record<string, CarnetPaidEntry>>;
  byPaymentTypeId?: Partial<Record<string, CarnetPaidEntry>>;
}

// Type de paiement autre que l'écolage (qui reste la série de lignes
// mensuelles du tableau), positionné dans le tableau de suivi du carnet grâce
// à periodMonths (mois calendaire 1-12, ex: 9 = septembre) : sa ligne
// apparaît juste avant la ligne du mois correspondant.
export interface OtherPaymentType {
  id: string;
  name: string;
  periodMonths: number;
}

const LIGHT: [number, number, number] = PRIMARY.map((c) =>
  Math.round(c + (255 - c) * 0.75)
) as [number, number, number];
const MARGIN = 14;
const CORNER_MARK_LENGTH = 9;

// Découpe le titre sur 2 lignes si une seule ligne dépasse la largeur disponible.
function fitTitleLines(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(text) <= maxWidth) return [text];
  const words = text.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function drawFoldGuide(doc: jsPDF, centerX: number, pageHeight: number) {
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(centerX, MARGIN, centerX, pageHeight - MARGIN);
  doc.setLineDashPattern([], 0);
}

// Fond abstrait moderne : formes géométriques translucides réparties sur toute la page.
function drawAbstractBackground(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();

  // Grands cercles d'ambiance dans les coins
  doc.setGState(new GState({ opacity: 0.08 }));
  doc.setFillColor(...PRIMARY);
  doc.circle(pageWidth - 16, -10, 66, "F");
  doc.circle(-10, pageHeight + 12, 55, "F");

  doc.setGState(new GState({ opacity: 0.12 }));
  doc.setFillColor(...ACCENT);
  doc.circle(pageWidth * 0.52, pageHeight + 20, 48, "F");
  doc.circle(pageWidth + 6, pageHeight * 0.42, 34, "F");

  doc.setGState(new GState({ opacity: 0.06 }));
  doc.setFillColor(...PRIMARY);
  doc.circle(pageWidth * 0.14, pageHeight * 0.12, 20, "F");
  doc.circle(pageWidth * 0.86, pageHeight * 0.85, 26, "F");

  // Triangles pour la touche géométrique
  doc.setGState(new GState({ opacity: 0.08 }));
  doc.setFillColor(...PRIMARY);
  doc.triangle(
    pageWidth - 54,
    pageHeight - 6,
    pageWidth - 6,
    pageHeight - 44,
    pageWidth - 6,
    pageHeight - 6,
    "F"
  );
  doc.triangle(pageWidth * 0.36, -8, pageWidth * 0.46, 18, pageWidth * 0.26, 18, "F");

  doc.setGState(new GState({ opacity: 0.11 }));
  doc.setFillColor(...ACCENT);
  doc.triangle(-14, 38, 28, 8, 28, 56, "F");
  doc.triangle(pageWidth * 0.62, pageHeight + 10, pageWidth * 0.7, pageHeight - 16, pageWidth * 0.78, pageHeight + 10, "F");

  // Petits anneaux fins, pour la texture
  doc.setGState(new GState({ opacity: 0.16 }));
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.circle(pageWidth * 0.24, pageHeight * 0.9, 5, "S");
  doc.circle(pageWidth * 0.9, pageHeight * 0.18, 7, "S");
  doc.setDrawColor(...PRIMARY);
  doc.circle(pageWidth * 0.06, pageHeight * 0.55, 4, "S");

  doc.setGState(new GState({ opacity: 1 }));
  doc.restoreGraphicsState();
}

const KID_PALETTE: [number, number, number][] = [
  [255, 196, 0], // jaune
  [255, 99, 132], // rose
  [76, 201, 127], // vert
  [64, 156, 255], // bleu ciel
  ACCENT,
];

function starPoints(cx: number, cy: number, outerR: number, innerR: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

function drawStar(doc: jsPDF, cx: number, cy: number, outerR: number, innerR: number) {
  const pts = starPoints(cx, cy, outerR, innerR);
  const segments: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    segments.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  doc.lines(segments, pts[0][0], pts[0][1], [1, 1], "F", true);
}

// Fond abstrait plus enfantin (classes de primaire) : ronds colorés façon confettis
// et petites étoiles, dans une palette vive plutôt que les tons sobres bleu/orange.
function drawPlayfulBackground(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();

  const dots: { x: number; y: number; r: number; color: [number, number, number]; opacity: number }[] = [
    { x: pageWidth * 0.06, y: pageHeight * 0.1, r: 14, color: KID_PALETTE[0], opacity: 0.22 },
    { x: pageWidth * 0.92, y: pageHeight * 0.08, r: 20, color: KID_PALETTE[3], opacity: 0.18 },
    { x: pageWidth * 0.04, y: pageHeight * 0.5, r: 10, color: KID_PALETTE[1], opacity: 0.2 },
    { x: pageWidth * 0.96, y: pageHeight * 0.45, r: 16, color: KID_PALETTE[2], opacity: 0.2 },
    { x: pageWidth * 0.1, y: pageHeight * 0.88, r: 22, color: KID_PALETTE[4], opacity: 0.18 },
    { x: pageWidth * 0.9, y: pageHeight * 0.92, r: 18, color: KID_PALETTE[0], opacity: 0.2 },
    { x: pageWidth * 0.5, y: pageHeight * 1.02, r: 40, color: KID_PALETTE[3], opacity: 0.14 },
    { x: pageWidth * 0.5, y: -6, r: 34, color: KID_PALETTE[1], opacity: 0.12 },
    { x: pageWidth * 0.3, y: pageHeight * 0.2, r: 6, color: KID_PALETTE[2], opacity: 0.25 },
    { x: pageWidth * 0.72, y: pageHeight * 0.28, r: 5, color: KID_PALETTE[0], opacity: 0.25 },
    { x: pageWidth * 0.22, y: pageHeight * 0.7, r: 5, color: KID_PALETTE[3], opacity: 0.25 },
    { x: pageWidth * 0.8, y: pageHeight * 0.65, r: 6, color: KID_PALETTE[1], opacity: 0.25 },
  ];
  for (const dot of dots) {
    doc.setGState(new GState({ opacity: dot.opacity }));
    doc.setFillColor(...dot.color);
    doc.circle(dot.x, dot.y, dot.r, "F");
  }

  const stars: { x: number; y: number; r: number; color: [number, number, number] }[] = [
    { x: pageWidth * 0.14, y: pageHeight * 0.32, r: 7, color: KID_PALETTE[0] },
    { x: pageWidth * 0.86, y: pageHeight * 0.18, r: 6, color: KID_PALETTE[1] },
    { x: pageWidth * 0.2, y: pageHeight * 0.78, r: 5, color: KID_PALETTE[3] },
    { x: pageWidth * 0.78, y: pageHeight * 0.82, r: 6, color: KID_PALETTE[2] },
  ];
  doc.setGState(new GState({ opacity: 0.28 }));
  for (const star of stars) {
    doc.setFillColor(...star.color);
    drawStar(doc, star.x, star.y, star.r, star.r * 0.45);
  }

  doc.setGState(new GState({ opacity: 1 }));
  doc.restoreGraphicsState();
}

// Cadre fin + petits repères d'angle façon "viseur" : aucune couleur de fond,
// juste des traits, pour un rendu moderne qui occupe toute la hauteur de la page.
function drawFrame(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.9);
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    doc.line(cx, cy, cx + dx * CORNER_MARK_LENGTH, cy);
    doc.line(cx, cy, cx, cy + dy * CORNER_MARK_LENGTH);
  }
}

async function drawCoverPage(
  doc: jsPDF,
  student: StudentForCarnet,
  className: string,
  schoolYear: string,
  classLevel: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  if (classLevel?.toLowerCase() === "primaire") {
    drawPlayfulBackground(doc, pageWidth, pageHeight);
  } else {
    drawAbstractBackground(doc, pageWidth, pageHeight);
  }
  drawFoldGuide(doc, centerX, pageHeight);

  const frameX = centerX + 8;
  const frameY = MARGIN;
  const frameW = pageWidth - MARGIN - frameX;
  const frameH = pageHeight - 2 * MARGIN;

  const pad = 10;
  const contentX = frameX + pad;
  const contentW = frameW - 2 * pad;
  // Pas de cadre sur cette page : on remonte le contenu au lieu de garder l'espacement
  // qui servait à l'éloigner de la bordure.
  const contentTop = frameY + 3;
  const contentBottom = frameY + frameH - pad;
  const contentH = contentBottom - contentTop;
  const centerContentX = contentX + contentW / 2;

  let cursorY = contentTop;

  // En-tête : type d'établissement, nom, slogan, adresse et contact
  const headerH = contentH * 0.24;
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  doc.text(SCHOOL_LEVEL_LABEL, centerContentX, cursorY + headerH * 0.1, { align: "center" });
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(19);
  doc.setTextColor(...PRIMARY);
  doc.text(SCHOOL_NAME, centerContentX, cursorY + headerH * 0.24, { align: "center" });
  doc.setFont(POPPINS, "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(SCHOOL_TAGLINE, centerContentX, cursorY + headerH * 0.35, {
    align: "center",
  });
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(centerContentX - 16, cursorY + headerH * 0.42, centerContentX + 16, cursorY + headerH * 0.42);

  doc.setFont(POPPINS, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Adresse : ${SCHOOL_ADDRESS}`, centerContentX, cursorY + headerH * 0.56, {
    align: "center",
  });
  doc.text(`Tél. : ${SCHOOL_PHONE}`, centerContentX, cursorY + headerH * 0.68, {
    align: "center",
  });
  cursorY += headerH;

  // Titre, sans fond : uniquement du texte Poppins, plus grand, souligné d'un trait fin
  const titleH = contentH * 0.16;
  const titleFontSize = 23;
  const titleLines = fitTitleLines(doc, "CARNET DE CORRESPONDANCE", contentW, titleFontSize);
  doc.setTextColor(...PRIMARY);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(titleFontSize);
  let titleBaselineY: number;
  if (titleLines.length === 1) {
    titleBaselineY = cursorY + titleH * 0.55;
    doc.text(titleLines[0], centerContentX, titleBaselineY, { align: "center" });
  } else {
    doc.text(titleLines[0], centerContentX, cursorY + titleH * 0.42, { align: "center" });
    titleBaselineY = cursorY + titleH * 0.75;
    doc.text(titleLines[1], centerContentX, titleBaselineY, { align: "center" });
  }
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.7);
  doc.line(centerContentX - 20, titleBaselineY + 4, centerContentX + 20, titleBaselineY + 4);
  cursorY += titleH;

  // Photo d'identité : ni fond ni contour, juste la photo (coins arrondis par découpe)
  // ou, à défaut, un léger texte indicatif.
  const baseBlockH = contentH * 0.25;
  // Marge réduite (4 -> 3) au-dessus/en dessous de la photo pour lui laisser un peu
  // plus de largeur, sans empiéter sur la fiche ni sur le bloc "année scolaire" ancré
  // en bas de page.
  const photoTopPad = 3;
  const baseMaxPhotoH = baseBlockH - photoTopPad * 2;
  // Photo agrandie de 30% par rapport à la taille d'origine ; le bloc qui lui est
  // réservé grandit d'autant pour ne pas empiéter sur les sections voisines.
  const photoH = Math.min(baseMaxPhotoH, contentW * 0.5) * 1.3;
  const photoW = photoH * 0.78;
  const photoX = centerContentX - photoW / 2;
  const photoY = cursorY + photoTopPad;
  const photoBlockH = photoH + photoTopPad * 2;

  const photo = student.identityPhotoUrl ? await loadPhoto(student.identityPhotoUrl) : null;

  if (photo) {
    // Pas de contour : coins arrondis obtenus par découpe (clip), rendu plus sobre et moderne.
    const fit = fitContain(photo.width, photo.height, photoW, photoH);
    doc.saveGraphicsState();
    doc.roundedRect(photoX, photoY, photoW, photoH, 3, 3, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(photo.dataUrl, photo.format, photoX + fit.x, photoY + fit.y, fit.w, fit.h);
    doc.restoreGraphicsState();
  } else {
    doc.setFont(POPPINS, "semibold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("Photo d'identité", centerContentX, photoY + photoH / 2, { align: "center" });
  }
  cursorY += photoBlockH;

  // Fiche : nom, prénom, matricule et classe, délimitée par de simples filets
  // discrets (au lieu d'un encadré fermé) en haut et en bas.
  const infoBoxH = contentH * 0.18;
  doc.setDrawColor(215, 215, 215);
  doc.setLineWidth(0.25);
  doc.line(contentX, cursorY, contentX + contentW, cursorY);
  doc.line(contentX, cursorY + infoBoxH, contentX + contentW, cursorY + infoBoxH);

  // Décalages fixes (plutôt que proportionnels à infoBoxH) pour garantir un vrai
  // espace entre le nom et la ligne matricule/classe, quelle que soit la hauteur du bloc.
  const boxPad = 6;
  const row1Y = cursorY + 11;
  const row2Y = cursorY + 24;

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text("NOM ET PRÉNOM", contentX + boxPad, row1Y - 5);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(`${student.lastName} ${student.firstName}`, contentX + boxPad, row1Y + 2);

  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text("MATRICULE", contentX + boxPad, row2Y - 5);
  doc.text("CLASSE", contentX + contentW - boxPad, row2Y - 5, { align: "right" });
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(student.matricule || "-", contentX + boxPad, row2Y + 2);
  doc.text(className || "-", contentX + contentW - boxPad, row2Y + 2, { align: "right" });

  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.line(contentX + contentW / 2, row2Y - 8, contentX + contentW / 2, row2Y + 4);

  cursorY += infoBoxH;

  // Année scolaire, ancrée tout en bas (au lieu d'être centrée dans l'espace restant),
  // avec l'espace libéré au-dessus pour bien la détacher de la fiche.
  const yearValueBaselineY = contentBottom - 2;
  const yearLabelBaselineY = yearValueBaselineY - 10;
  const yearLineY = yearValueBaselineY - 2;
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY);
  doc.text("ANNÉE SCOLAIRE", centerContentX, yearLabelBaselineY, { align: "center" });
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const yearWidth = doc.getTextWidth(schoolYear);
  doc.text(schoolYear, centerContentX, yearValueBaselineY, { align: "center" });
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(centerContentX - yearWidth / 2 - 14, yearLineY, centerContentX - yearWidth / 2 - 4, yearLineY);
  doc.line(centerContentX + yearWidth / 2 + 4, yearLineY, centerContentX + yearWidth / 2 + 14, yearLineY);

  doc.setTextColor(0, 0, 0);
}

// Format manuel (ex: "90.000Ar") plutôt que toLocaleString("fr-FR") : ce dernier
// utilise une espace fine insécable comme séparateur de milliers, un caractère que
// la police Helvetica standard de jsPDF ne sait pas afficher (glyphe manquant,
// rendu comme un "/" dans le tableau). Le point + l'absence d'espace tiennent
// aussi mieux dans la largeur de la colonne "Montant".
function formatAriary(amount: number) {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}Ar`;
}

interface CarnetRowSpec {
  key: string;
  label: string;
  paid?: CarnetPaidEntry;
}

// Construit dynamiquement les lignes du tableau : les mensualités d'écolage
// (de septembre à juillet, le mois d'août étant hors année scolaire) encadrées
// par les "autres" types de paiement (voir OtherPaymentType) — chacun inséré
// juste avant la ligne du mois indiqué par son periodMonths (mois calendaire
// 1-12). Plusieurs types visant le même mois s'empilent dans leur ordre
// d'origine (déjà alphabétique, voir getPaymentTypes) ; un periodMonths hors
// année scolaire (ex: août, ou une valeur invalide) atterrit en fin de tableau
// plutôt que d'être perdu silencieusement.
function buildRowSpecs(
  otherPaymentTypes: OtherPaymentType[],
  paymentSummary: CarnetPaymentSummary
): CarnetRowSpec[] {
  const byCalendarMonth = new Map<number, OtherPaymentType[]>();
  const outOfRange: OtherPaymentType[] = [];
  for (const type of otherPaymentTypes) {
    const isInSchoolYear = SCHOOL_MONTHS.some(
      (m) => m.key !== "aout" && m.monthIndex + 1 === type.periodMonths
    );
    if (!isInSchoolYear) {
      outOfRange.push(type);
      continue;
    }
    const list = byCalendarMonth.get(type.periodMonths) ?? [];
    list.push(type);
    byCalendarMonth.set(type.periodMonths, list);
  }

  const toRow = (type: OtherPaymentType): CarnetRowSpec => ({
    key: `type-${type.id}`,
    label: type.name,
    paid: paymentSummary.byPaymentTypeId?.[type.id],
  });

  const rows: CarnetRowSpec[] = [];
  for (const month of SCHOOL_MONTHS) {
    if (month.key === "aout") continue;
    for (const type of byCalendarMonth.get(month.monthIndex + 1) ?? []) {
      rows.push(toRow(type));
    }
    rows.push({ key: month.key, label: month.label, paid: paymentSummary.ecolageByMonth?.[month.key] });
  }
  for (const type of outOfRange) rows.push(toRow(type));

  return rows;
}

const TABLE_DEFAULT_FONT_SIZE = 9;
const TABLE_DEFAULT_PADDING = 1.5;
const TABLE_MIN_FONT_SIZE = 5;
const TABLE_MIN_PADDING = 0.4;
// Marge de sécurité sur l'estimation de hauteur de ligne (le facteur d'interligne
// réel de jsPDF peut légèrement différer de l'approximation ci-dessous).
const TABLE_ROW_HEIGHT_SAFETY = 1.08;

function estimateTableRowHeight(fontSize: number, padding: number) {
  return (fontSize * 1.15 * 0.3528 + padding * 2) * TABLE_ROW_HEIGHT_SAFETY;
}

interface TableStyle {
  fontSize: number;
  cellPadding: number;
  rowHeight: number;
}

// Calcule la police, le remplissage et la hauteur de ligne du tableau pour
// qu'il occupe toute la hauteur disponible : peu de lignes (peu de types de
// paiement positionnés) → les lignes s'étirent pour couvrir la page ; beaucoup
// de lignes → la police et le remplissage se resserrent (jusqu'à un plancher
// lisible) pour que le tableau tienne toujours sur cette seule page, plutôt
// que de déborder sur une 2ᵉ page.
function computeTableStyle(rowCount: number, availableHeight: number): TableStyle {
  const targetRowHeight = availableHeight / rowCount;
  const naturalRowHeight = estimateTableRowHeight(TABLE_DEFAULT_FONT_SIZE, TABLE_DEFAULT_PADDING);

  if (naturalRowHeight <= targetRowHeight) {
    return { fontSize: TABLE_DEFAULT_FONT_SIZE, cellPadding: TABLE_DEFAULT_PADDING, rowHeight: targetRowHeight };
  }

  // Réduit d'abord le remplissage des cellules (police par défaut conservée),
  // puis seulement si ça ne suffit toujours pas la police elle-même — comme
  // pour l'emploi du temps (voir timetable-pdf.ts).
  const paddingForDefaultFont =
    (targetRowHeight / TABLE_ROW_HEIGHT_SAFETY - TABLE_DEFAULT_FONT_SIZE * 1.15 * 0.3528) / 2;
  if (paddingForDefaultFont >= TABLE_MIN_PADDING) {
    return { fontSize: TABLE_DEFAULT_FONT_SIZE, cellPadding: paddingForDefaultFont, rowHeight: targetRowHeight };
  }

  const fontForMinPadding =
    (targetRowHeight / TABLE_ROW_HEIGHT_SAFETY - TABLE_MIN_PADDING * 2) / (1.15 * 0.3528);
  return {
    fontSize: Math.max(TABLE_MIN_FONT_SIZE, fontForMinPadding),
    cellPadding: TABLE_MIN_PADDING,
    rowHeight: targetRowHeight,
  };
}

// Tableau vierge de suivi de l'écolage (colonnes mois / date / montant / signature),
// destiné à être rempli à la main. Occupe la moitié gauche de la page, en miroir de
// la fiche de renseignements affichée à droite.
function drawEcolageTable(
  doc: jsPDF,
  ecolageAmount: number,
  otherPaymentTypes: OtherPaymentType[],
  paymentSummary: CarnetPaymentSummary
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const frameX = MARGIN;
  const frameY = MARGIN;
  const frameW = centerX - 8 - MARGIN;
  const frameH = pageHeight - 2 * MARGIN;

  // Pas de cadre ici (contrairement à la fiche de droite) : uniquement le titre,
  // le montant de l'écolage, puis le tableau qui occupe tout l'espace restant.
  const pad = 5;
  const contentX = frameX + pad;
  const contentW = frameW - 2 * pad;
  const contentTop = frameY + pad;
  const contentBottom = frameY + frameH - pad;

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text("Suivi des paiements", contentX, contentTop + 5);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(contentX, contentTop + 8, contentX + contentW, contentTop + 8);

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(`ÉCOLAGE : ${formatAriary(ecolageAmount)}`, contentX, contentTop + 15);

  // Lignes construites dynamiquement (voir buildRowSpecs) : les mensualités
  // d'écolage encadrées par les "autres" types de paiement positionnés selon
  // leur periodMonths.
  const rowSpecs = buildRowSpecs(otherPaymentTypes, paymentSummary);

  // Police, remplissage et hauteur de ligne calculés pour que le tableau
  // (en-tête compris) occupe tout l'espace restant quel que soit le nombre de
  // lignes — avec une petite marge de sécurité pour ne jamais déborder sur une
  // nouvelle page (bordures, arrondis d'affichage) : voir computeTableStyle.
  const tableY = contentTop + 19;
  const safetyMargin = 8;
  const availableHeight = contentBottom - tableY - safetyMargin;
  const tableStyle = computeTableStyle(rowSpecs.length + 1, availableHeight);

  autoTable(doc, {
    startY: tableY,
    head: [["Libellé", "Date", "Montant", "Signature"]],
    body: rowSpecs.map(({ label, paid }) => [
      label,
      paid ? formatDate(paid.date) : "",
      paid ? formatAriary(paid.amount) : "",
      "",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: tableStyle.fontSize,
      cellPadding: tableStyle.cellPadding,
      valign: "middle",
      textColor: [0, 0, 0],
      lineColor: [205, 205, 205],
      lineWidth: 0.2,
      minCellHeight: tableStyle.rowHeight,
    },
    headStyles: {
      fillColor: false,
      textColor: PRIMARY,
      fontStyle: "bold",
      halign: "center",
      minCellHeight: tableStyle.rowHeight,
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.3, fontStyle: "bold" },
      1: { cellWidth: contentW * 0.2, halign: "center" },
      2: { cellWidth: contentW * 0.2, halign: "center" },
      3: { cellWidth: contentW * 0.3 },
    },
    margin: {
      left: contentX,
      right: pageWidth - (contentX + contentW),
      bottom: pageHeight - contentBottom,
    },
    tableWidth: contentW,
  });
}

function drawInfoPage(
  doc: jsPDF,
  student: StudentForCarnet,
  className: string,
  ecolageAmount: number,
  otherPaymentTypes: OtherPaymentType[],
  paymentSummary: CarnetPaymentSummary
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  drawFoldGuide(doc, centerX, pageHeight);

  drawEcolageTable(doc, ecolageAmount, otherPaymentTypes, paymentSummary);

  const frameX = centerX + 8;
  const frameY = MARGIN;
  const frameW = pageWidth - MARGIN - frameX;
  const frameH = pageHeight - 2 * MARGIN;
  drawFrame(doc, frameX, frameY, frameW, frameH);

  const pad = 10;
  const contentX = frameX + pad;
  const contentW = frameW - 2 * pad;
  const contentTop = frameY + pad;
  const contentBottom = frameY + frameH - pad;

  doc.setFont(POPPINS, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  doc.text(SCHOOL_LEVEL_LABEL, contentX, contentTop + 2.5);
  doc.setFont(POPPINS, "semibold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text(SCHOOL_NAME, contentX, contentTop + 9);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text("Fiche de renseignements", contentX, contentTop + 18);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(contentX, contentTop + 22, contentX + contentW, contentTop + 22);

  const rows: [string, string][] = [
    ["Matricule", student.matricule],
    ["Nom", student.lastName],
    ["Prénom", student.firstName],
    ["Date de naissance", formatDate(student.dateOfBirth)],
    ["Lieu de naissance", student.placeOfBirth || "-"],
    ["Genre", genderLabel(student.gender)],
    ["Classe", className],
    ["Adresse", student.address || "-"],
    ["Nom du père", student.fatherName || "-"],
    ["Profession du père", student.fatherProfession || "-"],
    ["Nom de la mère", student.motherName || "-"],
    ["Profession de la mère", student.motherProfession || "-"],
  ];

  if (student.guardianName) {
    rows.push(["Nom du tuteur", student.guardianName]);
    rows.push(["Profession du tuteur", student.guardianProfession || "-"]);
  }

  // Téléphone(s) mis en évidence dans un bandeau tout en bas, plutôt que noyé dans la liste.
  const phoneFooterH = 20;
  const phoneFooterGap = 6;
  const phoneFooterY = contentBottom - phoneFooterH;
  const tableY = contentTop + 28;
  const tableBottom = phoneFooterY - phoneFooterGap;
  const rowH = (tableBottom - tableY) / rows.length;

  autoTable(doc, {
    startY: tableY,
    body: rows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: { left: 2, right: 2, top: 0, bottom: 0 },
      minCellHeight: rowH,
      valign: "middle",
      lineWidth: { bottom: 0.15 },
      lineColor: LIGHT,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: PRIMARY, cellWidth: contentW * 0.4 },
      1: { cellWidth: contentW * 0.6 },
    },
    margin: { left: contentX, right: pageWidth - (contentX + contentW), bottom: pageHeight - tableBottom },
    tableWidth: contentW,
  });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(contentX, phoneFooterY, contentX + contentW, phoneFooterY);
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text("TÉLÉPHONE(S)", contentX + contentW / 2, phoneFooterY + 8, { align: "center" });
  doc.setFont(POPPINS, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  const phonesText = student.phones?.filter(Boolean).join("   •   ") || "-";
  doc.text(phonesText, contentX + contentW / 2, phoneFooterY + 15, { align: "center" });
}

export async function exportCarnetCoverPdf(
  student: StudentForCarnet,
  className: string,
  schoolYear: string,
  classLevel: string = "",
  ecolageAmount: number = 0,
  otherPaymentTypes: OtherPaymentType[] = [],
  paymentSummary: CarnetPaymentSummary = {}
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registerPoppins(doc);

  await drawCoverPage(doc, student, className, schoolYear, classLevel);

  doc.addPage("a4", "landscape");
  drawInfoPage(doc, student, className, ecolageAmount, otherPaymentTypes, paymentSummary);

  doc.save(`carnet-${slugify(`${student.lastName}-${student.firstName}`)}.pdf`);
}
