import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getFinalY, drawPdfHeader, slugify } from "./shared";

// Cet export est volontairement tout en noir, sans le bleu de marque utilisé
// ailleurs (voir shared.ts) — une liste destinée à être imprimée/annotée, pas
// un document officiel aux couleurs de l'établissement.
const BLACK: [number, number, number] = [0, 0, 0];

export interface StudentForExport {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  gender: string;
  status?: string;
  classId: string;
  address?: string;
  phones?: string[];
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;
  guardianName?: string;
  guardianProfession?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export function genderLabel(gender: string) {
  return gender === "M" ? "Masculin" : "Féminin";
}

export function formatDate(date: string) {
  return date ? new Date(date).toLocaleDateString("fr-FR") : "-";
}

function calculateAge(dateOfBirth: string): string {
  if (!dateOfBirth) return "-";
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return String(age);
}

// Colonnes disponibles pour personnaliser l'export : la page d'appel construit
// ses cases à cocher (et son sélecteur d'ordre) à partir de cette liste (une
// seule source de vérité pour les libellés), et exportStudentsPdf s'en sert
// pour extraire la valeur de chaque élève sans dupliquer cette logique.
// getValue reçoit aussi l'index de la ligne dans le tableau (utilisé par
// "numero" ; ignoré par les autres colonnes).
export type ColumnKey =
  | "numero"
  | "matricule"
  | "fullName"
  | "dateOfBirth"
  | "age"
  | "placeOfBirth"
  | "gender"
  | "status"
  | "address"
  | "phones"
  | "fatherName"
  | "fatherProfession"
  | "motherName"
  | "motherProfession"
  | "guardianName"
  | "guardianProfession";

export const EXPORT_COLUMNS: {
  key: ColumnKey;
  label: string;
  getValue: (s: StudentForExport, index: number) => string;
}[] = [
  {
    key: "numero",
    label: "Numéro",
    // L'appelant (exportStudentsPdf) reçoit les élèves déjà triés par date de
    // création croissante (le plus ancien en premier) : ce numéro reflète
    // donc cet ordre-là, pas l'ordre choisi pour les colonnes.
    getValue: (_s, index) => String(index + 1),
  },
  { key: "matricule", label: "Matricule", getValue: (s) => s.matricule || "-" },
  { key: "fullName", label: "Nom et Prénom", getValue: (s) => `${s.lastName} ${s.firstName}` },
  { key: "dateOfBirth", label: "Date de naissance", getValue: (s) => formatDate(s.dateOfBirth) },
  { key: "age", label: "Âge", getValue: (s) => calculateAge(s.dateOfBirth) },
  { key: "placeOfBirth", label: "Lieu de naissance", getValue: (s) => s.placeOfBirth || "-" },
  { key: "gender", label: "Genre", getValue: (s) => genderLabel(s.gender) },
  { key: "status", label: "Statut", getValue: (s) => (s.status === "inactive" ? "Inactif" : "Actif") },
  { key: "address", label: "Adresse", getValue: (s) => s.address || "-" },
  {
    key: "phones",
    label: "Téléphone(s)",
    getValue: (s) => s.phones?.filter(Boolean).join(" • ") || "-",
  },
  { key: "fatherName", label: "Nom du père", getValue: (s) => s.fatherName || "-" },
  { key: "fatherProfession", label: "Profession du père", getValue: (s) => s.fatherProfession || "-" },
  { key: "motherName", label: "Nom de la mère", getValue: (s) => s.motherName || "-" },
  { key: "motherProfession", label: "Profession de la mère", getValue: (s) => s.motherProfession || "-" },
  { key: "guardianName", label: "Nom du tuteur", getValue: (s) => s.guardianName || "-" },
  { key: "guardianProfession", label: "Profession du tuteur", getValue: (s) => s.guardianProfession || "-" },
];

export const DEFAULT_EXPORT_COLUMNS: ColumnKey[] = [
  "numero",
  "matricule",
  "fullName",
  "dateOfBirth",
  "gender",
];

const DEFAULT_TABLE_FONT_SIZE = 9;
const DEFAULT_TABLE_CELL_PADDING = 3;
const MIN_TABLE_FONT_SIZE = 5;
const MIN_TABLE_CELL_PADDING = 0.3;
// Écart entre le titre de la classe et le tableau (voir startY: y + 4 ci-dessous).
const CLASS_TITLE_GAP = 4;
const BOTTOM_MARGIN = 14;
const FULL_HEADER_HEIGHT = 42;
const COMPACT_HEADER_HEIGHT = 27;
// Marge de sécurité sur l'estimation de hauteur de ligne (approximation d'une
// seule ligne de texte ; une valeur qui se replierait sur 2 lignes prendrait
// un peu plus de place que prévu).
const ROW_HEIGHT_SAFETY = 1.08;

function estimateRowHeight(fontSize: number, cellPadding: number) {
  return (fontSize * 1.15 * 0.3528 + cellPadding * 2) * ROW_HEIGHT_SAFETY;
}

interface SinglePageLayout {
  compactHeader: boolean;
  fontSize: number;
  cellPadding: number;
}

// Calcule l'entête et le style de tableau nécessaires pour que la liste d'une
// classe tienne toujours sur une seule page, quelle que soit sa longueur :
// si la mise en page normale suffit déjà, rien ne change (on renvoie les
// tailles par défaut) ; sinon on réduit d'abord l'entête, puis, si ça ne
// suffit toujours pas, la taille de police et le remplissage des cellules du
// tableau — avec un plancher pour rester lisible.
function computeSinglePageLayout(pageHeight: number, rowCount: number): SinglePageLayout {
  const rows = rowCount + 1; // + la ligne d'en-tête du tableau
  const fits = (headerHeight: number, fontSize: number, cellPadding: number) => {
    const available = pageHeight - headerHeight - CLASS_TITLE_GAP - BOTTOM_MARGIN;
    return estimateRowHeight(fontSize, cellPadding) * rows <= available;
  };

  if (fits(FULL_HEADER_HEIGHT, DEFAULT_TABLE_FONT_SIZE, DEFAULT_TABLE_CELL_PADDING)) {
    return {
      compactHeader: false,
      fontSize: DEFAULT_TABLE_FONT_SIZE,
      cellPadding: DEFAULT_TABLE_CELL_PADDING,
    };
  }
  if (fits(COMPACT_HEADER_HEIGHT, DEFAULT_TABLE_FONT_SIZE, DEFAULT_TABLE_CELL_PADDING)) {
    return {
      compactHeader: true,
      fontSize: DEFAULT_TABLE_FONT_SIZE,
      cellPadding: DEFAULT_TABLE_CELL_PADDING,
    };
  }

  // Réduit d'abord le remplissage des cellules (police par défaut conservée),
  // puis seulement si ça ne suffit toujours pas — remplissage déjà au
  // plancher — réduit aussi la police. Les deux plafonnent indépendamment,
  // plutôt qu'une même mise à l'échelle appliquée aux deux à la fois : sinon
  // la police atteindrait son plancher avant le remplissage le sien, et la
  // ligne resterait alors plus haute que prévu (risque de déborder sur une
  // 2ᵉ page pour les grandes classes).
  const available = pageHeight - COMPACT_HEADER_HEIGHT - CLASS_TITLE_GAP - BOTTOM_MARGIN;
  const targetRowHeight = available / rows;

  const paddingForDefaultFont =
    (targetRowHeight / ROW_HEIGHT_SAFETY - DEFAULT_TABLE_FONT_SIZE * 1.15 * 0.3528) / 2;
  if (paddingForDefaultFont >= MIN_TABLE_CELL_PADDING) {
    return {
      compactHeader: true,
      fontSize: DEFAULT_TABLE_FONT_SIZE,
      cellPadding: paddingForDefaultFont,
    };
  }

  const fontForMinPadding =
    (targetRowHeight / ROW_HEIGHT_SAFETY - MIN_TABLE_CELL_PADDING * 2) / (1.15 * 0.3528);
  return {
    compactHeader: true,
    fontSize: Math.max(MIN_TABLE_FONT_SIZE, fontForMinPadding),
    cellPadding: MIN_TABLE_CELL_PADDING,
  };
}

function drawClassTable(
  doc: jsPDF,
  className: string,
  students: StudentForExport[],
  startY: number,
  columns: ColumnKey[],
  blankColumns: string[],
  tableStyle: { fontSize: number; cellPadding: number } = {
    fontSize: DEFAULT_TABLE_FONT_SIZE,
    cellPadding: DEFAULT_TABLE_CELL_PADDING,
  },
): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = startY;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(`${className} (${students.length} élève${students.length > 1 ? "s" : ""})`, 14, y);

