import { intersectRanges, workingWindows } from "./availability";
import { absMin, addDays, nowWall, type WallClock } from "./time";
import type { Booking, DemoData } from "./types";

export interface CustomerStats {
  visits: number;
  spent: number;
  noShows: number;
  cancellations: number;
  last?: Booking;
  next?: Booking;
  history: Booking[];
}

export function customerStats(data: DemoData, customerId: string, now: WallClock = nowWall()): CustomerStats {
  const nowA = absMin(now.date, now.min);
  const history = data.bookings
    .filter((b) => b.customerId === customerId)
    .sort((a, b) => absMin(b.date, b.start) - absMin(a.date, a.start));
  const done = history.filter((b) => b.status === "completado");
  return {
    visits: done.length,
    spent: done.reduce((s, b) => s + b.price, 0),
    noShows: history.filter((b) => b.status === "no_asistio").length,
    cancellations: history.filter((b) => b.status === "cancelado").length,
    last: done[0],
    next: [...history].reverse().find((b) => b.status === "confirmado" && absMin(b.date, b.start) >= nowA),
    history,
  };
}

/** Minutos de trabajo disponibles vs. reservados en un rango de días. */
export function occupancy(data: DemoData, from: string, days: number): number {
  let available = 0;
  let booked = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    for (const s of data.staff.filter((x) => x.active)) {
      const windows = workingWindows(data, s, date);
      available += windows.reduce((n, w) => n + (w.end - w.start), 0);
      for (const b of data.bookings) {
        if (b.staffId !== s.id || b.date !== date || b.status === "cancelado") continue;
        booked += intersectRanges([{ start: b.start, end: b.end }], windows).reduce((n, r) => n + r.end - r.start, 0);
      }
    }
  }
  return available ? booked / available : 0;
}
