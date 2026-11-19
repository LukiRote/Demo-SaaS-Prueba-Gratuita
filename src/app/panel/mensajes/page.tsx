"use client";

import { Info, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNow } from "@/components/demo-gate";
import { PageHeader } from "@/components/panel/panel-shell";
import { usePanelUI } from "@/components/panel/ui-state";
import { toast } from "@/components/toaster";
import { Button, Empty, Tabs, Tag, Textarea } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { fmtAbs } from "@/lib/chat";
import { cn, firstName } from "@/lib/format";
import { DEFAULT_TEMPLATES, MESSAGE_LABEL, renderTemplate, bookingVars, TEMPLATE_VARIABLES } from "@/lib/messages";
import { useDemo } from "@/lib/store";
import { absMin, fmtDateShort, fmtMin } from "@/lib/time";
import type { MessageKind, MessageStatus } from "@/lib/types";
import { templateSchema } from "@/lib/validation";

export default function MensajesPage() {
  const [tab, setTab] = useState<"cola" | "plantillas">("cola");
  return (
    <>
      <PageHeader title="Mensajes" sub="Confirmaciones y recordatorios automáticos por WhatsApp.">
        <Tabs
          className="mt-5"
          value={tab}
          onChange={setTab}
          items={[
            { value: "cola", label: "Cola de envíos" },
            { value: "plantillas", label: "Plantillas" },
          ]}
        />
      </PageHeader>
      {tab === "cola" ? <Queue /> : <TemplatesEditor />}
    </>
  );
}

