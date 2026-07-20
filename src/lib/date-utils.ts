export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Semaine calée sur lundi
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
