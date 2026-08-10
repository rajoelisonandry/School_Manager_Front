// Utilitaires partagés entre l'aperçu à l'écran (page Notes & Bulletins) et l'export
// PDF, pour que le détail par DS reste identique dans les deux.

export interface BulletinGradeDetailLike {
  label: string;
  type: string;
  value: number;
}

// Tri "naturel" des libellés de DS (DS1, DS2, ..., DS10) : compare la partie
// numérique quand les deux libellés en contiennent une, sinon ordre alphabétique.
export function compareGradeLabels(a: string, b: string): number {
  const numA = parseInt(a.replace(/\D+/g, ""), 10);
  const numB = parseInt(b.replace(/\D+/g, ""), 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numA - numB;
  return a.localeCompare(b);
}

// Union des libellés de DS utilisés dans un ensemble de bulletins, triée : sert de
// colonnes communes (DS1, DS2, ...) pour que tous les bulletins restent alignés.
export function collectDsLabels(
  bulletins: { subjects: { grades: BulletinGradeDetailLike[] }[] }[]
): string[] {
  return [
    ...new Set(
      bulletins.flatMap((b) =>
        b.subjects.flatMap((s) => s.grades.filter((g) => g.type === "ds").map((g) => g.label))
      )
    ),
  ].sort(compareGradeLabels);
}

export function formatGrade(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : value.toFixed(2).replace(/\.00$/, "");
}
