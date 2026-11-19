import type { ChatMessage } from "@/components/whatsapp-preview";
import { MESSAGE_LABEL, messageBody } from "./messages";
import { fmtMin, fmtRelativeDay, fromAbs, nowWall } from "./time";
import type { DemoData, Message } from "./types";

export function fmtAbs(abs: number, today = nowWall().date): string {
  const w = fromAbs(abs);
  return `${fmtRelativeDay(w.date, today)} ${fmtMin(w.min)}`;
}

/** Convierte los mensajes de una reserva en burbujas para la vista previa. */
export function chatFor(data: DemoData, bookingId: string): ChatMessage[] {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return [];
  return data.messages
    .filter((m) => m.bookingId === bookingId)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
    .map((m) => toChat(data, m, booking));
}

export function toChat(data: DemoData, m: Message, booking = data.bookings.find((b) => b.id === m.bookingId)!): ChatMessage {
  const w = fromAbs(m.scheduledAt);
  return {
    id: m.id,
    body: messageBody(data, booking, m.kind),
    time: fmtMin(w.min),
    status: m.status,
    label:
      m.status === "programado"
        ? `${MESSAGE_LABEL[m.kind]} · se envía ${fmtAbs(m.scheduledAt)}`
        : m.status === "cancelado"
          ? `${MESSAGE_LABEL[m.kind]} · cancelado`
          : `${MESSAGE_LABEL[m.kind]} · ${fmtRelativeDay(w.date)}`,
  };
}
