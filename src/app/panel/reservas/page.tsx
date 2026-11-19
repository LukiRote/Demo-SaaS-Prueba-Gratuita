"use client";

import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useNow } from "@/components/demo-gate";
import { PageHeader } from "@/components/panel/panel-shell";
import { usePanelUI } from "@/components/panel/ui-state";
import { Avatar, Button, Empty, Input, Select, StatusBadge, Tabs, Tag } from "@/components/ui";
import { firstName, fmtMoney, fmtPhone } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { absMin, fmtDateShort, fmtMin, fmtRelativeDay } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";

type Range = "proximas" | "pasadas" | "todas";
const PAGE = 40;

export default function ReservasPage() {
  const data = useDemo((s) => s.data!);
  const openBooking = usePanelUI((s) => s.openBooking);
  const now = useNow();
  const [range, setRange] = useState<Range>("proximas");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [staffId, setStaffId] = useState("");
  const [source, setSource] = useState<"" | "online" | "manual">("");
  const [limit, setLimit] = useState(PAGE);

  const nowA = absMin(now.date, now.min);
  const customers = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const services = useMemo(() => new Map(data.services.map((s) => [s.id, s])), [data.services]);
  const staff = useMemo(() => new Map(data.staff.map((s) => [s.id, s])), [data.staff]);

  const counts = useMemo(() => {
    let up = 0;
    for (const b of data.bookings) if (absMin(b.date, b.end) > nowA) up++;
    return { proximas: up, pasadas: data.bookings.length - up, todas: data.bookings.length };
  }, [data.bookings, nowA]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const digits = q.replace(/\D/g, "");
    return data.bookings
      .filter((b) => {
        const end = absMin(b.date, b.end);
        if (range === "proximas" && end <= nowA) return false;
        if (range === "pasadas" && end > nowA) return false;
        if (status && b.status !== status) return false;
        if (staffId && b.staffId !== staffId) return false;
        if (source && b.source !== source) return false;
        if (needle) {
          const c = customers.get(b.customerId);
          const name = (c?.name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          const hit =
            name.includes(needle) ||
            b.code.toLowerCase().includes(needle) ||
            (digits.length >= 3 && (c?.phone ?? "").includes(digits));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const d = absMin(a.date, a.start) - absMin(b.date, b.start);
        return range === "proximas" ? d : -d;
      });
  }, [data.bookings, range, status, staffId, source, q, customers, nowA]);

  const hasFilters = !!(q || status || staffId || source);

  return (
    <>
      <PageHeader title="Reservas" sub="Todas las reservas online y las cargadas a mano.">
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Tabs
            value={range}
            onChange={(v) => {
              setRange(v);
              setLimit(PAGE);
            }}
            items={[
              { value: "proximas", label: "Próximas", count: counts.proximas },
              { value: "pasadas", label: "Pasadas", count: counts.pasadas },
              { value: "todas", label: "Todas", count: counts.todas },
            ]}
          />
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, teléfono o código"
              aria-label="Buscar reservas"
              className="h-8 pl-9 text-[13px]"
              maxLength={60}
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | "")} aria-label="Estado" className="h-8 w-auto text-[13px]">
            <option value="">Todos los estados</option>
            <option value="confirmado">Confirmado</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
            <option value="no_asistio">No asistió</option>
          </Select>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Profesional" className="h-8 w-auto text-[13px]">
            <option value="">Todo el equipo</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={source} onChange={(e) => setSource(e.target.value as "" | "online" | "manual")} aria-label="Origen" className="h-8 w-auto text-[13px]">
            <option value="">Online y manual</option>
            <option value="online">Online</option>
            <option value="manual">Manual</option>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setStatus("");
                setStaffId("");
                setSource("");
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="px-4 py-4 md:px-8">
        {rows.length === 0 ? (
          <Empty
            icon={<SearchX className="size-6" />}
            title="No hay reservas con esos filtros"
            body="Probá con otro nombre o limpiá los filtros."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-[12px] text-subtle">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Servicio</th>
                  <th className="px-4 py-2.5 font-medium">Profesional</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, limit).map((b) => {
                  const c = customers.get(b.customerId);
                  const st = staff.get(b.staffId);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => openBooking(b.id)}
                      onKeyDown={(e) => e.key === "Enter" && openBooking(b.id)}
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-raised/50 focus-visible:bg-raised/50"
                    >
                      <td className="tabular px-4 py-3 whitespace-nowrap">
                        <span className="font-medium">{fmtMin(b.start)}</span>
                        <span className="ml-2 text-muted">
                          {["hoy", "mañana", "ayer"].includes(fmtRelativeDay(b.date, now.date))
                            ? fmtRelativeDay(b.date, now.date)
                            : fmtDateShort(b.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c?.name}</span>
                          {!b.seen && <Tag tone="accent">Nuevo</Tag>}
                        </div>
                        <span className="tabular text-[12.5px] text-subtle">{c && fmtPhone(c.phone)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {services.get(b.serviceId)?.name}
                        <span className="block text-[12.5px] text-subtle">{b.source === "online" ? "Online" : "Manual"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={st?.name ?? "?"} color={st?.color} size={22} />
                          {firstName(st?.name ?? "")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="tabular px-4 py-3 text-right">
                        {fmtMoney(b.price)}
                        {b.deposit.amount > 0 && (
                          <span className="block text-[12px] text-subtle">
                            seña {b.deposit.status === "devuelta" ? "devuelta" : fmtMoney(b.deposit.amount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > limit && (
          <div className="mt-4 flex items-center justify-center gap-3 text-[13px] text-subtle">
            <span className="tabular">
              Mostrando {limit} de {rows.length}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
              Ver más
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
