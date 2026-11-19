"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { isFreeForStaff, isSlotAvailable } from "./availability";
import { DEFAULT_TEMPLATES, scheduleFor, uid } from "./messages";
import { DATA_VERSION, generateDemo, makeCode } from "./seed";
import { absMin, diffDays, nowAbs, nowWall } from "./time";
import type {
  Block,
  Booking,
  BookingStatus,
  Business,
  DemoData,
  MessageKind,
  Rules,
  Service,
  Staff,
  WeeklyHours,
} from "./types";
import type { CustomerForm } from "./validation";

/** La demo se regenera sola pasado este tiempo, así siempre hay turnos "de esta semana". */
const MAX_AGE_DAYS = 2;
/** Tope de reservas por visitante y por día: evita llenar el almacenamiento del navegador. */
export const VISITOR_DAILY_LIMIT = 25;

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

interface Store {
  data: DemoData | null;
  ready: boolean;
  init: () => void;
  reset: () => void;

  createBooking: (input: {
    serviceId: string;
    staffId: string;
    date: string;
    start: number;
    customer: CustomerForm;
    source: Booking["source"];
  }) => Result<Booking>;
  rescheduleBooking: (
    id: string,
    to: { date: string; start: number; staffId: string },
    by: "cliente" | "negocio",
  ) => Result<Booking>;
  cancelBooking: (id: string, by: "cliente" | "negocio") => Result;
  setStatus: (id: string, status: BookingStatus) => void;
  markSeen: (ids: string[]) => void;
  processQueue: () => number;

  updateBusiness: (patch: Partial<Omit<Business, "rules" | "hours">>) => void;
  updateRules: (patch: Partial<Rules>) => void;
  setBusinessHours: (hours: WeeklyHours) => void;
  upsertService: (svc: Omit<Service, "id" | "active"> & { id?: string }) => void;
  toggleService: (id: string) => void;
  updateStaff: (id: string, patch: Partial<Omit<Staff, "id">>) => void;
  addBlock: (block: Omit<Block, "id">) => void;
  removeBlock: (id: string) => void;
  updateTemplate: (kind: MessageKind, text: string) => void;
  resetTemplates: () => void;
  updateCustomerNotes: (id: string, notes: string) => void;
}

const memory = new Map<string, string>();
/** localStorage puede no existir o lanzar (modo privado, cookies bloqueadas): caemos a memoria. */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

function isUsable(data: unknown): data is DemoData {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<DemoData>;
  return (
    d.version === DATA_VERSION &&
    typeof d.seededOn === "string" &&
    Array.isArray(d.bookings) &&
    Array.isArray(d.services) &&
    Array.isArray(d.staff) &&
    !!d.business &&
    diffDays(nowWall().date, d.seededOn) <= MAX_AGE_DAYS
  );
}