  const columnDefs = columns
    .map((key) => EXPORT_COLUMNS.find((c) => c.key === key))
    .filter((c): c is (typeof EXPORT_COLUMNS)[number] => Boolean(c));

  autoTable(doc, {
    startY: y + CLASS_TITLE_GAP,
    head: [[...columnDefs.map((c) => c.label), ...blankColumns]],
    body: students.map((s, index) => [
      ...columnDefs.map((c) => c.getValue(s, index)),
      ...blankColumns.map(() => ""),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: false,
      textColor: BLACK,
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: BLACK,
    },
    bodyStyles: {
      fillColor: false,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    styles: { fontSize: tableStyle.fontSize, cellPadding: tableStyle.cellPadding },
    margin: { left: 14, right: 14 },
  });

  return getFinalY(doc) + 12;
}

// Dessine une classe sur la page COURANTE du document, exactement comme
// l'export d'une seule classe : entête (réduit si besoin) + tableau dont la
// police/le remplissage s'adaptent pour tenir sur cette unique page (voir
// computeSinglePageLayout). Partagée par exportStudentsPdf pour que l'export
// "toutes les classes" produise des pages identiques à l'export par classe —
// une page par classe, sans débordement, jamais de classes qui se partagent
// une page.
function drawSingleClassPage(
  doc: jsPDF,
  className: string,
  students: StudentForExport[],
  columns: ColumnKey[],
  blankColumns: string[],
) {
  const layout = computeSinglePageLayout(doc.internal.pageSize.getHeight(), students.length);
  const y = drawPdfHeader(
    doc,
    `Liste des Élèves — ${className}`,
    undefined,
    layout.compactHeader,
    BLACK,
  );
  drawClassTable(doc, className, students, y, columns, blankColumns, {
    fontSize: layout.fontSize,
    cellPadding: layout.cellPadding,
  });
}

export function exportStudentsPdf(
  students: StudentForExport[],
  classes: ClassOption[],
  selectedClassId: string | null,
  columns: ColumnKey[] = DEFAULT_EXPORT_COLUMNS,
  blankColumns: string[] = [],
) {
  const doc = new jsPDF();

  if (selectedClassId) {
    const className = classes.find((c) => c.id === selectedClassId)?.name ?? "Classe";
    drawSingleClassPage(doc, className, students, columns, blankColumns);
    doc.save(`eleves-${slugify(className)}.pdf`);
    return;
  }

  const byClass = new Map<string, StudentForExport[]>();
  for (const student of students) {
    const list = byClass.get(student.classId) ?? [];
    list.push(student);
    byClass.set(student.classId, list);
  }

  const orderedClasses = classes.filter((c) => byClass.has(c.id));
  orderedClasses.forEach((cls, index) => {
    if (index > 0) doc.addPage();
    drawSingleClassPage(doc, cls.name, byClass.get(cls.id) ?? [], columns, blankColumns);
  });

  doc.save("eleves-toutes-les-classes.pdf");
}
