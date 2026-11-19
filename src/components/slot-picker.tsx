"use client";

import { ChevronLeft, ChevronRight, Moon, Sun, Sunrise } from "lucide-react";
import { useMemo, useState } from "react";
import { availabilityByDay, getSlots } from "@/lib/availability";
import { cn, firstName } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { addDays, diffDays, fmtDateLong, fmtMin, MONTH_NAMES, monthGrid, splitISO } from "@/lib/time";
import { useNow } from "./demo-gate";

export interface SlotValue {
  date: string;
  start: number;
  staffId: string;
}

const WEEK = ["L", "M", "M", "J", "V", "S", "D"];

const GROUPS = [
  { label: "Mañana", icon: Sunrise, test: (m: number) => m < 13 * 60 },
  { label: "Tarde", icon: Sun, test: (m: number) => m >= 13 * 60 && m < 18 * 60 },
  { label: "Noche", icon: Moon, test: (m: number) => m >= 18 * 60 },
];

export function SlotPicker({
  serviceId,
  staffId,
  value,
  onChange,
  excludeBookingId,
  stacked,
}: {
  serviceId: string;
  staffId: string;
  value: SlotValue | null;
  onChange: (v: SlotValue) => void;
  excludeBookingId?: string;
  /** Calendario arriba y horarios abajo (para paneles angostos). */
  stacked?: boolean;
}) {
  const data = useDemo((s) => s.data!);
  const now = useNow();
  const maxDays = data.business.rules.maxAdvanceDays;
  const lastDay = addDays(now.date, maxDays);

  const counts = useMemo(() => {
    const dates = Array.from({ length: maxDays + 1 }, (_, i) => addDays(now.date, i));
    return availabilityByDay(data, { serviceId, staffId, excludeBookingId }, dates, now);
  }, [data, serviceId, staffId, excludeBookingId, now, maxDays]);

  const firstAvailable = useMemo(
    () => Object.keys(counts).find((d) => counts[d]! > 0) ?? null,
    [counts],
  );

  const [picked, setPicked] = useState<string | null>(value?.date ?? null);
  const selectedDate = picked && counts[picked] ? picked : firstAvailable;

  const initialMonth = splitISO(selectedDate ?? now.date);
  const [month, setMonth] = useState({ y: initialMonth.y, m: initialMonth.m });
  const grid = monthGrid(month.y, month.m);
  const todayParts = splitISO(now.date);
  const lastParts = splitISO(lastDay);
  const canPrev = month.y > todayParts.y || month.m > todayParts.m;
  const canNext = month.y < lastParts.y || month.m < lastParts.m;

  const slots = useMemo(
    () => (selectedDate ? getSlots(data, { date: selectedDate, serviceId, staffId, excludeBookingId }, now) : []),
    [data, selectedDate, serviceId, staffId, excludeBookingId, now],
  );

  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const n = m + delta;
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
    });

  if (!firstAvailable) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="text-sm font-medium">No hay horarios libres en los próximos {maxDays} días.</p>
        <p className="mt-1 text-sm text-subtle">Probá con otro profesional o elegí “Cualquiera disponible”.</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", !stacked && "md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-8")}>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold capitalize" aria-live="polite">
            {MONTH_NAMES[month.m - 1]} <span className="tabular font-normal text-subtle">{month.y}</span>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={!canPrev}
              aria-label="Mes anterior"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={!canNext}
              aria-label="Mes siguiente"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Elegí un día">
          {WEEK.map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-medium text-subtle" aria-hidden>
              {d}
            </span>
          ))}
          {grid.map((iso, i) => {
            if (!iso) return <span key={i} />;
            const count = counts[iso] ?? 0;
            const inWindow = diffDays(iso, now.date) >= 0 && iso <= lastDay;
            const enabled = inWindow && count > 0;
            const selected = iso === selectedDate;
            const isToday = iso === now.date;
            return (
              <button
                key={iso}
                type="button"
                disabled={!enabled}
                onClick={() => setPicked(iso)}
                aria-pressed={selected}
                aria-label={`${fmtDateLong(iso)}${enabled ? `, ${count} horarios` : ", sin horarios"}`}
                className={cn(
                  "tabular relative flex aspect-square items-center justify-center rounded-lg text-sm transition-colors",
                  enabled && !selected && "bg-raised font-medium text-fg hover:bg-raised-hi",
                  !enabled && "text-subtle/60",
                  selected && "bg-accent font-semibold text-accent-fg",
                )}
              >
                {splitISO(iso).d}
                {isToday && (
                  <span
                    className={cn("absolute bottom-1.5 size-1 rounded-full", selected ? "bg-accent-fg" : "bg-accent")}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-3 text-sm font-semibold">
          {selectedDate && fmtDateLong(selectedDate, true)}
          <span className="ml-2 font-normal text-subtle tabular">{slots.length} horarios</span>
        </p>
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const list = slots.filter((s) => g.test(s.start));
            if (!list.length) return null;
            return (
              <div key={g.label}>
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-subtle">
                  <g.icon className="size-3.5" aria-hidden />
                  {g.label}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {list.map((s) => {
                    const chosen =
                      value && value.date === selectedDate && value.start === s.start &&
                      (staffId === "any" || value.staffId === staffId);
                    return (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() => onChange({ date: selectedDate!, start: s.start, staffId: s.staffIds[0]! })}
                        aria-pressed={!!chosen}
                        className={cn(
                          "tabular h-10 rounded-lg border text-sm font-medium transition-[background-color,border-color,color]",
                          chosen
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-line-strong bg-surface text-fg hover:border-accent hover:text-fg",
                        )}
                      >
                        {fmtMin(s.start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {value && staffId === "any" && value.date === selectedDate && (
          <p className="mt-4 text-[13px] text-muted">
            Te atiende{" "}
            <span className="font-medium text-fg">
              {firstName(data.staff.find((s) => s.id === value.staffId)?.name ?? "")}
            </span>
            , que tiene ese horario libre.
          </p>
        )}
      </div>
    </div>
  );
}
