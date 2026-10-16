// Définitions de colonnes partagées entre l'export PDF (src/lib/pdf/students-pdf.ts)
// et l'export Excel (src/lib/excel/students-excel.ts) de la liste des élèves : une
// seule source de vérité pour les libellés et la façon d'extraire chaque valeur, que
// les deux pages d'export réutilisent pour leurs cases à cocher / sélecteur d'ordre.

export interface StudentForExport {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  gender: string;
  status?: string;
  classId: string;
  // Renseigné par l'appelant (la classe n'est pas dans les champs de base de
  // l'élève) : nécessaire pour la colonne "Classe", surtout utile à l'export
  // Excel "toutes les classes" (une seule feuille à plat, contrairement au PDF
  // qui groupe déjà par classe via des pages séparées).
  className?: string;
  address?: string;
  phones?: string[];
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;
  guardianName?: string;
  guardianProfession?: string;
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
  | "className"
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
    // L'appelant reçoit les élèves déjà triés par date de création croissante
    // (le plus ancien en premier) : ce numéro reflète donc cet ordre-là, pas
    // l'ordre choisi pour les colonnes.
    getValue: (_s, index) => String(index + 1),
  },
  { key: "matricule", label: "Matricule", getValue: (s) => s.matricule || "-" },
  { key: "fullName", label: "Nom et Prénom", getValue: (s) => `${s.lastName} ${s.firstName}` },
  { key: "dateOfBirth", label: "Date de naissance", getValue: (s) => formatDate(s.dateOfBirth) },
  { key: "age", label: "Âge", getValue: (s) => calculateAge(s.dateOfBirth) },
  { key: "placeOfBirth", label: "Lieu de naissance", getValue: (s) => s.placeOfBirth || "-" },
  { key: "gender", label: "Genre", getValue: (s) => genderLabel(s.gender) },
  { key: "status", label: "Statut", getValue: (s) => (s.status === "inactive" ? "Inactif" : "Actif") },
  { key: "className", label: "Classe", getValue: (s) => s.className || "-" },
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
