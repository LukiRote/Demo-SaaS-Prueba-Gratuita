"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { create } from "zustand";

interface Toast {
  id: number;
  tone: "ok" | "error";
  title: string;
  body?: string;
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }));
let next = 1;

export function toast(title: string, opts: { body?: string; tone?: Toast["tone"] } = {}) {
  const t: Toast = { id: next++, title, body: opts.body, tone: opts.tone ?? "ok" };
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), t] }));
  setTimeout(() => dismiss(t.id), 4200);
}

const dismiss = (id: number) => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-step pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line-strong bg-raised px-4 py-3 shadow-panel"
        >
          {t.tone === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{t.title}</p>
            {t.body && <p className="mt-0.5 text-sm [overflow-wrap:anywhere] text-muted">{t.body}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="-mr-1 rounded-md p-1 text-subtle hover:text-fg"
            aria-label="Cerrar aviso"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
