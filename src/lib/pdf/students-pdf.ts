import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIMARY, getFinalY, drawPdfHeader, slugify } from "./shared";

interface StudentForExport {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  classId: string;
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

function drawClassTable(
  doc: jsPDF,
  className: string,
  students: StudentForExport[],
  startY: number,
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

  autoTable(doc, {
    startY: y + 4,
    head: [["Numéro", "Matricule", "Nom et Prénom", "Date de Naissance", "Genre"]],
    body: students.map((s, index) => [
      index + 1,
      s.matricule,
      `${s.lastName} ${s.firstName}`,
      formatDate(s.dateOfBirth),
      genderLabel(s.gender),
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
) {
  const doc = new jsPDF();

  if (selectedClassId) {
    const className = classes.find((c) => c.id === selectedClassId)?.name ?? "Classe";
    const y = drawPdfHeader(doc, `Liste des Élèves — ${className}`);
    drawClassTable(doc, className, students, y);
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
    y = drawClassTable(doc, cls.name, byClass.get(cls.id) ?? [], y);
  }

  doc.save("eleves-toutes-les-classes.pdf");
}
