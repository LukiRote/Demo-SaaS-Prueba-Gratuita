import type { DayKey } from "./types";

/**
 * Todo el sistema trabaja en "hora de pared" del negocio: fechas ISO (YYYY-MM-DD)
 * + minutos desde la medianoche. Así un visitante en Madrid ve los mismos
 * horarios que uno en Buenos Aires y no hay bugs de zona horaria.
 */
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface WallClock {
  date: string;
  min: number;
}

export function nowWall(d: Date = new Date()): WallClock {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(d)) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function fromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

export const addDays = (iso: string, n: number) => fromDayNumber(dayNumber(iso) + n);

export const diffDays = (a: string, b: string) => dayNumber(a) - dayNumber(b);

export const weekday = (iso: string) => new Date(dayNumber(iso) * 86_400_000).getUTCDay() as DayKey;

/** Minutos absolutos en hora de pared del negocio: sirve para comparar y ordenar. */
export const absMin = (iso: string, min: number) => dayNumber(iso) * 1440 + min;

export const nowAbs = (w: WallClock = nowWall()) => absMin(w.date, w.min);

export function fromAbs(abs: number): WallClock {
  const day = Math.floor(abs / 1440);
  return { date: fromDayNumber(day), min: abs - day * 1440 };
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseHM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const DAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
export const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function splitISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "jueves 20 de noviembre" */
export function fmtDateLong(iso: string, capitalize = false): string {
  const { m, d } = splitISO(iso);
  const s = `${DAY_NAMES[weekday(iso)]} ${d} de ${MONTH_NAMES[m - 1]}`;
  return capitalize ? cap(s) : s;
}

/** "jue 20 nov" */
export function fmtDateShort(iso: string): string {
  const { m, d } = splitISO(iso);
  return `${DAY_SHORT[weekday(iso)]} ${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
}

/** "hoy", "mañana", "ayer" o la fecha corta. */
export function fmtRelativeDay(iso: string, today: string = nowWall().date): string {
  const diff = diffDays(iso, today);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  return fmtDateShort(iso);
}

/** "hoy", "mañana" o "el miércoles 25 de noviembre" (para frases). */
export function fmtWhen(iso: string, today: string = nowWall().date): string {
  const diff = diffDays(iso, today);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return `el ${fmtDateLong(iso)}`;
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function monthGrid(year: number, month: number): (string | null)[] {
  // month: 1-12. Semana empieza en lunes.
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = (weekday(first) + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(addDays(first, d - 1));
  while (cells.length % 7) cells.push(null);
  return cells;
}
