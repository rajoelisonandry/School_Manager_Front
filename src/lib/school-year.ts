export const SCHOOL_MONTHS = [
  { key: "septembre", label: "Septembre", short: "Sept.", monthIndex: 8, yearOffset: 0 },
  { key: "octobre", label: "Octobre", short: "Oct.", monthIndex: 9, yearOffset: 0 },
  { key: "novembre", label: "Novembre", short: "Nov.", monthIndex: 10, yearOffset: 0 },
  { key: "decembre", label: "Décembre", short: "Déc.", monthIndex: 11, yearOffset: 0 },
  { key: "janvier", label: "Janvier", short: "Janv.", monthIndex: 0, yearOffset: 1 },
  { key: "fevrier", label: "Février", short: "Fév.", monthIndex: 1, yearOffset: 1 },
  { key: "mars", label: "Mars", short: "Mars", monthIndex: 2, yearOffset: 1 },
  { key: "avril", label: "Avril", short: "Avr.", monthIndex: 3, yearOffset: 1 },
  { key: "mai", label: "Mai", short: "Mai", monthIndex: 4, yearOffset: 1 },
  { key: "juin", label: "Juin", short: "Juin", monthIndex: 5, yearOffset: 1 },
  { key: "juillet", label: "Juillet", short: "Juil.", monthIndex: 6, yearOffset: 1 },
  { key: "aout", label: "Août", short: "Août", monthIndex: 7, yearOffset: 1 },
] as const;

export function normalizeText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// À partir de juillet, l'année scolaire par défaut bascule déjà sur la suivante
// (ex: le 01/07/2026, l'année par défaut devient "2026-2027") pour anticiper la
// préparation de la rentrée, même si les cours ne reprennent qu'en septembre.
export function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function schoolYearOptions(before = 2, after = 1): string[] {
  const [currentStart] = currentSchoolYear().split("-").map(Number);
  const options: string[] = [];
  for (let offset = -before; offset <= after; offset++) {
    const start = currentStart + offset;
    options.push(`${start}-${start + 1}`);
  }
  return options;
}

export function schoolYearStart(schoolYear: string): number {
  return Number(schoolYear.split("-")[0]);
}

// Déduit l'année civile du paiement à partir de l'année scolaire (ex: "2025-2026")
// et du mois : Septembre à Décembre appartiennent à l'année de début, Janvier à Juin à l'année de fin.
export function yearForMonth(schoolYear: string, monthLabel: string): number {
  const start = schoolYearStart(schoolYear);
  const normalized = normalizeText(monthLabel);
  const match = SCHOOL_MONTHS.find((m) => m.key === normalized);
  return match ? start + match.yearOffset : start;
}
