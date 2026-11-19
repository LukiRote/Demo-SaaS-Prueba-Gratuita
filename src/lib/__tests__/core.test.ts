import { describe, expect, it } from "vitest";
import { getSlots, intersectRanges, isFreeForStaff } from "../availability";
import { renderTemplate, scheduleFor, waLink } from "../messages";
import { generateDemo, seedBusiness, seedServices, seedStaff } from "../seed";
import { absMin, addDays, fmtMin, monthGrid, parseHM, weekday } from "../time";
import type { Booking, DemoData } from "../types";
import { customerFormSchema, normalizeArPhone } from "../validation";

// Martes 24/11/2026 a las 08:00 (antes de abrir).
const NOW = { date: "2026-11-24", min: parseHM("08:00") };

function emptyData(): Pick<DemoData, "business" | "services" | "staff" | "blocks" | "bookings"> {
  return { business: seedBusiness(), services: seedServices(), staff: seedStaff(), blocks: [], bookings: [] };
}

function booking(p: Partial<Booking>): Booking {
  return {
    id: "b1",
    code: "AAAAAAAA",
    serviceId: "svc_corte",
    staffId: "stf_matias",
    customerId: "c1",
    date: "2026-11-24",
    start: parseHM("10:00"),
    end: parseHM("10:30"),
    status: "confirmado",
    price: 0,
    deposit: { amount: 0, status: "no_requerida" },
    source: "online",
    createdAt: 0,
    ...p,
  };
}

describe("time", () => {
  it("calcula días de la semana y suma fechas", () => {
    expect(weekday("2026-11-24")).toBe(2);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(fmtMin(parseHM("09:05"))).toBe("09:05");
  });
  it("arma la grilla del mes empezando en lunes", () => {
    const grid = monthGrid(2026, 11); // 1/11/2026 es domingo
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(grid.length % 7).toBe(0);
  });
});

describe("disponibilidad", () => {
  it("intersecta rangos", () => {
    expect(intersectRanges([{ start: 0, end: 100 }], [{ start: 50, end: 200 }])).toEqual([{ start: 50, end: 100 }]);
  });

  it("respeta el corte del mediodía del profesional", () => {
    const slots = getSlots(emptyData(), { date: "2026-11-24", serviceId: "svc_corte", staffId: "stf_matias" }, NOW);
    const starts = slots.map((s) => fmtMin(s.start));
    expect(starts[0]).toBe("10:00");
    expect(starts).toContain("13:30");
    expect(starts).not.toContain("13:45");
    expect(starts).toContain("15:00");
    expect(starts.at(-1)).toBe("19:30");
  });

  it("no ofrece días cerrados (lunes)", () => {
    expect(getSlots(emptyData(), { date: "2026-11-23", serviceId: "svc_corte", staffId: "any" }, NOW)).toEqual([]);
  });

  it("aplica el tiempo entre turnos sobre la grilla", () => {
    const data = emptyData();
    data.bookings.push(booking({}));
    const starts = getSlots(data, { date: "2026-11-24", serviceId: "svc_corte", staffId: "stf_matias" }, NOW).map(
      (s) => fmtMin(s.start),
    );
    expect(starts).not.toContain("10:00");
    expect(starts).not.toContain("10:30");
    expect(starts).not.toContain("10:35");
    expect(starts).toContain("10:45");
  });

  it("los turnos cancelados liberan el horario", () => {
    const data = emptyData();
    data.bookings.push(booking({ status: "cancelado" }));
    const starts = getSlots(data, { date: "2026-11-24", serviceId: "svc_corte", staffId: "stf_matias" }, NOW).map(
      (s) => s.start,
    );
    expect(starts).toContain(parseHM("10:00"));
  });

  it("respeta la anticipación mínima", () => {
    const now = { date: "2026-11-24", min: parseHM("12:10") };
    const slots = getSlots(emptyData(), { date: "2026-11-24", serviceId: "svc_corte", staffId: "stf_matias" }, now);
    expect(slots[0]!.start).toBeGreaterThanOrEqual(parseHM("13:10"));
  });

  it("respeta la anticipación máxima", () => {
    const far = addDays(NOW.date, 35);
    expect(getSlots(emptyData(), { date: far, serviceId: "svc_corte", staffId: "any" }, NOW)).toEqual([]);
  });

  it("bloqueos de día completo y parciales", () => {
    const data = emptyData();
    data.blocks.push({ id: "x", staffId: null, from: "2026-11-24", to: "2026-11-24", kind: "feriado", reason: "Test" });
    expect(getSlots(data, { date: "2026-11-24", serviceId: "svc_corte", staffId: "any" }, NOW)).toEqual([]);

    const data2 = emptyData();
    data2.blocks.push({
      id: "y",
      staffId: "stf_matias",
      from: "2026-11-24",
      to: "2026-11-24",
      startMin: parseHM("16:00"),
      endMin: parseHM("17:00"),
      kind: "otro",
      reason: "Test",
    });
    const starts = getSlots(data2, { date: "2026-11-24", serviceId: "svc_corte", staffId: "stf_matias" }, NOW).map(
      (s) => fmtMin(s.start),
    );
    expect(starts).not.toContain("16:00");
    expect(starts).not.toContain("16:30");
    expect(starts).toContain("17:00");
  });

  it("'cualquiera' junta profesionales y solo los que hacen el servicio", () => {
    const slots = getSlots(emptyData(), { date: "2026-11-24", serviceId: "svc_color", staffId: "any" }, NOW);
    expect(slots.every((s) => s.staffIds.every((id) => id === "stf_lucia"))).toBe(true);
  });

  it("valida turnos manuales del panel", () => {
    const data = emptyData();
    data.bookings.push(booking({}));
    expect(isFreeForStaff(data, "stf_matias", "2026-11-24", parseHM("10:15"), 30).ok).toBe(false);
    expect(isFreeForStaff(data, "stf_matias", "2026-11-24", parseHM("14:00"), 30).ok).toBe(false);
    expect(isFreeForStaff(data, "stf_matias", "2026-11-24", parseHM("11:00"), 30).ok).toBe(true);
  });
});

