import { jsPDF } from "jspdf";
import { PRIMARY, ACCENT, SCHOOL_ADDRESS, SCHOOL_PHONE, slugify } from "./shared";
import { formatDate } from "./students-pdf";

export interface StudentForCertificate {
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
}

const MARGIN = 20;

export function exportCertificatScolaritePdf(
  student: StudentForCertificate,
  className: string,
  schoolYear: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentW = pageWidth - 2 * MARGIN;
  const centerX = pageWidth / 2;

  // En-tête
  let y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  doc.text("LYCÉE PRIVÉ", centerX, y, { align: "center" });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY);
  doc.text("Au Bel Enfant", centerX, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Ambition - Motivation - Réussite", centerX, y, { align: "center" });

  y += 5;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Adresse : ${SCHOOL_ADDRESS}`, centerX, y, { align: "center" });
  y += 5;
  doc.text(`Tél. : ${SCHOOL_PHONE}`, centerX, y, { align: "center" });

  // Référence : année scolaire
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY);
  doc.text(`Année scolaire : ${schoolYear}`, pageWidth - MARGIN, y, { align: "right" });

  // Titre
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(0, 0, 0);
  doc.text("CERTIFICAT DE SCOLARITÉ", centerX, y, { align: "center" });

  y += 4;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(centerX - 24, y, centerX + 24, y);

  // Paragraphe d'introduction
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  const intro = `Je soussignée, Directrice de l'Établissement Lycée Privé AU BEL ENFANT, certifie que l'élève désigné(e) ci-dessous est régulièrement inscrit(e) dans notre établissement au titre de l'année scolaire ${schoolYear} :`;
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, MARGIN, y, { align: "justify", maxWidth: contentW });
  y += introLines.length * 6 + 8;

  // Bloc identité
  const identityX = MARGIN + 8;
  const identityLines: [string, string][] = [
    ["Nom et Prénom", `${student.lastName} ${student.firstName}`],
    [
      `${student.gender === "F" ? "Née" : "Né"} le`,
      `${formatDate(student.dateOfBirth)} à ${student.placeOfBirth || "-"}`,
    ],
    ["Matricule", student.matricule],
    ["Classe", className],
  ];
  doc.setFontSize(11.5);
  for (const [label, value] of identityLines) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY);
    const labelText = `${label} : `;
    doc.text(labelText, identityX, y);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(value, identityX + labelWidth, y);
    y += 7.5;
  }

  // Paragraphe de clôture
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  const outro =
    "En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.";
  const outroLines = doc.splitTextToSize(outro, contentW);
  doc.text(outroLines, MARGIN, y, { align: "justify", maxWidth: contentW });
  y += outroLines.length * 6 + 26;

  // Lieu et date, à compléter à la main
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Fait à ....................................., le .....................................", MARGIN, y);

  const stampY = y + 8;
  const stampH = 26;

  const signatureX = pageWidth - MARGIN - 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("La Directrice", signatureX + 30, y, { align: "center" });
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(signatureX, stampY + stampH - 4, signatureX + 60, stampY + stampH - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Mme RAKOTOARIZAO Voahangy", signatureX + 30, stampY + stampH + 2, { align: "center" });

  doc.save(`certificat-scolarite-${slugify(`${student.lastName}-${student.firstName}`)}.pdf`);
}
