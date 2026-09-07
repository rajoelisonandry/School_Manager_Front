import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, getFinalY, drawPdfHeader, slugify } from "./shared";

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

function drawClassTable(
  doc: jsPDF,
  className: string,
  students: StudentForExport[],
  startY: number,
  columns: ColumnKey[],
  blankColumns: string[],
): number {
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = startY;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`${className} (${students.length} élève${students.length > 1 ? "s" : ""})`, 14, y);
  doc.setTextColor(0, 0, 0);

  const columnDefs = columns
    .map((key) => EXPORT_COLUMNS.find((c) => c.key === key))
    .filter((c): c is (typeof EXPORT_COLUMNS)[number] => Boolean(c));

  autoTable(doc, {
    startY: y + 4,
    head: [[...columnDefs.map((c) => c.label), ...blankColumns]],
    body: students.map((s, index) => [
      ...columnDefs.map((c) => c.getValue(s, index)),
      ...blankColumns.map(() => ""),
    ]),
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
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  return getFinalY(doc) + 12;
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
    const y = drawPdfHeader(doc, `Liste des Élèves — ${className}`);
    drawClassTable(doc, className, students, y, columns, blankColumns);
    doc.save(`eleves-${slugify(className)}.pdf`);
    return;
  }

  let y = drawPdfHeader(doc, "Liste des Élèves — Toutes les classes");

  const byClass = new Map<string, StudentForExport[]>();
  for (const student of students) {
    const list = byClass.get(student.classId) ?? [];
    list.push(student);
    byClass.set(student.classId, list);
  }

  const orderedClasses = classes.filter((c) => byClass.has(c.id));
  for (const cls of orderedClasses) {
    y = drawClassTable(doc, cls.name, byClass.get(cls.id) ?? [], y, columns, blankColumns);
  }

  doc.save("eleves-toutes-les-classes.pdf");
}
