/** Calm, human date labels: relative when near, full when far. */

export function dayDiff(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const day = new Date(`${iso}T12:00:00`);
  const now = new Date();
  if (Number.isNaN(day.getTime())) return null;
  const a = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

export function relativeDay(iso: string): string | null {
  const diff = dayDiff(iso);
  if (diff === null) return null;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" });
  }
  return null;
}

export function fullDate(iso: string, withYear = true): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, withYear
    ? { weekday: "short", month: "long", day: "numeric", year: "numeric" }
    : { weekday: "long", month: "long", day: "numeric" });
}
