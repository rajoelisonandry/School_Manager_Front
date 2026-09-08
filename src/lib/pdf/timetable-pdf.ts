import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ACCENT, slugify } from "./shared";
import { SCHOOL_NAME, SCHOOL_TAGLINE } from "@/lib/branding";

// Cet export est volontairement tout en noir, sans le bleu de marque utilisé
// ailleurs (voir shared.ts) — un document destiné à être affiché/imprimé pour
// être lu de loin, pas un document officiel aux couleurs de l'établissement.
const BLACK: [number, number, number] = [0, 0, 0];

// Entête compacte dédiée (au lieu de drawPdfHeader, pensée pour un document sur une
// seule page) : le tableau de 13 lignes a besoin de tout l'espace vertical disponible.
function drawCompactHeader(doc: jsPDF, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(SCHOOL_NAME, 10, 9);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.text(SCHOOL_TAGLINE, 10, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(subtitle, pageWidth - 10, 9, { align: "right" });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(10, 18, pageWidth - 10, 18);

  doc.setTextColor(0, 0, 0);
  return 21;
}

export interface TimetableClassOption {
  id: string;
  name: string;
}

export interface TimetableTeacherOption {
  id: string;
  name: string;
}

export interface TimetableEntryForPdf {
  classId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  // Abréviation de la matière (ex: "ANG" pour Anglais) : affichée à la place du
  // nom complet dans la vue par classe quand elle est renseignée.
  subjectInitial: string;
  room: string;
}

const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
];

// Même grille horaire que l'écran (07h-18h par tranches d'1h pleine), avec les
// pauses insérées comme simples séparateurs visuels entre deux lignes — elles ne
// décalent jamais les bornes start/end utilisées pour retrouver les cours.
// Important : ces bornes doivent rester alignées sur celles de la grille à l'écran
// (HOUR_ROWS dans emplois-du-temps/page.tsx), sinon un cours ajouté manuellement à
// une heure pleine (ex: 11h-12h, 17h-18h) tombe dans la mauvaise case et disparaît.
//
// `displayStart`/`displayEnd` ne changent que le texte affiché dans la colonne
// "Horaire" (pour retrouver visuellement le dernier bloc de 75 min du matin/de
// l'après-midi, ex: "10:00 – 11:15"), sans jamais toucher aux bornes de recherche.
type Row =
  | { type: "hour"; start: string; end: string; displayStart?: string; displayEnd?: string }
  | { type: "divider"; label: string };

const ROWS: Row[] = [
  { type: "hour", start: "07:00", end: "08:00" },
  { type: "hour", start: "08:00", end: "09:00" },
  { type: "divider", label: "RÉCRÉATION" },
  { type: "hour", start: "09:00", end: "10:00", displayStart: "09:15" },
  { type: "hour", start: "10:00", end: "11:00", displayEnd: "11:15" },
  { type: "hour", start: "11:00", end: "12:00", displayStart: "11:15" },
  { type: "divider", label: "APRÈS-MIDI" },
  { type: "hour", start: "13:00", end: "14:00" },
  { type: "hour", start: "14:00", end: "15:00" },
  { type: "hour", start: "15:00", end: "16:00" },
  { type: "divider", label: "RÉCRÉATION" },
  { type: "hour", start: "16:00", end: "17:00", displayStart: "16:15", displayEnd: "17:15" },
  { type: "hour", start: "17:00", end: "18:00", displayStart: "17:15" },
];

const LIGHT_ACCENT: [number, number, number] = ACCENT.map((c) =>
  Math.round(c + (255 - c) * 0.82)
) as [number, number, number];

const BODY_FONT_SIZE = 14;
const HEADER_ROW_FONT_SIZE = 11;
const HOUR_COLUMN_FONT_SIZE = 11;
const DEFAULT_ROW_PADDING = 4;
const MIN_ROW_PADDING = 0.5;
const DIVIDER_PADDING = 1.5;
// Marge de sécurité sur l'estimation de hauteur de ligne (le facteur d'interligne
// réel de jsPDF peut légèrement différer de l'approximation ci-dessous).
const LINE_HEIGHT_SAFETY = 1.08;

function mmLineHeight(fontSize: number) {
  return fontSize * 1.15 * 0.3528 * LINE_HEIGHT_SAFETY;
}

// Calcule le remplissage (haut/bas) des lignes horaires nécessaire pour que le
// tableau tienne toujours sur une seule page à BODY_FONT_SIZE : si le
// remplissage par défaut suffit déjà, il ne change pas ; sinon on le réduit
// (jusqu'à un plancher) en fonction du nombre de lignes réellement occupées
// (1 ou 2, matière+salle) par chaque ligne horaire.
function computeRowPadding(doc: jsPDF, tableStartY: number, hourRowMaxLines: number[]): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 6;
  const availableHeight = pageHeight - bottomMargin - tableStartY;

  const headerRowHeight = mmLineHeight(HEADER_ROW_FONT_SIZE) + 2 * DEFAULT_ROW_PADDING;
  const dividerCount = ROWS.filter((r) => r.type === "divider").length;
  const dividerRowHeight = mmLineHeight(BODY_FONT_SIZE) + 2 * DIVIDER_PADDING;

  const remainingForHourRows =
    availableHeight - headerRowHeight - dividerCount * dividerRowHeight;
  const sumLines = hourRowMaxLines.reduce((sum, lines) => sum + lines, 0);
  const idealPadding =
    (remainingForHourRows - sumLines * mmLineHeight(BODY_FONT_SIZE)) /
    (hourRowMaxLines.length * 2);

  return Math.min(DEFAULT_ROW_PADDING, Math.max(MIN_ROW_PADDING, idealPadding));
}

