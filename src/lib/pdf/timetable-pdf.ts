import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, ACCENT, slugify } from "./shared";

// Entête compacte dédiée (au lieu de drawPdfHeader, pensée pour un document sur une
// seule page) : le tableau de 13 lignes a besoin de tout l'espace vertical disponible.
function drawCompactHeader(doc: jsPDF, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Au Bel Enfant", 10, 9);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Ambition - Motivation - Réussite", 10, 13.5);

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

// Même grille horaire que l'écran (07h-17h par tranches d'1h), avec les pauses insérées
// aux mêmes endroits que dans la vraie journée de cours. `start`/`end` restent les bornes
// utilisées pour retrouver les cours (elles ne bougent pas après une récréation, sinon un
// cours généré automatiquement à l'heure pile serait invisible) ; `displayStart` ne sert
// qu'à l'affichage de l'heure, décalée de 15 min pour refléter la pause.
type Row =
  | { type: "hour"; start: string; end: string; displayStart?: string }
  | { type: "divider"; label: string };

const ROWS: Row[] = [
  { type: "hour", start: "07:00", end: "08:00" },
  { type: "hour", start: "08:00", end: "09:00" },
  { type: "divider", label: "RÉCRÉATION" },
  { type: "hour", start: "09:00", end: "10:00", displayStart: "09:15" },
  { type: "hour", start: "10:00", end: "11:15" },
  { type: "hour", start: "11:15", end: "12:00" },
  { type: "divider", label: "APRÈS-MIDI" },
  { type: "hour", start: "13:00", end: "14:00" },
  { type: "hour", start: "14:00", end: "15:00" },
  { type: "hour", start: "15:00", end: "16:00" },
  { type: "divider", label: "RÉCRÉATION" },
  { type: "hour", start: "16:00", end: "17:15", displayStart: "16:15" },
  { type: "hour", start: "17:15", end: "18:00" },
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
      `${row.displayStart ?? row.start} – ${row.end}`,
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
