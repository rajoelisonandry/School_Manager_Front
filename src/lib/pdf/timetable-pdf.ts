import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, ACCENT, slugify } from "./shared";
import { SCHOOL_NAME, SCHOOL_TAGLINE } from "@/lib/branding";

// Entête compacte dédiée (au lieu de drawPdfHeader, pensée pour un document sur une
// seule page) : le tableau de 13 lignes a besoin de tout l'espace vertical disponible.
function drawCompactHeader(doc: jsPDF, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(SCHOOL_NAME, 10, 9);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(SCHOOL_TAGLINE, 10, 13.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(subtitle, pageWidth - 10, 9, { align: "right" });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(10, 16, pageWidth - 10, 16);

  doc.setTextColor(0, 0, 0);
  return 19;
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
  const body = ROWS.map((row) => {
    if (row.type === "divider") {
      return [
        {
          content: row.label,
          colSpan: 1 + DAYS.length,
          styles: {
            halign: "center" as const,
            fontStyle: "bold" as const,
            textColor: PRIMARY,
            fillColor: LIGHT_ACCENT,
            cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
          },
        },
      ];
    }
    return [
      `${row.displayStart ?? row.start} – ${row.displayEnd ?? row.end}`,
      ...DAYS.map((day) => {
        const entry = groupEntries.find(
          (e) =>
            e.dayOfWeek === day.key &&
            e.startTime >= row.start &&
            e.startTime < row.end
        );
        return entry ? cellLabel(entry) : "";
      }),
    ];
  });

  autoTable(doc, {
    startY: y + 1,
    head,
    body,
    theme: "plain",
    headStyles: {
      fillColor: false,
      textColor: PRIMARY,
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: PRIMARY,
      halign: "center",
    },
    bodyStyles: {
      fillColor: false,
      lineWidth: 0.15,
      lineColor: [200, 200, 200],
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: "bold", textColor: PRIMARY, fontSize: 8.5 },
    },
    styles: { fontSize: 10, cellPadding: { top: 5, bottom: 5, left: 2, right: 2 } },
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
    drawGroupPage(doc, `Emploi du Temps — ${cls.name}`, classEntries, (entry) =>
      entry.room ? `${entry.subjectName}\n${entry.room}` : entry.subjectName
    );
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
