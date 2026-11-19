import { absMin, diffDays, nowWall, weekday, type WallClock } from "./time";
import type { Block, Booking, DemoData, Staff, TimeRange } from "./types";

type Data = Pick<DemoData, "business" | "services" | "staff" | "blocks" | "bookings">;

export interface Slot {
  start: number;
  /** Profesionales libres en ese horario, ordenados por menor carga del día. */
  staffIds: string[];
}

export interface SlotQuery {
  date: string;
  serviceId: string;
  /** "any" = cualquiera disponible */
  staffId: string;
  /** Al reprogramar, la propia reserva no cuenta como ocupada. */
  excludeBookingId?: string;
}

const ACTIVE: Booking["status"][] = ["confirmado", "completado", "no_asistio"];

export function intersectRanges(a: TimeRange[], b: TimeRange[]): TimeRange[] {
  const out: TimeRange[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out.sort((p, q) => p.start - q.start);
}

export function overlaps(ranges: TimeRange[], start: number, end: number): boolean {
  return ranges.some((r) => start < r.end && end > r.start);
}

function blocksFor(blocks: Block[], staffId: string, date: string) {
  return blocks.filter(
    (b) => (b.staffId === null || b.staffId === staffId) && date >= b.from && date <= b.to,
  );
}

const isPartial = (b: Block) => b.startMin !== undefined && b.endMin !== undefined && b.from === b.to;

/** Ventanas de trabajo reales de un profesional en una fecha: horario del local ∩ horario propio − bloqueos de día completo. */
export function workingWindows(data: Data, staff: Staff, date: string): TimeRange[] {
  const dow = weekday(date);
  const blocks = blocksFor(data.blocks, staff.id, date);
  if (blocks.some((b) => !isPartial(b))) return [];
  return intersectRanges(data.business.hours[dow] ?? [], staff.hours[dow] ?? []);
}

/** Intervalos ocupados (con buffer) + bloqueos parciales. */
export function busyRanges(data: Data, staffId: string, date: string, excludeBookingId?: string): TimeRange[] {
  const buffer = data.business.rules.bufferMin;
  const busy: TimeRange[] = data.bookings
    .filter(
      (b) =>
        b.staffId === staffId && b.date === date && b.id !== excludeBookingId && ACTIVE.includes(b.status),
    )
    .map((b) => ({ start: b.start - buffer, end: b.end + buffer }));
  for (const b of blocksFor(data.blocks, staffId, date)) {
    if (isPartial(b)) busy.push({ start: b.startMin!, end: b.endMin! });
  }
  return busy.sort((p, q) => p.start - q.start);
}

/** Horarios de inicio candidatos: la grilla del negocio (cada `slotStep`), para que el cliente vea horas redondas. */
function candidateStarts(window: TimeRange, step: number): number[] {
  const out: number[] = [];
  for (let t = Math.ceil(window.start / step) * step; t < window.end; t += step) out.push(t);
  return out;
}

export function bookingWindowOpen(data: Data, date: string, now: WallClock = nowWall()): boolean {
  const ahead = diffDays(date, now.date);
  return ahead >= 0 && ahead <= data.business.rules.maxAdvanceDays;
}

export function getSlots(
  data: Data,
  q: SlotQuery,
  now: WallClock = nowWall(),
  /** El panel puede cargar turnos fuera de la ventana pública (ej. alguien que llegó sin turno). */
  opts: { ignoreAdvance?: boolean } = {},
): Slot[] {
  const service = data.services.find((s) => s.id === q.serviceId);
  if (!service) return [];
  if (!opts.ignoreAdvance && !bookingWindowOpen(data, q.date, now)) return [];

  const { slotStep, minAdvanceHours } = data.business.rules;
  const earliest = opts.ignoreAdvance ? -Infinity : absMin(now.date, now.min) + minAdvanceHours * 60;
  const candidates = data.staff.filter(
    (s) => s.active && s.serviceIds.includes(service.id) && (q.staffId === "any" || s.id === q.staffId),
  );

  const byStart = new Map<number, string[]>();
  for (const staff of candidates) {
    const busy = busyRanges(data, staff.id, q.date, q.excludeBookingId);
    for (const w of workingWindows(data, staff, q.date)) {
      for (const t of candidateStarts(w, slotStep)) {
        const end = t + service.durationMin;
        if (end > w.end) break;
        if (absMin(q.date, t) < earliest) continue;
        if (overlaps(busy, t, end)) continue;
        byStart.set(t, [...(byStart.get(t) ?? []), staff.id]);
      }
    }
  }

  const load = (staffId: string) =>
    data.bookings.filter((b) => b.staffId === staffId && b.date === q.date && b.status !== "cancelado").length;

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, staffIds]) => ({ start, staffIds: staffIds.sort((a, b) => load(a) - load(b)) }));
}

/** Para pintar el calendario: cantidad de horarios libres por día. */
export function availabilityByDay(
  data: Data,
  q: Omit<SlotQuery, "date">,
  dates: string[],
  now: WallClock = nowWall(),
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const date of dates) out[date] = getSlots(data, { ...q, date }, now).length;
  return out;
}

/** Validación final antes de guardar: el horario sigue libre para ese profesional. */
export function isSlotAvailable(
  data: Data,
  q: SlotQuery & { start: number },
  now: WallClock = nowWall(),
): boolean {
  return getSlots(data, q, now).some((s) => s.start === q.start && s.staffIds.includes(q.staffId));
}

/** Versión para el panel: ignora anticipación mínima/máxima (el negocio puede cargar turnos a mano). */
export function isFreeForStaff(
  data: Data,
  staffId: string,
  date: string,
  start: number,
  duration: number,
  excludeBookingId?: string,
): { ok: true } | { ok: false; reason: string } {
  const staff = data.staff.find((s) => s.id === staffId);
  if (!staff) return { ok: false, reason: "Profesional inexistente." };
  const windows = workingWindows(data, staff, date);
  const end = start + duration;
  if (!windows.some((w) => start >= w.start && end <= w.end))
    return { ok: false, reason: `${staff.name.split(" ")[0]} no trabaja en ese horario.` };
  if (overlaps(busyRanges(data, staffId, date, excludeBookingId), start, end))
    return { ok: false, reason: "Se superpone con otro turno o un bloqueo." };
  return { ok: true };
}
