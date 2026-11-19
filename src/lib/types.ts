/** 0 = domingo … 6 = sábado */
export type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Minutos desde la medianoche, en hora local del negocio. */
export interface TimeRange {
  start: number;
  end: number;
}

/** Rango vacío = día cerrado. Varios rangos = turnos partidos (ej. corte al mediodía). */
export type WeeklyHours = Record<DayKey, TimeRange[]>;

export interface Rules {
  /** Grilla base de horarios ofrecidos, en minutos. */
  slotStep: number;
  /** Tiempo libre entre turnos del mismo profesional. */
  bufferMin: number;
  /** No se puede reservar con menos de estas horas de anticipación. */
  minAdvanceHours: number;
  /** No se puede reservar a más de estos días. */
  maxAdvanceDays: number;
  /** El cliente puede cancelar o reprogramar hasta estas horas antes. */
  cancelWindowHours: number;
  depositEnabled: boolean;
  /** Porcentaje del precio que se cobra como seña. */
  depositPercent: number;
}

export type PublicTheme = "dark" | "light";

export interface Business {
  slug: string;
  name: string;
  tagline: string;
  location: string;
  phone: string;
  instagram: string;
  accent: string;
  publicTheme: PublicTheme;
  hours: WeeklyHours;
  rules: Rules;
}

export type ServiceCategory = "Barbería" | "Estética";

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  durationMin: number;
  price: number;
  requiresDeposit: boolean;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  color: string;
  serviceIds: string[];
  hours: WeeklyHours;
  active: boolean;
}

export type BlockKind = "feriado" | "vacaciones" | "descanso" | "otro";

export interface Block {
  id: string;
  /** null = todo el local */
  staffId: string | null;
  from: string;
  to: string;
  /** Si hay horas, el bloqueo es parcial y solo aplica cuando from === to. */
  startMin?: number;
  endMin?: number;
  kind: BlockKind;
  reason: string;
}

export interface Customer {
  id: string;
  name: string;
  /** E.164, ej. +5491155550000 */
  phone: string;
  email?: string;
  notes?: string;
  createdAt: number;
  /** Cliente ficticio de la demo: nunca se abre WhatsApp hacia su número. */
  demo: boolean;
}

export type BookingStatus = "confirmado" | "completado" | "cancelado" | "no_asistio";

export type DepositStatus = "no_requerida" | "pagada" | "devuelta";

export interface Booking {
  id: string;
  code: string;
  serviceId: string;
  staffId: string;
  customerId: string;
  date: string;
  start: number;
  end: number;
  status: BookingStatus;
  price: number;
  deposit: { amount: number; status: DepositStatus };
  source: "online" | "manual";
  /** minutos absolutos (ver time.ts) */
  createdAt: number;
  notes?: string;
  cancelledBy?: "cliente" | "negocio";
  /** Reserva hecha por el visitante en esta demo: se destaca en el panel. */
  fromVisitor?: boolean;
  seen?: boolean;
}

export type MessageKind =
  | "confirmacion"
  | "recordatorio_24h"
  | "recordatorio_2h"
  | "reprogramacion"
  | "cancelacion";

export type MessageStatus = "programado" | "enviado" | "cancelado";

export interface Message {
  id: string;
  bookingId: string;
  kind: MessageKind;
  /** minutos absolutos */
  scheduledAt: number;
  status: MessageStatus;
}

export type Templates = Record<MessageKind, string>;

export interface DemoData {
  version: number;
  seededOn: string;
  business: Business;
  services: Service[];
  staff: Staff[];
  blocks: Block[];
  customers: Customer[];
  bookings: Booking[];
  messages: Message[];
  templates: Templates;
}