function Queue() {
  const data = useDemo((s) => s.data!);
  const processQueue = useDemo((s) => s.processQueue);
  const openBooking = usePanelUI((s) => s.openBooking);
  const now = useNow();
  const [status, setStatus] = useState<MessageStatus>("programado");

  const counts = useMemo(() => {
    const c = { programado: 0, enviado: 0, cancelado: 0 };
    for (const m of data.messages) c[m.status]++;
    return c;
  }, [data.messages]);

  const rows = useMemo(
    () =>
      data.messages
        .filter((m) => m.status === status)
        .sort((a, b) => (status === "programado" ? a.scheduledAt - b.scheduledAt : b.scheduledAt - a.scheduledAt))
        .slice(0, 80),
    [data.messages, status],
  );
  const bookings = useMemo(() => new Map(data.bookings.map((b) => [b.id, b])), [data.bookings]);
  const customers = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);

  return (
    <div className="space-y-4 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-[13.5px] text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p className="min-w-0 flex-1">
          <span className="font-medium text-fg">Envío simulado.</span> En producción cada mensaje sale por la API de WhatsApp Business
          desde un proceso programado. En la demo la cola se procesa en tu navegador cada 30 segundos.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const n = processQueue();
            toast(n ? `${n} mensajes enviados` : "Nada pendiente por ahora", {
              body: n ? undefined : "El próximo recordatorio sale a su horario.",
            });
          }}
        >
          <Play className="size-3.5" aria-hidden />
          Procesar cola ahora
        </Button>
      </div>

      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          { value: "programado", label: "Programados", count: counts.programado },
          { value: "enviado", label: "Enviados", count: counts.enviado },
          { value: "cancelado", label: "Cancelados", count: counts.cancelado },
        ]}
      />

      {rows.length === 0 ? (
        <Empty title="No hay mensajes en esta lista" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-[12px] text-subtle">
                <th className="px-4 py-2.5 font-medium">{status === "programado" ? "Se envía" : "Fecha"}</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Turno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => {
                const b = bookings.get(m.bookingId);
                if (!b) return null;
                const c = customers.get(b.customerId);
                const soon = m.status === "programado" && m.scheduledAt - absMin(now.date, now.min) < 120;
                return (
                  <tr
                    key={m.id}
                    tabIndex={0}
                    onClick={() => openBooking(b.id)}
                    onKeyDown={(e) => e.key === "Enter" && openBooking(b.id)}
                    className="cursor-pointer transition-colors hover:bg-raised/50"
                  >
                    <td className="tabular px-4 py-3 whitespace-nowrap">
                      {fmtAbs(m.scheduledAt, now.date)}
                      {soon && (
                        <span className="ml-2">
                          <Tag tone="accent">Pronto</Tag>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{MESSAGE_LABEL[m.kind]}</td>
                    <td className="px-4 py-3">
                      {c?.name}
                      {b.fromVisitor && (
                        <span className="ml-2">
                          <Tag tone="accent">Tu prueba</Tag>
                        </span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-muted">
                      {fmtDateShort(b.date)} · {fmtMin(b.start)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const KINDS = Object.keys(DEFAULT_TEMPLATES) as MessageKind[];

function TemplatesEditor() {
  const data = useDemo((s) => s.data!);
  const { updateTemplate, resetTemplates } = useDemo();
  const [kind, setKind] = useState<MessageKind>("confirmacion");
  const [draft, setDraft] = useState(data.templates.confirmacion);
  const ref = useRef<HTMLTextAreaElement>(null);

  const sample = useMemo(
    () =>
      data.bookings.find((b) => b.status === "confirmado" && b.fromVisitor) ??
      data.bookings.find((b) => b.status === "confirmado") ??
      data.bookings[0]!,
    [data.bookings],
  );
  const vars = bookingVars(data, sample);
  const preview = renderTemplate(draft, vars);
  const dirty = draft !== data.templates[kind];
  const tooLong = draft.length > 600;

  const pick = (k: MessageKind) => {
    setKind(k);
    setDraft(data.templates[k]);
  };

  const insert = (key: string) => {
    const el = ref.current;
    const token = `{${key}}`;
    if (!el) return setDraft(draft + token);
    const { selectionStart: s, selectionEnd: e } = el;
    const next = draft.slice(0, s) + token + draft.slice(e);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  };

  return (
    <div className="grid gap-6 px-4 py-6 md:px-8 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
      <ul className="flex gap-1 overflow-x-auto xl:flex-col" aria-label="Plantillas">
        {KINDS.map((k) => (
          <li key={k} className="shrink-0">
            <button
              type="button"
              onClick={() => pick(k)}
              aria-current={k === kind}
              className={cn(
                "flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13.5px] transition-colors",
                k === kind ? "bg-raised font-medium text-fg" : "text-muted hover:bg-raised/50 hover:text-fg",
              )}
            >
              {MESSAGE_LABEL[k]}
              {data.templates[k] !== DEFAULT_TEMPLATES[k] && <span className="size-1.5 rounded-full bg-accent" aria-label="Editada" />}
            </button>
          </li>
        ))}
      </ul>

      <div className="min-w-0 space-y-3">
        <label htmlFor="tpl" className="text-sm font-semibold">
          {MESSAGE_LABEL[kind]}
        </label>
        <Textarea
          id="tpl"
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-48 font-mono text-[13px]"
          aria-invalid={tooLong}
        />
        <div className="flex items-center justify-between text-[12.5px]">
          <span className={cn("tabular", tooLong ? "text-bad" : "text-subtle")}>{draft.length} / 600</span>
          <span className="text-subtle">Hacé clic en una variable para insertarla.</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insert(v.key)}
              title={v.label}
              className="h-7 rounded-md border border-line-strong bg-surface px-2 font-mono text-[12px] text-muted transition-colors hover:border-accent hover:text-fg"
            >
              {`{${v.key}}`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              resetTemplates();
              setDraft(DEFAULT_TEMPLATES[kind]);
              toast("Plantillas restauradas");
            }}
          >
            Restaurar originales
          </Button>
          <Button
            disabled={!dirty || tooLong}
            onClick={() => {
              const r = templateSchema.safeParse(draft);
              if (!r.success) return toast("La plantilla no es válida", { tone: "error" });
              updateTemplate(kind, draft.trim());
              toast("Plantilla guardada", { body: "Se usa en los próximos envíos." });
            }}
          >
            Guardar plantilla
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-medium text-subtle">
          Vista previa con el turno de {firstName(data.customers.find((c) => c.id === sample.customerId)?.name ?? "")}
        </p>
        <WhatsAppPreview
          key={kind}
          businessName={data.business.name}
          animate={false}
          messages={[{ id: "preview", body: preview, time: fmtMin(sample.start), status: "enviado" }]}
        />
      </div>
    </div>
  );
}