export const useDemo = create<Store>()(
  persist(
    (set, get) => {
      /** Aplica un cambio inmutable sobre los datos. */
      const patch = (fn: (d: DemoData) => DemoData) => {
        const d = get().data;
        if (d) set({ data: fn(d) });
      };

      return {
        data: null,
        ready: false,

        init: () => {
          const current = get().data;
          set({ data: isUsable(current) ? current : generateDemo(), ready: true });
          get().processQueue();
        },

        reset: () => set({ data: generateDemo(), ready: true }),

        createBooking: ({ serviceId, staffId, date, start, customer, source }) => {
          const d = get().data;
          if (!d) return { ok: false, error: "La demo todavía está cargando." };
          const service = d.services.find((s) => s.id === serviceId && s.active);
          if (!service) return { ok: false, error: "Ese servicio ya no está disponible." };

          const now = nowWall();
          const nowA = absMin(now.date, now.min);
          if (source === "online") {
            const today = d.bookings.filter((b) => b.fromVisitor && b.createdAt >= nowA - 1440).length;
            if (today >= VISITOR_DAILY_LIMIT)
              return { ok: false, error: "Llegaste al límite de reservas de prueba por hoy. Podés reiniciar la demo." };
            if (!isSlotAvailable(d, { date, serviceId, staffId, start }, now))
              return { ok: false, error: "Ese horario se acaba de ocupar. Elegí otro." };
          } else {
            const check = isFreeForStaff(d, staffId, date, start, service.durationMin);
            if (!check.ok) return { ok: false, error: check.reason };
          }

          let customers = d.customers;
          let found = customers.find((c) => c.phone === customer.phone);
          if (!found) {
            found = {
              id: uid("cus"),
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              notes: customer.notes,
              createdAt: nowA,
              demo: false,
            };
            customers = [...customers, found];
          }

          const depositAmount =
            d.business.rules.depositEnabled && service.requiresDeposit
              ? Math.round((service.price * d.business.rules.depositPercent) / 100 / 100) * 100
              : 0;

          const booking: Booking = {
            id: uid("bkg"),
            code: makeCode(),
            serviceId,
            staffId,
            customerId: found.id,
            date,
            start,
            end: start + service.durationMin,
            status: "confirmado",
            price: service.price,
            deposit: depositAmount
              ? { amount: depositAmount, status: "pagada" }
              : { amount: 0, status: "no_requerida" },
            source,
            createdAt: nowA,
            notes: customer.notes,
            fromVisitor: source === "online",
            seen: source !== "online",
          };

          set({
            data: {
              ...d,
              customers,
              bookings: [...d.bookings, booking],
              messages: [...d.messages, ...scheduleFor(booking, nowA)],
            },
          });
          return { ok: true, value: booking };
        },

        rescheduleBooking: (id, to, by) => {
          const d = get().data;
          const booking = d?.bookings.find((b) => b.id === id);
          if (!d || !booking) return { ok: false, error: "No encontramos esa reserva." };
          if (booking.status !== "confirmado") return { ok: false, error: "Solo se pueden mover turnos confirmados." };
          const now = nowWall();
          const nowA = absMin(now.date, now.min);
          const duration = booking.end - booking.start;
          if (by === "cliente") {
            const hoursLeft = (absMin(booking.date, booking.start) - nowA) / 60;
            if (hoursLeft < d.business.rules.cancelWindowHours)
              return { ok: false, error: `Los cambios se hacen hasta ${d.business.rules.cancelWindowHours} h antes.` };
            if (
              !isSlotAvailable(
                d,
                { date: to.date, serviceId: booking.serviceId, staffId: to.staffId, start: to.start, excludeBookingId: id },
                now,
              )
            )
              return { ok: false, error: "Ese horario ya no está libre." };
          } else {
            const check = isFreeForStaff(d, to.staffId, to.date, to.start, duration, id);
            if (!check.ok) return { ok: false, error: check.reason };
          }
          const updated: Booking = { ...booking, ...to, end: to.start + duration, seen: by === "negocio" };
          set({
            data: {
              ...d,
              bookings: d.bookings.map((b) => (b.id === id ? updated : b)),
              messages: [
                ...d.messages.map((m) =>
                  m.bookingId === id && m.status === "programado" ? { ...m, status: "cancelado" as const } : m,
                ),
                ...scheduleFor(updated, nowA, "reprogramacion"),
              ],
            },
          });
          return { ok: true, value: updated };
        },

        cancelBooking: (id, by) => {
          const d = get().data;
          const booking = d?.bookings.find((b) => b.id === id);
          if (!d || !booking) return { ok: false, error: "No encontramos esa reserva." };
          if (booking.status !== "confirmado") return { ok: false, error: "Esta reserva ya no está activa." };
          const nowA = nowAbs();
          const hoursLeft = (absMin(booking.date, booking.start) - nowA) / 60;
          if (by === "cliente" && hoursLeft < d.business.rules.cancelWindowHours)
            return {
              ok: false,
              error: `Falta poco para tu turno: las cancelaciones se hacen hasta ${d.business.rules.cancelWindowHours} h antes. Escribile al local.`,
            };
          const refund = booking.deposit.status === "pagada";
          set({
            data: {
              ...d,
              bookings: d.bookings.map((b) =>
                b.id === id
                  ? {
                      ...b,
                      status: "cancelado",
                      cancelledBy: by,
                      seen: by === "negocio",
                      deposit: refund ? { ...b.deposit, status: "devuelta" } : b.deposit,
                    }
                  : b,
              ),
              messages: [
                ...d.messages.map((m) =>
                  m.bookingId === id && m.status === "programado" ? { ...m, status: "cancelado" as const } : m,
                ),
                { id: uid("msg"), bookingId: id, kind: "cancelacion", scheduledAt: nowA, status: "enviado" },
              ],
            },
          });
          return { ok: true, value: undefined };
        },

        setStatus: (id, status) =>
          patch((d) => ({
            ...d,
            bookings: d.bookings.map((b) => (b.id === id ? { ...b, status, seen: true } : b)),
            messages:
              status === "confirmado"
                ? d.messages
                : d.messages.map((m) =>
                    m.bookingId === id && m.status === "programado" ? { ...m, status: "cancelado" as const } : m,
                  ),
          })),

        markSeen: (ids) => {
          if (!ids.length) return;
          const set_ = new Set(ids);
          patch((d) => ({ ...d, bookings: d.bookings.map((b) => (set_.has(b.id) ? { ...b, seen: true } : b)) }));
        },

        /** El "cron" de la demo: marca como enviados los recordatorios que ya vencieron. */
        processQueue: () => {
          const d = get().data;
          if (!d) return 0;
          const nowA = nowAbs();
          let sent = 0;
          const messages = d.messages.map((m) => {
            if (m.status === "programado" && m.scheduledAt <= nowA) {
              sent++;
              return { ...m, status: "enviado" as const };
            }
            return m;
          });
          if (sent) set({ data: { ...d, messages } });
          return sent;
        },

        updateBusiness: (p) => patch((d) => ({ ...d, business: { ...d.business, ...p } })),
        updateRules: (p) => patch((d) => ({ ...d, business: { ...d.business, rules: { ...d.business.rules, ...p } } })),
        setBusinessHours: (hours) => patch((d) => ({ ...d, business: { ...d.business, hours } })),

        upsertService: (svc) =>
          patch((d) => {
            if (svc.id && d.services.some((s) => s.id === svc.id)) {
              return { ...d, services: d.services.map((s) => (s.id === svc.id ? { ...s, ...svc, id: s.id } : s)) };
            }
            const created: Service = { ...svc, id: uid("svc"), active: true };
            // Por defecto lo pueden hacer los profesionales de esa categoría.
            const staff = d.staff.map((st) =>
              d.services.some((s) => st.serviceIds.includes(s.id) && s.category === svc.category)
                ? { ...st, serviceIds: [...st.serviceIds, created.id] }
                : st,
            );
            return { ...d, services: [...d.services, created], staff };
          }),

        toggleService: (id) =>
          patch((d) => ({ ...d, services: d.services.map((s) => (s.id === id ? { ...s, active: !s.active } : s)) })),

        updateStaff: (id, p) =>
          patch((d) => ({ ...d, staff: d.staff.map((s) => (s.id === id ? { ...s, ...p } : s)) })),

        addBlock: (block) => patch((d) => ({ ...d, blocks: [...d.blocks, { ...block, id: uid("blk") }] })),
        removeBlock: (id) => patch((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) })),

        updateTemplate: (kind, text) =>
          patch((d) => ({ ...d, templates: { ...d.templates, [kind]: text } })),
        resetTemplates: () => patch((d) => ({ ...d, templates: { ...DEFAULT_TEMPLATES } })),

        updateCustomerNotes: (id, notes) =>
          patch((d) => ({ ...d, customers: d.customers.map((c) => (c.id === id ? { ...c, notes } : c)) })),
      };
    },
    {
      name: "kaelop-turnos-demo",
      version: DATA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ data: s.data }),
      skipHydration: true,
      // Si cambia el formato, descartamos y se vuelve a sembrar.
      migrate: () => ({ data: null }),
    },
  ),
);

/** Selector que asume datos listos (solo usar debajo de <DemoGate>). */
export function useData<T>(selector: (d: DemoData) => T): T {
  return useDemo((s) => selector(s.data!));
}