// Dessine une page (entête + tableau) pour un groupe donné (une classe ou un professeur) :
// `cellLabel` décide ce qui apparaît dans chaque case occupée (matière+salle pour une vue
// par classe, classe+salle pour une vue par professeur).
function drawGroupPage(
  doc: jsPDF,
  title: string,
  groupEntries: TimetableEntryForPdf[],
  cellLabel: (entry: TimetableEntryForPdf) => string
) {
  const y = drawCompactHeader(doc, title);

  const head = [["Horaire", ...DAYS.map((d) => d.label)]];
  // Nombre de lignes (1 ou 2 : matière seule, ou matière+salle) occupées par
  // chaque ligne horaire — sert à computeRowPadding pour ne réduire le
  // remplissage que si le tableau en a vraiment besoin pour tenir sur la page.
  const hourRowMaxLines: number[] = [];
  const body = ROWS.map((row) => {
    if (row.type === "divider") {
      return [
        {
          content: row.label,
          colSpan: 1 + DAYS.length,
          styles: {
            halign: "center" as const,
            fontStyle: "bold" as const,
            textColor: BLACK,
            fillColor: LIGHT_ACCENT,
            cellPadding: { top: DIVIDER_PADDING, bottom: DIVIDER_PADDING, left: 2, right: 2 },
          },
        },
      ];
    }
    const cells = DAYS.map((day) => {
      const entry = groupEntries.find(
        (e) =>
          e.dayOfWeek === day.key &&
          e.startTime >= row.start &&
          e.startTime < row.end
      );
      return entry ? cellLabel(entry) : "";
    });
    hourRowMaxLines.push(cells.reduce((max, cell) => Math.max(max, cell.split("\n").length), 1));
    return [`${row.displayStart ?? row.start} – ${row.displayEnd ?? row.end}`, ...cells];
  });

  const rowPadding = computeRowPadding(doc, y + 1, hourRowMaxLines);

  autoTable(doc, {
    startY: y + 1,
    head,
    body,
    theme: "plain",
    headStyles: {
      fillColor: false,
      textColor: BLACK,
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: BLACK,
      halign: "center",
    },
    bodyStyles: {
      fillColor: false,
      lineWidth: 0.15,
      lineColor: [200, 200, 200],
      halign: "center",
      valign: "middle",
      // Matières en gras et agrandies pour rester lisibles de loin (affichage
      // mural) — la colonne "Horaire" garde sa propre taille via columnStyles.
      // cellPadding calculé par computeRowPadding : réduit seulement si besoin
      // pour que les 13 lignes tiennent toujours sur une seule page à cette
      // taille de police.
      fontStyle: "bold",
      fontSize: BODY_FONT_SIZE,
      cellPadding: { top: rowPadding, bottom: rowPadding, left: 2, right: 2 },
    },
    columnStyles: {
      // cellWidth élargi (26 -> 30) pour absorber la police agrandie (8.5 -> 11)
      // sans que les horaires ("10:00 – 11:15") ne se replient sur 2 lignes.
      0: { cellWidth: 30, fontStyle: "bold", textColor: BLACK, fontSize: HOUR_COLUMN_FONT_SIZE },
    },
    styles: { fontSize: HEADER_ROW_FONT_SIZE, cellPadding: { top: DEFAULT_ROW_PADDING, bottom: DEFAULT_ROW_PADDING, left: 2, right: 2 } },
    margin: { top: 10, bottom: 6, left: 10, right: 10 },
  });
}

export function exportTimetablePdf(
  classes: TimetableClassOption[],
  entries: TimetableEntryForPdf[]
) {
  const doc = new jsPDF({ orientation: "landscape" });

  classes.forEach((cls, index) => {
    if (index > 0) doc.addPage();
    const classEntries = entries.filter((e) => e.classId === cls.id);
    drawGroupPage(doc, `Emploi du Temps — ${cls.name}`, classEntries, (entry) => {
      const label = entry.subjectInitial || entry.subjectName;
      return entry.room ? `${label}\n${entry.room}` : label;
    });
  });

  doc.save(`emplois-du-temps-${slugify(new Date().toISOString().slice(0, 10))}.pdf`);
}

export function exportTeacherTimetablePdf(
  teachers: TimetableTeacherOption[],
  entries: TimetableEntryForPdf[],
  classes: TimetableClassOption[]
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  teachers.forEach((teacher, index) => {
    if (index > 0) doc.addPage();
    const teacherEntries = entries.filter((e) => e.teacherId === teacher.id);
    drawGroupPage(doc, `Emploi du Temps — ${teacher.name}`, teacherEntries, (entry) => {
      const className = classNameById.get(entry.classId) ?? "-";
      return entry.room ? `${className}\n${entry.room}` : className;
    });
  });

  doc.save(
    `emplois-du-temps-professeurs-${slugify(new Date().toISOString().slice(0, 10))}.pdf`
  );
}
