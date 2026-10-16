import * as XLSX from "xlsx";
import { slugify } from "../pdf/shared";
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMNS, type StudentForExport, type ColumnKey } from "../export/student-columns";

interface ClassOption {
  id: string;
  name: string;
}

// Largeur de colonne approximative (en "caractères", unité attendue par xlsx)
// à partir du contenu réel, pour ne pas livrer un tableau aux colonnes toutes
// collées les unes aux autres à l'ouverture dans Excel.
function computeColumnWidths(headers: string[], rows: string[][]): { wch: number }[] {
  return headers.map((header, colIndex) => {
    const longest = rows.reduce((max, row) => Math.max(max, row[colIndex]?.length ?? 0), header.length);
    return { wch: Math.min(40, Math.max(10, longest + 2)) };
  });
}

// Feuille "onglet Excel" valide : 31 caractères max, sans les caractères que
// Excel interdit dans un nom de feuille ( : \ / ? * [ ] ).
function sheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Feuille";
}

function buildSheet(
  students: StudentForExport[],
  columns: ColumnKey[],
  blankColumns: string[],
): XLSX.WorkSheet {
  const columnDefs = columns
    .map((key) => EXPORT_COLUMNS.find((c) => c.key === key))
    .filter((c): c is (typeof EXPORT_COLUMNS)[number] => Boolean(c));

  const headers = [...columnDefs.map((c) => c.label), ...blankColumns];
  const rows = students.map((s, index) => [
    ...columnDefs.map((c) => c.getValue(s, index)),
    ...blankColumns.map(() => ""),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = computeColumnWidths(headers, rows);
  return sheet;
}

// Élèves triés par classe (mêmes ID que ceux de l'app) puis regroupés en une
// seule feuille à plat — contrairement au PDF (une page par classe), une seule
// feuille bien filtrable/triable est plus utile pour retravailler les données
// dans Excel. La colonne "Classe" (si sélectionnée) distingue les classes
// quand l'export porte sur "toutes les classes".
export function exportStudentsExcel(
  students: StudentForExport[],
  classes: ClassOption[],
  selectedClassId: string | null,
  columns: ColumnKey[] = DEFAULT_EXPORT_COLUMNS,
  blankColumns: string[] = [],
) {
  const workbook = XLSX.utils.book_new();

  const className = selectedClassId
    ? classes.find((c) => c.id === selectedClassId)?.name ?? "Classe"
    : "Toutes les classes";

  const sheet = buildSheet(students, columns, blankColumns);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName(className));

  const filename = selectedClassId
    ? `eleves-${slugify(className)}.xlsx`
    : "eleves-toutes-les-classes.xlsx";
  XLSX.writeFile(workbook, filename);
}
