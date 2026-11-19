"use client";

import { ArrowRight, Clock3, Copy, Globe2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useNow } from "@/components/demo-gate";
import { BarChart } from "@/components/panel/bar-chart";
import { PageHeader } from "@/components/panel/panel-shell";
import { usePanelUI } from "@/components/panel/ui-state";
import { toast } from "@/components/toaster";
import { Avatar, Button, ButtonLink, Empty, Panel, PanelHeader, StatusBadge, Tag } from "@/components/ui";
import { fmtAbs } from "@/lib/chat";
import { cn, firstName, fmtMoney, fmtPercent } from "@/lib/format";
import { bookUrl, MESSAGE_LABEL } from "@/lib/messages";
import { occupancy } from "@/lib/stats";
import { useDemo } from "@/lib/store";
import { absMin, addDays, DAY_SHORT, fmtDateLong, fmtDateShort, fmtMin, splitISO, weekday } from "@/lib/time";

export default function PanelHome() {
  const data = useDemo((s) => s.data!);
  const openBooking = usePanelUI((s) => s.openBooking);
  const now = useNow();
  const nowA = absMin(now.date, now.min);

  const m = useMemo(() => {
    const today = data.bookings
      .filter((b) => b.date === now.date)
      .sort((a, b) => a.start - b.start || a.staffId.localeCompare(b.staffId));
    const live = today.filter((b) => b.status !== "cancelado");
    const done = live.filter((b) => b.status === "completado").length;
    const revenue = live.filter((b) => b.status !== "no_asistio").reduce((s, b) => s + b.price, 0);
    const from30 = addDays(now.date, -30);
    const past30 = data.bookings.filter((b) => b.date >= from30 && b.date < now.date);
    const lost = past30.filter((b) => b.status === "cancelado" || b.status === "no_asistio").length;
    const bars = Array.from({ length: 14 }, (_, i) => {
      const date = addDays(now.date, i - 13);
      return {
        key: date,
        label: date === now.date ? "hoy" : String(splitISO(date).d),
        title: fmtDateShort(date),
        value: data.bookings.filter((b) => b.date === date && b.status !== "cancelado").length,
        current: date === now.date,
      };
    });
    const online = data.bookings
      .filter((b) => b.source === "online")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
    const queue = data.messages
      .filter((x) => x.status === "programado")
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .slice(0, 5);
    return {
      today,
      liveCount: live.length,
      done,
      upcoming: live.filter((b) => b.status === "confirmado").length,
      revenue,
      occ: occupancy(data, now.date, 7),
      lostRate: past30.length ? lost / past30.length : 0,
      lost,
      bars,
      online,
      queue,
      queueTotal: data.messages.filter((x) => x.status === "programado").length,
    };
  }, [data, now.date]);

  const hour = Math.floor(now.min / 60);
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const nowIndex = m.today.findIndex((b) => absMin(b.date, b.end) > nowA);
  const staffById = Object.fromEntries(data.staff.map((s) => [s.id, s]));
  const serviceById = Object.fromEntries(data.services.map((s) => [s.id, s]));
  const customerById = Object.fromEntries(data.customers.map((c) => [c.id, c]));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl(data.business.slug));
      toast("Link copiado", { body: "Pegalo en tu bio de Instagram o en WhatsApp." });
    } catch {
      toast("No se pudo copiar", { tone: "error", body: bookUrl(data.business.slug) });
    }
  };

  return (
    <>
      <PageHeader
        title={`${greeting}, equipo de ${data.business.name.split(" ")[0]}`}
        sub={`${fmtDateLong(now.date, true)} · ${fmtMin(now.min)} en Buenos Aires`}
        actions={
          <>
            <Button variant="secondary" onClick={copyLink}>
              <Copy className="size-4" aria-hidden />
              Copiar link de reservas
            </Button>
            <ButtonLink href="/panel/agenda" variant="secondary">
              Ver agenda
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </>
        }
      />

      <div className="space-y-6 px-4 py-6 md:px-8">
        <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
          <Metric label="Turnos hoy" value={String(m.liveCount)} sub={`${m.done} atendidos · ${m.upcoming} por venir`} />
          <Metric label="Facturación estimada hoy" value={fmtMoney(m.revenue)} sub="Sin cancelados ni ausencias" />
          <Metric label="Ocupación próximos 7 días" value={fmtPercent(m.occ)} sub="De las horas de trabajo del equipo" />
          <Metric
            label="Cancelaciones y ausencias"
            value={fmtPercent(m.lostRate)}
            sub={`${m.lost} turnos en los últimos 30 días`}
          />
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Panel>
              <PanelHeader
                title="Agenda de hoy"
                sub={!data.business.hours[weekday(now.date)].length ? "Hoy el local está cerrado." : undefined}
                action={
                  <Link href="/panel/agenda" className="text-[13px] text-muted hover:text-fg">
                    Por profesional
                  </Link>
                }
              />
              {m.today.length === 0 ? (
                <Empty
                  icon={<Clock3 className="size-6" />}
                  title="No hay turnos hoy"
                  body="Mirá los próximos días en la agenda o compartí tu link de reservas."
                />
              ) : (
                <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
                  {m.today.map((b, i) => {
                    const st = staffById[b.staffId];
                    const past = absMin(b.date, b.end) <= nowA;
                    return (
                      <li key={b.id}>
                        {i === nowIndex && (
                          <div className="flex items-center gap-2 px-4 py-1.5 text-[11.5px] font-medium text-accent" role="separator">
                            <span className="tabular">Ahora · {fmtMin(now.min)}</span>
                            <span className="h-px flex-1 bg-accent/40" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => openBooking(b.id)}
                          className={cn(
                            "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-raised/60",
                            (past || b.status === "cancelado") && "opacity-60",
                          )}
                        >
                          <span className="tabular w-12 shrink-0 text-sm font-medium">{fmtMin(b.start)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 truncate text-sm font-medium">
                              {customerById[b.customerId]?.name}
                              {!b.seen && <Tag tone="accent">Nuevo</Tag>}
                            </p>
                            <p className="truncate text-[13px] text-muted">{serviceById[b.serviceId]?.name}</p>
                          </div>
                          <span className="hidden items-center gap-2 text-[13px] text-muted sm:flex">
                            <Avatar name={st?.name ?? "?"} color={st?.color} size={22} />
                            {firstName(st?.name ?? "")}
                          </span>
                          <span className="w-24 shrink-0 text-right">
                            <StatusBadge status={b.status} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Turnos por día" sub="Últimas dos semanas, sin cancelados" />
              <div className="px-4 pt-5 pb-4">
                <BarChart bars={m.bars} unit="turnos" caption="Turnos por día en las últimas dos semanas" />
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Reservas online recientes"
                action={
                  <Link href="/panel/reservas" className="text-[13px] text-muted hover:text-fg">
                    Ver todas
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {m.online.map((b) => {
                  const c = customerById[b.customerId];
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => openBooking(b.id)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/60"
                      >
                        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", b.seen ? "bg-line-strong" : "bg-accent")} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            <span className="font-medium">{c?.name}</span>
                            <span className="text-muted"> reservó {serviceById[b.serviceId]?.name.toLowerCase()}</span>
                          </p>
                          <p className="tabular mt-0.5 text-[12.5px] text-subtle">
                            Para {DAY_SHORT[weekday(b.date)]} {splitISO(b.date).d} a las {fmtMin(b.start)} · hace{" "}
                            {ago(nowA - b.createdAt)}
                          </p>
                        </div>
                        {b.status === "cancelado" && <StatusBadge status="cancelado" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line px-4 py-3">
                <Link href="/r/navaja" target="_blank" className="flex items-center gap-2 text-[13px] text-muted hover:text-fg">
                  <Globe2 className="size-3.5" aria-hidden />
                  Probá reservar desde la página pública
                </Link>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Próximos WhatsApp"
                sub={`${m.queueTotal} recordatorios programados`}
                action={
                  <Link href="/panel/mensajes" className="text-[13px] text-muted hover:text-fg">
                    Cola
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {m.queue.map((msg) => {
                  const b = data.bookings.find((x) => x.id === msg.bookingId)!;
                  return (
                    <li key={msg.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="tabular w-24 shrink-0 text-[12.5px] text-muted">{fmtAbs(msg.scheduledAt, now.date)}</span>
                      <span className="min-w-0 flex-1 truncate">{firstName(customerById[b.customerId]?.name ?? "")}</span>
                      <span className="text-[12.5px] text-subtle">{MESSAGE_LABEL[msg.kind].replace("Recordatorio ", "")}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface px-4 py-4 md:px-5">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="tabular mt-1.5 text-[22px] font-semibold tracking-[-0.02em] md:text-2xl">{value}</p>
      <p className="mt-0.5 text-[12.5px] text-subtle">{sub}</p>
    </div>
  );
}

function ago(minutes: number): string {
  if (minutes < 1) return "instantes";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  const d = Math.round(minutes / 1440);
  return d === 1 ? "1 día" : `${d} días`;
}