describe("datos demo", () => {
  it("generan reservas sin superposiciones por profesional", () => {
    const demo = generateDemo(NOW);
    expect(demo.bookings.length).toBeGreaterThan(200);
    const active = demo.bookings.filter((b) => b.status !== "cancelado");
    for (const a of active) {
      for (const b of active) {
        if (a.id >= b.id || a.staffId !== b.staffId || a.date !== b.date) continue;
        expect(a.start < b.end && b.start < a.end, `${a.id} vs ${b.id}`).toBe(false);
      }
    }
  });
  it("es determinista por fecha", () => {
    expect(generateDemo(NOW).bookings.map((b) => b.code)).toEqual(generateDemo(NOW).bookings.map((b) => b.code));
  });
});

describe("mensajes", () => {
  it("reemplaza solo variables conocidas", () => {
    expect(renderTemplate("Hola {nombre} {otra}", { nombre: "Ana" })).toBe("Hola Ana {otra}");
    expect(renderTemplate("{constructor}{__proto__}", {})).toBe("{constructor}{__proto__}");
  });
  it("programa recordatorios solo en el futuro", () => {
    const b = booking({ date: "2026-11-25", start: parseHM("10:00") });
    const now = absMin("2026-11-24", parseHM("09:00"));
    expect(scheduleFor(b, now).map((m) => m.kind)).toEqual(["confirmacion", "recordatorio_24h", "recordatorio_2h"]);
    const late = absMin("2026-11-25", parseHM("09:00"));
    expect(scheduleFor(b, late).map((m) => m.kind)).toEqual(["confirmacion"]);
  });
  it("codifica el texto de wa.me", () => {
    expect(waLink("a&b c", "+5491155550000")).toBe("https://wa.me/5491155550000?text=a%26b%20c");
    expect(waLink("hola")).toBe("https://wa.me/?text=hola");
  });
});

describe("validación", () => {
  it.each([
    ["11 5555-0123", "+5491155550123"],
    ["+54 9 11 5555 0123", "+5491155550123"],
    ["011 15 5555-0123", "+5491155550123"],
    ["351 15 555 0123", "+5493515550123"],
  ])("normaliza %s", (input, out) => expect(normalizeArPhone(input)).toBe(out));

  it.each(["1234", "abc", "+1 415 555 0000", "00 0000 0000"])("rechaza %s", (input) =>
    expect(normalizeArPhone(input)).toBeNull(),
  );

  it("limpia y limita el formulario del cliente", () => {
    const ok = customerFormSchema.safeParse({ name: "  Ana   Pérez ", phone: "11 5555 0123", email: "" });
    expect(ok.success && ok.data).toMatchObject({ name: "Ana Pérez", phone: "+5491155550123", email: undefined });
    expect(customerFormSchema.safeParse({ name: "<script>", phone: "11 5555 0123" }).success).toBe(false);
    expect(customerFormSchema.safeParse({ name: "A".repeat(80), phone: "11 5555 0123" }).success).toBe(false);
  });
});
