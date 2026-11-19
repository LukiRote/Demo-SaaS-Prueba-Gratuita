import { firstName } from "./format";
import { absMin, BUSINESS_TZ, fmtDateLong, fmtMin } from "./time";
import type { Booking, DemoData, Message, MessageKind, Templates } from "./types";

export const MESSAGE_LABEL: Record<MessageKind, string> = {
  confirmacion: "Confirmación",
  recordatorio_24h: "Recordatorio 24 h",
  recordatorio_2h: "Recordatorio 2 h",
  reprogramacion: "Reprogramación",
  cancelacion: "Cancelación",
};

export const DEFAULT_TEMPLATES: Templates = {
  confirmacion:
    "¡Hola {nombre}! Tu turno en {negocio} quedó confirmado ✂️\n\n📅 {fecha} a las {hora}\n💈 {servicio} con {profesional}\n📍 {direccion}\n\nSi necesitás reprogramar o cancelar: {link}",
  recordatorio_24h:
    "Hola {nombre}, te recordamos tu turno de mañana a las {hora} en {negocio} con {profesional}. Si no podés venir, avisanos desde acá: {link}",
  recordatorio_2h: "{nombre}, en 2 horas te esperamos en {negocio} ({hora}). ¡Nos vemos!",
  reprogramacion:
    "Listo {nombre}, movimos tu turno a {fecha} a las {hora} con {profesional}. Cualquier cambio: {link}",
  cancelacion:
    "Hola {nombre}, tu turno del {fecha} a las {hora} en {negocio} fue cancelado. Podés sacar uno nuevo cuando quieras: {link_reserva}",
};

export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre del cliente" },
  { key: "negocio", label: "Nombre del negocio" },
  { key: "fecha", label: "Fecha del turno" },
  { key: "hora", label: "Hora del turno" },
  { key: "servicio", label: "Servicio" },
  { key: "profesional", label: "Profesional" },
  { key: "direccion", label: "Dirección" },
  { key: "link", label: "Link para gestionar" },
  { key: "link_reserva", label: "Link para reservar" },
];

type Ctx = Pick<DemoData, "business" | "services" | "staff" | "customers" | "templates">;

export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://turnos.kaelop.com";
}

export const manageUrl = (code: string, origin = siteOrigin()) => `${origin}/reserva/${code}`;
export const bookUrl = (slug: string, origin = siteOrigin()) => `${origin}/r/${slug}`;

/** Reemplaza solo variables conocidas. El resultado se muestra como texto plano: nunca como HTML. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match,
  );
}

export function bookingVars(ctx: Ctx, booking: Booking, origin?: string): Record<string, string> {
  const customer = ctx.customers.find((c) => c.id === booking.customerId);
  const service = ctx.services.find((s) => s.id === booking.serviceId);
  const staff = ctx.staff.find((s) => s.id === booking.staffId);
  return {
    nombre: firstName(customer?.name ?? "¡hola"),
    negocio: ctx.business.name,
    fecha: fmtDateLong(booking.date),
    hora: fmtMin(booking.start),
    servicio: service?.name ?? "tu servicio",
    profesional: staff ? firstName(staff.name) : "nuestro equipo",
    direccion: ctx.business.location,
    link: manageUrl(booking.code, origin),
    link_reserva: bookUrl(ctx.business.slug, origin),
  };
}

export function messageBody(ctx: Ctx, booking: Booking, kind: MessageKind, origin?: string): string {
  return renderTemplate(ctx.templates[kind], bookingVars(ctx, booking, origin));
}

let seq = 0;
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Confirmación inmediata + recordatorios a 24 h y 2 h (solo los que todavía están en el futuro). */
export function scheduleFor(booking: Booking, now: number, first: MessageKind = "confirmacion"): Message[] {
  const start = absMin(booking.date, booking.start);
  const out: Message[] = [
    { id: uid("msg"), bookingId: booking.id, kind: first, scheduledAt: now, status: "enviado" },
  ];
  if (start - 1440 > now)
    out.push({ id: uid("msg"), bookingId: booking.id, kind: "recordatorio_24h", scheduledAt: start - 1440, status: "programado" });
  if (start - 120 > now)
    out.push({ id: uid("msg"), bookingId: booking.id, kind: "recordatorio_2h", scheduledAt: start - 120, status: "programado" });
  return out;
}

/**
 * Link de WhatsApp con el texto prellenado. Para clientes ficticios de la demo
 * no ponemos número: WhatsApp deja elegir el chat y nunca le escribimos a un
 * número que podría ser de una persona real.
 */
export function waLink(text: string, phone?: string): string {
  const digits = phone?.replace(/\D/g, "");
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function icsStamp(date: string, min: number) {
  return `${date.replace(/-/g, "")}T${fmtMin(min).replace(":", "")}00`;
}

export function bookingIcs(ctx: Ctx, booking: Booking, origin?: string): string {
  const service = ctx.services.find((s) => s.id === booking.serviceId);
  const staff = ctx.staff.find((s) => s.id === booking.staffId);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kaelop//Turnos demo//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@turnos.kaelop`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${BUSINESS_TZ}:${icsStamp(booking.date, booking.start)}`,
    `DTEND;TZID=${BUSINESS_TZ}:${icsStamp(booking.date, booking.end)}`,
    `SUMMARY:${icsEscape(`${service?.name ?? "Turno"} · ${ctx.business.name}`)}`,
    `DESCRIPTION:${icsEscape(`Con ${staff?.name ?? "el equipo"}. Gestioná tu turno: ${manageUrl(booking.code, origin)}`)}`,
    `LOCATION:${icsEscape(ctx.business.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
