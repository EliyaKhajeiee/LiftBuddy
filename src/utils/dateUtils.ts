// Pad-safe date key: "2025-01-05" not "2025-1-5"
export function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth()).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

// ISO 8601 week number (Mon = first day of week)
export function getISOWeek(d: Date): { week: number; year: number } {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((utc.getTime() - jan1.getTime()) / 86400000) + 1) / 7),
    year: utc.getUTCFullYear(),
  };
}

// Returns the Monday at 00:00:00 of the week containing `date`
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function fmtVolume(lbs: number): string {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k lbs`;
  return `${Math.round(lbs)} lbs`;
}
