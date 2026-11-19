"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNow } from "@/components/demo-gate";
import { PageHeader } from "@/components/panel/panel-shell";
import { usePanelUI } from "@/components/panel/ui-state";
import { Avatar, Button, Input, Switch } from "@/components/ui";
import { workingWindows } from "@/lib/availability";
import { cn, firstName, fmtMoney } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { addDays, DAY_NAMES, fmtDateLong, fmtMin, weekday } from "@/lib/time";
import type { Booking } from "@/lib/types";

const PPM = 1.25; // píxeles por minuto
const DAY_START = 9 * 60;
const DAY_END = 21 * 60;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
const y = (min: number) => (min - DAY_START) * PPM;

function AgendaInner() {
  const params = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const data = useDemo((s) => s.data!);
  const { openBooking, openNewBooking } = usePanelUI();
  const initial = params.get("fecha");
  const [date, setDate] = useState(initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) ? initial : now.date);
  const [showCancelled, setShowCancelled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Abrir un turno que llega por link (ej. desde la confirmación pública).
  useEffect(() => {
    const id = params.get("turno");
    if (id && data.bookings.some((b) => b.id === id)) {
      openBooking(id);
      const b = data.bookings.find((x) => x.id === id)!;
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: Math.max(0, y(b.start) - 120), behavior: "smooth" }));
      router.replace(`/panel/agenda?fecha=${b.date}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (date === now.date && scroller.current && !params.get("turno")) {
      scroller.current.scrollTop = Math.max(0, y(now.min) - 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const staff = data.staff.filter((s) => s.active);
  const dayBookings = useMemo(
    () => data.bookings.filter((b) => b.date === date && (showCancelled || b.status !== "cancelado")),
    [data.bookings, date, showCancelled],
  );
  const live = dayBookings.filter((b) => b.status !== "cancelado");
  const closed = data.business.hours[weekday(date)].length === 0;
  const holiday = data.blocks.find((b) => b.staffId === null && date >= b.from && date <= b.to && b.startMin === undefined);

  const onColumnClick = (e: MouseEvent<HTMLDivElement>, staffId: string) => {
    if ((e.target as HTMLElement).closest("[data-booking]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const min = DAY_START + Math.floor((e.clientY - rect.top) / PPM / 15) * 15;
    const member = data.staff.find((s) => s.id === staffId)!;
    const inWindow = workingWindows(data, member, date).some((w) => min >= w.start && min < w.end);
    if (!inWindow) return;
    openNewBooking({ staffId, date, start: min });
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col lg:h-dvh">
      <PageHeader
        title="Agenda"
        sub={
          <span className="tabular">
            {fmtDateLong(date, true)} · {live.length} turnos · {fmtMoney(live.reduce((s, b) => s + b.price, 0))}
          </span>
        }
        actions={
          <>
            <label className="mr-2 flex items-center gap-2 text-[13px] text-muted">
              <Switch checked={showCancelled} onChange={setShowCancelled} label="Mostrar cancelados" />
              Cancelados
            </label>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDate(now.date)} disabled={date === now.date}>
                Hoy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Input
              type="date"
              aria-label="Ir a fecha"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-8 w-[150px] text-[13px]"
            />
          </>
        }
      />

      {(closed || holiday) && (
        <div className="border-b border-line bg-raised/50 px-4 py-2.5 text-[13px] text-muted md:px-8">
          {holiday ? `Feriado: ${holiday.reason}. El local no toma turnos.` : `El local no abre los ${DAY_NAMES[weekday(date)]}.`}
        </div>
      )}

      <div ref={scroller} className="relative flex-1 overflow-auto">
        <div className="flex min-w-full w-max">
          {/* Columna de horas */}
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-line bg-bg">
            <div className="sticky top-0 z-10 h-14 border-b border-line bg-bg" />
            <div className="relative" style={{ height: y(DAY_END) + 8 }}>
              {HOURS.map((h) => (
                <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-subtle" style={{ top: y(h) }}>
                  {fmtMin(h)}
                </span>
              ))}
            </div>
          </div>

          {staff.map((member) => {
            const windows = workingWindows(data, member, date);
            const partial = data.blocks.filter(
              (b) =>
                (b.staffId === member.id || b.staffId === null) &&
                b.from === date &&
                b.to === date &&
                b.startMin !== undefined,
            );
            const fullBlock = data.blocks.find(
              (b) => (b.staffId === member.id || b.staffId === null) && date >= b.from && date <= b.to && b.startMin === undefined,
            );
            const items = dayBookings.filter((b) => b.staffId === member.id).sort((a, b) => a.start - b.start);
            return (
              <div key={member.id} className="w-[180px] shrink-0 grow border-r border-line md:w-[220px]">
                <div className="sticky top-0 z-10 flex h-14 items-center gap-2.5 border-b border-line bg-bg/95 px-3 backdrop-blur">
                  <Avatar name={member.name} color={member.color} size={26} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{member.name}</p>
                    <p className="tabular text-[11.5px] text-subtle">
                      {windows.length ? `${items.filter((b) => b.status !== "cancelado").length} turnos` : fullBlock?.reason ?? "No trabaja"}
                    </p>
                  </div>
                </div>
                <div
                  className="hatch relative cursor-copy bg-surface"
                  style={{ height: y(DAY_END) + 8 }}
                  onClick={(e) => onColumnClick(e, member.id)}
                >
                  {windows.map((w) => (
                    <div
                      key={w.start}
                      className="absolute inset-x-0 bg-bg"
                      style={{ top: y(w.start), height: (w.end - w.start) * PPM }}
                    />
                  ))}
                  {HOURS.map((h) => (
                    <span key={h} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: y(h) }} />
                  ))}
                  {HOURS.slice(0, -1).map((h) => (
                    <span
                      key={`h${h}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/60"
                      style={{ top: y(h + 30) }}
                    />
                  ))}
                  {partial.map((b) => (
                    <div
                      key={b.id}
                      className="hatch absolute inset-x-1.5 rounded-md border border-dashed border-line-strong bg-raised/70 px-2 py-1 text-[11.5px] text-muted"
                      style={{ top: y(b.startMin!), height: (b.endMin! - b.startMin!) * PPM }}
                    >
                      {b.reason}
                    </div>
                  ))}
                  {items.map((b) => (
                    <BookingBlock key={b.id} booking={b} onOpen={() => openBooking(b.id)} />
                  ))}
                  {date === now.date && now.min >= DAY_START && now.min <= DAY_END && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 z-[5] h-px bg-accent"
                      style={{ top: y(now.min) }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Legend />
      </div>
    </div>
  );
}

