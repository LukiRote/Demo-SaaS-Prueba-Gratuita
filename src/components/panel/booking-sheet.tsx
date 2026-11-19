"use client";

import { CalendarClock, Check, MessageCircle, UserX, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNow } from "@/components/demo-gate";
import { SlotPicker, type SlotValue } from "@/components/slot-picker";
import { toast } from "@/components/toaster";
import { Avatar, Button, ButtonLink, Modal, Select, StatusBadge, Tag } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { chatFor } from "@/lib/chat";
import { firstName, fmtMoney, fmtPhone } from "@/lib/format";
import { messageBody, waLink } from "@/lib/messages";
import { customerStats } from "@/lib/stats";
import { useDemo } from "@/lib/store";
import { absMin, fmtDateLong, fmtDuration, fmtMin } from "@/lib/time";
import { usePanelUI } from "./ui-state";

export function BookingSheet() {
  const id = usePanelUI((s) => s.bookingId);
  const openBooking = usePanelUI((s) => s.openBooking);
  const data = useDemo((s) => s.data!);
  const { setStatus, cancelBooking, rescheduleBooking, markSeen } = useDemo();
  const now = useNow();
  const [moving, setMoving] = useState(false);
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [staffId, setStaffId] = useState<string>("");

  const booking = id ? data.bookings.find((b) => b.id === id) : undefined;

  useEffect(() => {
    setMoving(false);
    setSlot(null);
    if (booking) setStaffId(booking.staffId);
    if (booking && !booking.seen) markSeen([booking.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const close = () => openBooking(null);
  if (!booking) return <Modal open={false} onClose={close} title="" variant="sheet">{null}</Modal>;

  const service = data.services.find((s) => s.id === booking.serviceId)!;
  const member = data.staff.find((s) => s.id === booking.staffId)!;
  const customer = data.customers.find((c) => c.id === booking.customerId)!;
  const stats = customerStats(data, customer.id, now);
  const started = absMin(booking.date, booking.start) <= absMin(now.date, now.min);
  const active = booking.status === "confirmado";
  const reminder = messageBody(data, booking, "recordatorio_24h");

  const act = (fn: () => void, msg: string) => {
    fn();
    toast(msg);
  };

  return (
    <Modal
      open
      onClose={close}
      variant="sheet"
      title={`${fmtMin(booking.start)} · ${service.name}`}
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={booking.status} />
          <span>{fmtDateLong(booking.date, true)}</span>
        </span>
      }
      footer={
        active && !moving ? (
          <>
            {started ? (
              <>
                <Button variant="secondary" onClick={() => act(() => setStatus(booking.id, "no_asistio"), "Marcado como ausente")}>
                  <UserX className="size-4" aria-hidden />
                  No vino
                </Button>
                <Button onClick={() => act(() => setStatus(booking.id, "completado"), "Turno completado")}>
                  <Check className="size-4" aria-hidden />
                  Completar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    const r = cancelBooking(booking.id, "negocio");
                    toast(r.ok ? "Turno cancelado" : r.error, {
                      tone: r.ok ? "ok" : "error",
                      body: r.ok ? `Le avisamos a ${firstName(customer.name)} por WhatsApp.` : undefined,
                    });
                  }}
                >
                  <XCircle className="size-4" aria-hidden />
                  Cancelar
                </Button>
                <Button variant="secondary" onClick={() => setMoving(true)}>
                  <CalendarClock className="size-4" aria-hidden />
                  Mover
                </Button>
              </>
            )}
          </>
        ) : undefined
      }
    >
      {moving ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Nuevo horario</p>
            <Select
              aria-label="Profesional"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setSlot(null);
              }}
              className="h-8 w-auto text-[13px]"
            >
              {data.staff
                .filter((s) => s.active && s.serviceIds.includes(service.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
          <SlotPicker
            key={staffId}
            stacked
            serviceId={service.id}
            staffId={staffId}
            value={slot}
            onChange={setSlot}
            excludeBookingId={booking.id}
          />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setMoving(false)}>
              Volver
            </Button>
            <Button
              disabled={!slot}
              onClick={() => {
                if (!slot) return;
                const r = rescheduleBooking(booking.id, { ...slot, staffId }, "negocio");
                if (!r.ok) return toast(r.error, { tone: "error" });
                toast("Turno movido", { body: "Se envió la reprogramación por WhatsApp." });
                setMoving(false);
              }}
            >
              Mover a {slot ? `${fmtMin(slot.start)}` : "…"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="flex items-start gap-3">
            <Avatar name={customer.name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{customer.name}</p>
                {booking.fromVisitor && <Tag tone="accent">Tu reserva de prueba</Tag>}
                {stats.visits === 0 && !booking.fromVisitor && <Tag>Primera visita</Tag>}
              </div>
              <p className="tabular text-[13px] text-muted">{fmtPhone(customer.phone)}</p>
              <p className="mt-1 text-[13px] text-subtle">
                {stats.visits} visitas · {fmtMoney(stats.spent)} en total
                {stats.noShows > 0 && ` · ${stats.noShows} ausencias`}
              </p>
            </div>
            <ButtonLink href={waLink(reminder, customer.demo ? undefined : customer.phone)} variant="secondary" size="sm">
              <MessageCircle className="size-3.5" aria-hidden />
              WhatsApp
            </ButtonLink>
          </section>

          <dl className="divide-y divide-line rounded-xl border border-line text-sm">
            {[
              ["Servicio", `${service.name} · ${fmtDuration(service.durationMin)}`],
              ["Profesional", member.name],
              ["Horario", `${fmtMin(booking.start)} a ${fmtMin(booking.end)}`],
              ["Precio", fmtMoney(booking.price)],
              ...(booking.deposit.amount
                ? [["Seña", `${fmtMoney(booking.deposit.amount)} · ${booking.deposit.status}`]]
                : []),
              ["Origen", booking.source === "online" ? "Reserva online" : "Cargado en el panel"],
              ["Código", booking.code],
              ...(booking.cancelledBy ? [["Canceló", booking.cancelledBy === "cliente" ? "El cliente" : "El negocio"]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5">
                <dt className="text-subtle">{k}</dt>
                <dd className="tabular text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {(booking.notes || customer.notes) && (
            <div className="rounded-xl bg-raised px-3.5 py-3 text-sm">
              <p className="text-[12px] text-subtle">Notas</p>
              {booking.notes && <p className="mt-1">{booking.notes}</p>}
              {customer.notes && <p className="mt-1 text-muted">Cliente: {customer.notes}</p>}
            </div>
          )}

          <section>
            <p className="mb-2 text-[13px] font-medium text-subtle">Mensajes de WhatsApp</p>
            {chatFor(data, booking.id).length ? (
              <WhatsAppPreview businessName={data.business.name} messages={chatFor(data, booking.id)} animate={false} compact />
            ) : (
              <p className="text-sm text-subtle">Sin mensajes registrados para este turno.</p>
            )}
            {customer.demo && (
              <p className="mt-2 text-[12px] text-subtle">
                Cliente ficticio: el botón de WhatsApp abre el mensaje sin destinatario para no escribirle a un número real.
              </p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
