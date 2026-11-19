"use client";

import { useState } from "react";
import { cn } from "@/lib/format";

export interface Bar {
  key: string;
  label: string;
  /** Texto largo para el tooltip y la tabla accesible */
  title: string;
  value: number;
  current?: boolean;
}

/** Barras de una sola serie: un color, techo redondeado de 4px, grilla recesiva y tooltip por barra. */
export function BarChart({ bars, unit, caption }: { bars: Bar[]; unit: string; caption: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const step = Math.max(1, Math.ceil(max / 3 / 5) * 5);
  const top = step * 3;
  const ticks = [0, step, step * 2, top];

  return (
    <figure>
      <div className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-2">
        <div className="relative h-40" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="tabular absolute right-0 -translate-y-1/2 text-[11px] text-subtle"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-40">
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")}
              style={{ bottom: `${(t / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-1.5" role="list">
            {bars.map((b) => (
              <div
                key={b.key}
                role="listitem"
                tabIndex={0}
                aria-label={`${b.title}: ${b.value} ${unit}`}
                onMouseEnter={() => setHover(b.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(b.key)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full flex-1 items-end outline-none"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-colors",
                    b.current ? "bg-accent" : "bg-accent/45 group-hover:bg-accent/70",
                  )}
                  style={{ height: `${(b.value / top) * 100}%`, minHeight: b.value ? 2 : 0 }}
                />
                {hover === b.key && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-panel">
                    <p className="text-muted">{b.title}</p>
                    <p className="tabular font-medium text-fg">
                      {b.value} {unit}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[28px_minmax(0,1fr)] gap-2" aria-hidden>
        <span />
        <div className="flex gap-1.5">
          {bars.map((b, i) => (
            <span
              key={b.key}
              className={cn(
                "tabular flex-1 text-center text-[11px]",
                b.current ? "font-medium text-fg" : "text-subtle",
                i % 2 === 1 && !b.current && "max-sm:invisible",
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.title}</th>
              <td>{b.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
