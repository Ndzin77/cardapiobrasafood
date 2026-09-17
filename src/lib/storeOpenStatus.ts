/**
 * Determines if a store is currently open based on its opening hours configuration.
 * Matches the current weekday (pt-BR) against the schedule entries and checks the time range.
 */

const DAY_MAP: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terça: 2,
  "terça-feira": 2,
  terca: 2,
  "terca-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sábado: 6,
  sabado: 6,
};

interface ScheduleEntry {
  day: string;
  hours: string;
  isOpen: boolean;
}

function parseDayIndex(dayStr: string): number | null {
  const key = dayStr.toLowerCase().trim();
  return DAY_MAP[key] ?? null;
}

function isTimeInRange(now: Date, rangeStr: string): boolean {
  // Supports formats like "08:00 - 22:00" or "08:00 às 22:00"
  const parts = rangeStr.split(/\s*[-–às]+\s*/);
  if (parts.length < 2) return false;

  const [startStr, endStr] = parts;
  const [startH, startM] = startStr.trim().split(":").map(Number);
  const [endH, endM] = endStr.trim().split(":").map(Number);

  if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  // Handle overnight ranges (e.g. 18:00 - 02:00)
  if (endMinutes <= startMinutes) {
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

export function isStoreOpenNow(openingHours: ScheduleEntry[]): boolean {
  if (!openingHours || openingHours.length === 0) return true; // no schedule = always open

  // Use BRT (-03:00) to match Brazilian store operations
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayIndex = now.getDay(); // 0=Sun, 1=Mon...

  const todayEntry = openingHours.find((entry) => {
    const idx = parseDayIndex(entry.day);
    return idx === todayIndex;
  });

  if (!todayEntry || !todayEntry.isOpen) return false;

  // hours may contain multiple periods separated by "/"
  const periods = todayEntry.hours.split("/").map((s) => s.trim());
  return periods.some((period) => isTimeInRange(now, period));
}
