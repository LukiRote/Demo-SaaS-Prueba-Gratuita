import { overlaps, workingWindows } from "./availability";
import { DEFAULT_TEMPLATES } from "./messages";
import { absMin, addDays, dayNumber, nowWall, parseHM, splitISO, type WallClock } from "./time";
import type {
  Block,
  Booking,
  BookingStatus,
  Business,
  Customer,
  DemoData,
  Message,
  Service,
  Staff,
  TimeRange,
  WeeklyHours,
} from "./types";

export const DATA_VERSION = 5;

/** PRNG determinista: la misma fecha genera la misma demo. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (...pairs: [string, string][]): TimeRange[] => pairs.map(([a, b]) => ({ start: parseHM(a), end: parseHM(b) }));

function week(map: Partial<Record<number, TimeRange[]>>): WeeklyHours {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...map } as WeeklyHours;
}

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeCode(rand: () => number = secureRandom): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

function secureRandom(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296;
  }
  return Math.random();
}

export function seedBusiness(): Business {
  return {
    slug: "navaja",
    name: "Navaja Studio",
    tagline: "Barbería & estética",
    location: "Palermo, Buenos Aires",
    phone: "+54 9 11 0000-0000",
    instagram: "@navaja.studio",
    accent: "#6366F1",
    publicTheme: "dark",
    hours: week({
      2: r(["10:00", "20:00"]),
      3: r(["10:00", "20:00"]),
      4: r(["10:00", "20:00"]),
      5: r(["10:00", "21:00"]),
      6: r(["09:00", "18:00"]),
    }),
    rules: {
      slotStep: 15,
      bufferMin: 5,
      minAdvanceHours: 1,
      maxAdvanceDays: 30,
      cancelWindowHours: 4,
      depositEnabled: true,
      depositPercent: 30,
    },
  };
}

export function seedServices(): Service[] {
  const s = (
    id: string,
    name: string,
    category: Service["category"],
    durationMin: number,
    price: number,
    description: string,
    requiresDeposit = false,
  ): Service => ({ id, name, category, durationMin, price, description, requiresDeposit, active: true });
  return [
    s("svc_corte", "Corte", "Barbería", 30, 18000, "Corte a tijera o máquina, lavado y peinado."),
    s("svc_corte_barba", "Corte + barba", "Barbería", 45, 26000, "Corte completo y perfilado de barba con navaja."),
    s("svc_barba", "Perfilado de barba", "Barbería", 30, 12000, "Diseño, rebaje y terminación con navaja."),
    s("svc_afeitado", "Afeitado clásico", "Barbería", 30, 15000, "Toalla caliente, espuma y navaja libre."),
    s("svc_infantil", "Corte infantil", "Barbería", 30, 14000, "Para menores de 12 años."),
    s("svc_color", "Color y decoloración", "Estética", 90, 48000, "Global, mechas o platinado. Incluye matizador.", true),
    s("svc_facial", "Limpieza facial profunda", "Estética", 60, 32000, "Extracción, exfoliación y máscara hidratante.", true),
    s("svc_cejas", "Perfilado de cejas", "Estética", 15, 9000, "Con pinza o hilo."),
  ];
}

export function seedStaff(): Staff[] {
  return [
    {
      id: "stf_matias",
      name: "Matías Ferreyra",
      role: "Barbero senior",
      color: "#818CF8",
      serviceIds: ["svc_corte", "svc_corte_barba", "svc_barba", "svc_afeitado"],
      hours: week({
        2: r(["10:00", "14:00"], ["15:00", "20:00"]),
        3: r(["10:00", "14:00"], ["15:00", "20:00"]),
        4: r(["10:00", "14:00"], ["15:00", "20:00"]),
        5: r(["10:00", "14:00"], ["15:00", "21:00"]),
        6: r(["09:00", "13:00"], ["14:00", "18:00"]),
      }),
      active: true,
    },
    {
      id: "stf_lucia",
      name: "Lucía Benítez",
      role: "Colorista y estética",
      color: "#C4B5FD",
      serviceIds: ["svc_color", "svc_facial", "svc_cejas", "svc_corte"],
      hours: week({
        2: r(["11:00", "19:00"]),
        4: r(["11:00", "19:00"]),
        5: r(["12:00", "21:00"]),
        6: r(["09:00", "16:00"]),
      }),
      active: true,
    },
    {
      id: "stf_tomas",
      name: "Tomás Aguirre",
      role: "Barbero",
      color: "#5EEAD4",
      serviceIds: ["svc_corte", "svc_corte_barba", "svc_barba", "svc_infantil"],
      hours: week({
        2: r(["10:00", "13:30"], ["14:30", "20:00"]),
        3: r(["10:00", "13:30"], ["14:30", "20:00"]),
        4: r(["10:00", "13:30"], ["14:30", "20:00"]),
        5: r(["10:00", "13:30"], ["14:30", "21:00"]),
        6: r(["09:00", "13:00"]),
      }),
      active: true,
    },
    {
      id: "stf_valentina",
      name: "Valentina Ríos",
      role: "Barbera",
      color: "#FCD34D",
      serviceIds: ["svc_corte", "svc_corte_barba", "svc_barba", "svc_infantil", "svc_cejas"],
      hours: week({
        4: r(["14:00", "20:00"]),
        5: r(["14:00", "21:00"]),
        6: r(["10:00", "18:00"]),
      }),
      active: true,
    },
  ];
}

const FIRST = [
  "Juan", "Martina", "Santiago", "Camila", "Nicolás", "Sofía", "Agustín", "Valentina", "Facundo", "Julieta",
  "Lautaro", "Florencia", "Franco", "Micaela", "Ignacio", "Carolina", "Joaquín", "Rocío", "Bruno", "Paula",
  "Ezequiel", "Agustina", "Gonzalo", "Lucía", "Federico", "Milagros", "Tobías", "Belén", "Ramiro", "Abril",
];
const LAST = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "Gómez", "Sánchez", "Romero", "Díaz",
  "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Medina", "Herrera", "Suárez", "Molina",
];

const HOLIDAYS: [string, string][] = [
  ["01-01", "Año Nuevo"],
  ["03-24", "Día de la Memoria"],
  ["04-02", "Día de Malvinas"],
  ["05-01", "Día del Trabajador"],
  ["05-25", "Revolución de Mayo"],
  ["06-20", "Día de la Bandera"],
  ["07-09", "Día de la Independencia"],
  ["12-08", "Inmaculada Concepción"],
  ["12-25", "Navidad"],
];

function fillRate(daysFromToday: number): number {
  if (daysFromToday < 0) return 0.74;
  if (daysFromToday === 0) return 0.7;
  if (daysFromToday <= 3) return 0.58;
  if (daysFromToday <= 7) return 0.42;
  if (daysFromToday <= 14) return 0.26;
  return 0.12;
}

export function generateDemo(now: WallClock = nowWall()): DemoData {
  const rand = mulberry32(dayNumber(now.date) * 7919);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
  const nowA = absMin(now.date, now.min);

  const business = seedBusiness();
  const services = seedServices();
  const staff = seedStaff();

  const { y } = splitISO(now.date);
  const blocks: Block[] = [];
  for (const year of [y - 1, y, y + 1]) {
    for (const [md, name] of HOLIDAYS) {
      const date = `${year}-${md}`;
      const diff = dayNumber(date) - dayNumber(now.date);
      if (diff >= -21 && diff <= 60)
        blocks.push({ id: `blk_${date}`, staffId: null, from: date, to: date, kind: "feriado", reason: name });
    }
  }
  blocks.push({
    id: "blk_vac_tomas",
    staffId: "stf_tomas",
    from: addDays(now.date, 8),
    to: addDays(now.date, 12),
    kind: "vacaciones",
    reason: "Vacaciones",
  });
  const trainingDay = addDays(now.date, 2);
  blocks.push({
    id: "blk_curso_lucia",
    staffId: "stf_lucia",
    from: trainingDay,
    to: trainingDay,
    startMin: parseHM("15:00"),
    endMin: parseHM("17:00"),
    kind: "otro",
    reason: "Capacitación de color",
  });

  const customers: Customer[] = [];
  const used = new Set<string>();
  while (customers.length < 56) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    const num = String(Math.floor(rand() * 9000) + 1000);
    customers.push({
      id: `cus_${customers.length + 1}`,
      name,
      phone: `+54911${String(Math.floor(rand() * 9000) + 1000)}${num}`,
      email: rand() < 0.45 ? `${name.split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${Math.floor(rand() * 90 + 10)}@example.com` : undefined,
      createdAt: nowA - Math.floor(rand() * 400) * 1440,
      demo: true,
      notes: rand() < 0.12 ? pick(["Prefiere tijera", "Piel sensible", "Siempre llega 5 min antes", "Pide café"]) : undefined,
    });
  }
  // Clientes frecuentes: aparecen mucho más seguido.
  const regulars = customers.slice(0, 14);
  const pickCustomer = () => (rand() < 0.45 ? pick(regulars) : pick(customers));

  const bookings: Booking[] = [];
  const base = { business, services, staff, blocks, bookings };

  for (let offset = -21; offset <= 21; offset++) {
    const date = addDays(now.date, offset);
    const rate = fillRate(offset);
    for (const member of staff) {
      const memberServices = services.filter((s) => member.serviceIds.includes(s.id));
      const barberServices = memberServices.filter((s) => s.category === "Barbería");
      const partial = blocks
        .filter((b) => b.staffId === member.id && b.from === date && b.startMin !== undefined)
        .map((b) => ({ start: b.startMin!, end: b.endMin! }));
      for (const w of workingWindows(base, member, date)) {
        let t = w.start;
        while (t < w.end) {
          const service = barberServices.length && rand() < 0.75 ? pick(barberServices) : pick(memberServices);
          const end = t + service.durationMin;
          if (end > w.end) break;
          if (rand() > rate || overlaps(partial, t, end)) {
            t += 15 * (1 + Math.floor(rand() * 2));
            continue;
          }
          const startAbs = absMin(date, t);
          const isPast = absMin(date, end) <= nowA;
          const roll = rand();
          let status: BookingStatus;
          if (isPast) status = roll < 0.86 ? "completado" : roll < 0.91 ? "no_asistio" : "cancelado";
          else status = roll < 0.92 ? "confirmado" : "cancelado";
          const deposit = service.requiresDeposit
            ? { amount: Math.round((service.price * business.rules.depositPercent) / 100 / 100) * 100, status: "pagada" as const }
            : { amount: 0, status: "no_requerida" as const };
          // Reservas hechas entre unos minutos y 9 días antes; las recientes son más frecuentes.
          const createdAt = Math.min(
            nowA - 10 - Math.floor(rand() ** 2 * 6 * 1440),
            startAbs - 60 - Math.floor(rand() * 9 * 1440),
          );
          bookings.push({
            id: `bkg_${bookings.length + 1}`,
            code: makeCode(rand),
            serviceId: service.id,
            staffId: member.id,
            customerId: pickCustomer().id,
            date,
            start: t,
            end,
            status,
            price: service.price,
            deposit,
            source: rand() < 0.74 ? "online" : "manual",
            createdAt,
            cancelledBy: status === "cancelado" ? (rand() < 0.8 ? "cliente" : "negocio") : undefined,
            seen: true,
          });
          t = Math.ceil((end + business.rules.bufferMin) / 15) * 15;
        }
      }
    }
  }

  const messages: Message[] = [];
  let m = 0;
  const msg = (bookingId: string, kind: Message["kind"], scheduledAt: number, status: Message["status"]) =>
    messages.push({ id: `msg_${++m}`, bookingId, kind, scheduledAt, status });

  const fromDay = dayNumber(addDays(now.date, -2));
  for (const b of bookings) {
    if (dayNumber(b.date) < fromDay) continue;
    const start = absMin(b.date, b.start);
    msg(b.id, "confirmacion", b.createdAt, "enviado");
    for (const [kind, before] of [["recordatorio_24h", 1440], ["recordatorio_2h", 120]] as const) {
      const at = start - before;
      if (at <= b.createdAt) continue;
      if (b.status === "cancelado") msg(b.id, kind, at, "cancelado");
      else msg(b.id, kind, at, at <= nowA ? "enviado" : "programado");
    }
    if (b.status === "cancelado") msg(b.id, "cancelacion", Math.min(nowA, start - 180), "enviado");
  }

  return {
    version: DATA_VERSION,
    seededOn: now.date,
    business,
    services,
    staff,
    blocks,
    customers,
    bookings,
    messages,
    templates: { ...DEFAULT_TEMPLATES },
  };
}
