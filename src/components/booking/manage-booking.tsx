"use client";

import { ArrowLeft, CalendarClock, CalendarPlus, CircleAlert, SearchX, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NavajaMark } from "@/components/brand";
import { useNow } from "@/components/demo-gate";
import { SlotPicker, type SlotValue } from "@/components/slot-picker";
import { toast } from "@/components/toaster";
import { Button, ButtonLink, Modal, StatusBadge } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { chatFor } from "@/lib/chat";
import { firstName, fmtMoney } from "@/lib/format";
import { bookingIcs, downloadIcs } from "@/lib/messages";
import { useDemo } from "@/lib/store";
import { absMin, fmtDateLong, fmtMin } from "@/lib/time";

export const CODE_PATTERN = /^[A-Z2-9]{8}$/;

export function ManageBooking({ code }: { code: string }) {
  const data = useDemo((s) => s.data!);
  const reschedule = useDemo((s) => s.rescheduleBooking);
  const cancel = useDemo((s) => s.cancelBooking);
  const now = useNow();
  const [mode, setMode] = useState<"view" | "reprogramar">("view");
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [animateChat, setAnimateChat] = useState(false);

  const booking = CODE_PATTERN.test(code) ? data.bookings.find((b) => b.code === code) : undefined;

  if (!booking) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <SearchX className="size-8 text-subtle" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em]">No encontramos esa reserva</h1>
        <p className="mt-2 text-sm text-muted">
          Revisá el link del mensaje. En esta demo las reservas viven en el navegador donde se hicieron.
        </p>
        <ButtonLink href={`/r/${data.business.slug}`} className="mt-6">
          Sacar un turno nuevo
        </ButtonLink>
      </div>
    );
  }

  const service = data.services.find((s) => s.id === booking.serviceId)!;
  const member = data.staff.find((s) => s.id === booking.staffId)!;
  const customer = data.customers.find((c) => c.id === booking.customerId)!;
  const hoursLeft = (absMin(booking.date, booking.start) - absMin(now.date, now.min)) / 60;
  const windowH = data.business.rules.cancelWindowHours;
  const active = booking.status === "confirmado";
  const canChange = active && hoursLeft >= windowH;

  const doReschedule = () => {
    if (!slot) return;
    const res = reschedule(booking.id, slot, "cliente");
    if (!res.ok) return toast(res.error, { tone: "error" });
    toast("Turno reprogramado", { body: "Te mandamos la confirmación nueva por WhatsApp." });
    setAnimateChat(true);
    setMode("view");
    setSlot(null);
  };

  const doCancel = () => {
    const res = cancel(booking.id, "cliente");
    setConfirmCancel(false);
    if (!res.ok) return toast(res.error, { tone: "error" });
    toast("Turno cancelado", {
      body: booking.deposit.status === "pagada" ? "La seña se devuelve al mismo medio de pago." : undefined,
    });
    setAnimateChat(true);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <NavajaMark className="size-10" />
          <div>
            <p className="font-medium">{data.business.name}</p>
            <p className="text-[13px] text-subtle">{data.business.location}</p>
          </div>
        </div>

        {mode === "view" ? (
          <div className="animate-step">
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">
                Tu turno, {firstName(customer.name)}
              </h1>
              <StatusBadge status={booking.status} />
            </div>

            <dl className="mt-6 max-w-xl divide-y divide-line rounded-xl border border-line bg-surface text-sm">
              {[
                ["Servicio", `${service.name} · ${fmtMoney(booking.price)}`],
                ["Profesional", member.name],
                ["Fecha", fmtDateLong(booking.date, true)],
                ["Horario", `${fmtMin(booking.start)} a ${fmtMin(booking.end)}`],
                ...(booking.deposit.amount
                  ? [["Seña", `${fmtMoney(booking.deposit.amount)} · ${booking.deposit.status === "devuelta" ? "devuelta" : "pagada"}`]]
                  : []),
                ["Código", booking.code],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="tabular text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {active && (
              <>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={() => setMode("reprogramar")} disabled={!canChange}>
                    <CalendarClock className="size-4" aria-hidden />
                    Reprogramar
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmCancel(true)} disabled={!canChange}>
                    <XCircle className="size-4" aria-hidden />
                    Cancelar turno
                  </Button>
                  <Button variant="ghost" onClick={() => downloadIcs(`turno-${booking.code}.ics`, bookingIcs(data, booking))}>
                    <CalendarPlus className="size-4" aria-hidden />
                    Agregar al calendario
                  </Button>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[13px] text-subtle">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {canChange
                    ? `Podés hacer cambios hasta ${windowH} h antes del turno.`
                    : `Faltan menos de ${windowH} h: para cambios escribile directo al local.`}
                </p>
              </>
            )}
            {booking.status === "cancelado" && (
              <ButtonLink href={`/r/${data.business.slug}`} className="mt-6">
                Sacar un turno nuevo
              </ButtonLink>
            )}
          </div>
        ) : (
          <div className="animate-step">
            <div className="mt-8 mb-6 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMode("view")}
                aria-label="Volver"
                className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-muted hover:bg-raised hover:text-fg"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h1 className="font-display text-[26px] font-semibold tracking-[-0.02em]">Elegí el nuevo horario</h1>
                <p className="mt-1 text-sm text-muted">
                  {service.name} con {firstName(member.name)}. Hoy: {fmtDateLong(booking.date)} a las {fmtMin(booking.start)}.
                </p>
              </div>
            </div>
            <SlotPicker
              serviceId={booking.serviceId}
              staffId={booking.staffId}
              value={slot}
              onChange={setSlot}
              excludeBookingId={booking.id}
            />
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              {slot && (
                <p className="tabular text-sm text-muted">
                  Nuevo: <span className="font-medium text-fg">{fmtDateLong(slot.date)} · {fmtMin(slot.start)}</span>
                </p>
              )}
              <Button onClick={doReschedule} disabled={!slot}>
                Confirmar cambio
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:pt-16">
        <p className="mb-3 text-[13px] font-medium text-subtle">Tu chat con {data.business.name}</p>
        <WhatsAppPreview
          key={data.messages.length}
          businessName={data.business.name}
          messages={chatFor(data, booking.id)}
          animate={animateChat}
          compact
        />
        <p className="mt-3 text-[12.5px] text-subtle">
          Simulación: los mensajes programados se “envían” solos cuando llega su horario.
        </p>
        <Link href="/panel/mensajes" className="mt-1 inline-block text-[12.5px] text-muted underline-offset-2 hover:text-fg hover:underline">
          Ver la cola de mensajes en el panel
        </Link>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="¿Cancelar el turno?"
        description={`${service.name}, ${fmtDateLong(booking.date)} a las ${fmtMin(booking.start)}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Mantener turno
            </Button>
            <Button variant="danger" onClick={doCancel}>
              Sí, cancelar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          El horario se libera para otra persona.
          {booking.deposit.status === "pagada" && " La seña se devuelve al mismo medio de pago."}
        </p>
      </Modal>
    </div>
  );
}
