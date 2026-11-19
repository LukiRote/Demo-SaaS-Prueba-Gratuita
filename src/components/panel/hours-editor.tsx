"use client";

import { Plus, Trash2 } from "lucide-react";
import { IconButton, Switch } from "@/components/ui";
import { cn } from "@/lib/format";
import { DAY_NAMES, fmtMin, parseHM } from "@/lib/time";
import type { DayKey, TimeRange, WeeklyHours } from "@/lib/types";

const ORDER: DayKey[] = [1, 2, 3, 4, 5, 6, 0];

export function hoursErrors(hours: WeeklyHours): Partial<Record<DayKey, string>> {
  const out: Partial<Record<DayKey, string>> = {};
  for (const d of ORDER) {
    const ranges = [...hours[d]].sort((a, b) => a.start - b.start);
    if (ranges.some((r) => r.end <= r.start)) out[d] = "La hora de cierre tiene que ser posterior a la de apertura.";
    else if (ranges.some((r, i) => i > 0 && r.start < ranges[i - 1]!.end)) out[d] = "Los turnos se superponen.";
  }
  return out;
}

export function HoursEditor({
  value,
  onChange,
  limits,
}: {
  value: WeeklyHours;
  onChange: (v: WeeklyHours) => void;
  /** Horario del local, para avisar si el profesional queda fuera. */
  limits?: WeeklyHours;
}) {
  const errors = hoursErrors(value);
  const set = (d: DayKey, ranges: TimeRange[]) => onChange({ ...value, [d]: ranges });

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {ORDER.map((d) => {
        const ranges = value[d];
        const open = ranges.length > 0;
        const businessClosed = limits && limits[d].length === 0;
        return (
          <li key={d} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
            <div className="flex w-40 shrink-0 items-center gap-3 pt-1.5">
              <Switch
                checked={open}
                label={`Abierto los ${DAY_NAMES[d]}`}
                onChange={(on) => set(d, on ? [{ start: parseHM("10:00"), end: parseHM("19:00") }] : [])}
              />
              <span className={cn("text-sm capitalize", open ? "font-medium" : "text-subtle")}>{DAY_NAMES[d]}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {!open && <p className="pt-1.5 text-sm text-subtle">Cerrado</p>}
              {ranges.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <TimeInput
                    label={`Desde, ${DAY_NAMES[d]}`}
                    value={r.start}
                    onChange={(start) => set(d, ranges.map((x, j) => (j === i ? { ...x, start } : x)))}
                  />
                  <span className="text-subtle">a</span>
                  <TimeInput
                    label={`Hasta, ${DAY_NAMES[d]}`}
                    value={r.end}
                    onChange={(end) => set(d, ranges.map((x, j) => (j === i ? { ...x, end } : x)))}
                  />
                  <IconButton label="Quitar franja" onClick={() => set(d, ranges.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </IconButton>
                  {i === ranges.length - 1 && ranges.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = ranges.at(-1)!;
                        const start = Math.min(last.end + 60, 23 * 60);
                        set(d, [...ranges, { start, end: Math.min(start + 180, 23 * 60 + 45) }]);
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] text-muted hover:bg-raised hover:text-fg"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Partir horario
                    </button>
                  )}
                </div>
              ))}
              {errors[d] && <p className="text-[13px] text-bad">{errors[d]}</p>}
              {open && businessClosed && <p className="text-[13px] text-warn">El local cierra ese día: no se ofrecen turnos.</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TimeInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="time"
      step={900}
      aria-label={label}
      value={fmtMin(value)}
      onChange={(e) => e.target.value && onChange(parseHM(e.target.value))}
      className="tabular h-8 w-[104px] rounded-lg border border-line-strong bg-surface px-2 text-sm text-fg outline-none focus:border-accent"
    />
  );
}