function BookingBlock({ booking: b, onOpen }: { booking: Booking; onOpen: () => void }) {
  const data = useDemo((s) => s.data!);
  const customer = data.customers.find((c) => c.id === b.customerId);
  const service = data.services.find((s) => s.id === b.serviceId);
  const h = (b.end - b.start) * PPM;
  const tone = {
    confirmado: "bg-[color-mix(in_oklab,var(--accent)_20%,var(--surface))] border-accent/45 hover:border-accent",
    completado: "bg-raised border-line-strong hover:border-muted",
    no_asistio: "bg-warn/10 border-warn/35 hover:border-warn",
    cancelado: "bg-surface border-dashed border-bad/40 opacity-60",
  }[b.status];
  return (
    <button
      type="button"
      data-booking
      onClick={onOpen}
      className={cn(
        "absolute inset-x-1.5 overflow-hidden rounded-md border px-2 py-1 text-left transition-colors",
        tone,
        !b.seen && "ring-2 ring-accent ring-offset-1 ring-offset-bg",
      )}
      style={{ top: y(b.start) + 1, height: h - 2 }}
      aria-label={`${fmtMin(b.start)} ${customer?.name}, ${service?.name}`}
    >
      <p className={cn("truncate text-[12px] font-medium", b.status === "cancelado" && "line-through")}>
        {customer ? firstName(customer.name) + " " + (customer.name.split(" ")[1]?.[0] ?? "") + "." : ""}
        {!b.seen && <span className="ml-1.5 text-[10.5px] font-semibold text-accent">NUEVO</span>}
      </p>
      {h > 34 && (
        <p className="tabular truncate text-[11px] text-muted">
          {fmtMin(b.start)} · {service?.name}
        </p>
      )}
    </button>
  );
}

/** Leyenda compacta al pie de la grilla. */
function Legend() {
  return (
    <div className="sticky bottom-0 left-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-bg/95 px-4 py-2 text-[11.5px] text-subtle backdrop-blur md:px-8">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm border border-accent/50 bg-accent/20" /> Confirmado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm border border-line-strong bg-raised" /> Completado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm border border-warn/40 bg-warn/10" /> No asistió
      </span>
      <span className="flex items-center gap-1.5">
        <span className="hatch size-2.5 rounded-sm border border-line-strong" /> Fuera de horario
      </span>
      <span className="ml-auto hidden sm:inline">Hacé clic en un espacio libre para cargar un turno.</span>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense>
      <AgendaInner />
    </Suspense>
  );
}
