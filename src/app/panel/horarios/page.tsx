"use client";

import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNow } from "@/components/demo-gate";
import { HoursEditor, hoursErrors } from "@/components/panel/hours-editor";
import { PageHeader } from "@/components/panel/panel-shell";
import { toast } from "@/components/toaster";
import { Button, Empty, Field, IconButton, Input, Modal, Panel, PanelHeader, Select, Switch, Tag } from "@/components/ui";
import { firstName } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { fmtDateShort, fmtMin, parseHM } from "@/lib/time";
import type { BlockKind, Rules, WeeklyHours } from "@/lib/types";
import { blockSchema, firstError } from "@/lib/validation";

const KIND_LABEL: Record<BlockKind, string> = {
  feriado: "Feriado",
  vacaciones: "Vacaciones",
  descanso: "Descanso",
  otro: "Otro",
};

export default function HorariosPage() {
  const data = useDemo((s) => s.data!);
  const { setBusinessHours, updateRules, removeBlock } = useDemo();
  const now = useNow();
  const [hours, setHours] = useState<WeeklyHours>(data.business.hours);
  const [adding, setAdding] = useState(false);
  const rules = data.business.rules;

  const dirty = JSON.stringify(hours) !== JSON.stringify(data.business.hours);
  const invalid = Object.keys(hoursErrors(hours)).length > 0;

  const rule = <K extends keyof Rules>(key: K, value: Rules[K]) => {
    updateRules({ [key]: value } as Partial<Rules>);
    toast("Regla actualizada", { body: "Ya se aplica en la página pública." });
  };

  const upcoming = data.blocks.filter((b) => b.to >= now.date).sort((a, b) => a.from.localeCompare(b.from));

  return (
    <>
      <PageHeader title="Horarios y reglas" sub="Cuándo abre el local y cómo se pueden reservar los turnos." />
      <div className="grid gap-8 px-4 py-6 md:px-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="text-sm font-semibold">Horario del local</h2>
            <p className="mt-0.5 mb-3 text-[13px] text-subtle">Cada profesional trabaja dentro de este horario.</p>
            <HoursEditor value={hours} onChange={setHours} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" disabled={!dirty} onClick={() => setHours(data.business.hours)}>
                Descartar
              </Button>
              <Button
                disabled={!dirty || invalid}
                onClick={() => {
                  setBusinessHours(hours);
                  toast("Horario guardado");
                }}
              >
                Guardar horario
              </Button>
            </div>
          </section>

          <Panel>
            <PanelHeader title="Reglas de reserva" sub="Se aplican apenas las cambiás." />
            <div className="divide-y divide-line">
              <RuleRow title="Tiempo entre turnos" hint="Para limpiar y preparar el puesto.">
                <Select aria-label="Tiempo entre turnos" value={rules.bufferMin} onChange={(e) => rule("bufferMin", Number(e.target.value))} className="w-36">
                  {[0, 5, 10, 15, 20].map((v) => (
                    <option key={v} value={v}>
                      {v ? `${v} min` : "Sin pausa"}
                    </option>
                  ))}
                </Select>
              </RuleRow>
              <RuleRow title="Intervalo de horarios" hint="Cada cuánto se ofrecen horarios de inicio.">
                <Select aria-label="Intervalo" value={rules.slotStep} onChange={(e) => rule("slotStep", Number(e.target.value))} className="w-36">
                  {[10, 15, 20, 30, 60].map((v) => (
                    <option key={v} value={v}>
                      Cada {v} min
                    </option>
                  ))}
                </Select>
              </RuleRow>
              <RuleRow title="Anticipación mínima" hint="Evita turnos que te agarran desprevenido.">
                <Select aria-label="Anticipación mínima" value={rules.minAdvanceHours} onChange={(e) => rule("minAdvanceHours", Number(e.target.value))} className="w-36">
                  {[0, 1, 2, 4, 12, 24].map((v) => (
                    <option key={v} value={v}>
                      {v ? `${v} h antes` : "Sin mínimo"}
                    </option>
                  ))}
                </Select>
              </RuleRow>
              <RuleRow title="Reservas hasta" hint="Qué tan lejos se puede reservar.">
                <Select aria-label="Anticipación máxima" value={rules.maxAdvanceDays} onChange={(e) => rule("maxAdvanceDays", Number(e.target.value))} className="w-36">
                  {[7, 14, 30, 60].map((v) => (
                    <option key={v} value={v}>
                      {v} días
                    </option>
                  ))}
                </Select>
              </RuleRow>
              <RuleRow title="Cancelar o reprogramar" hint="Hasta cuántas horas antes lo puede hacer el cliente.">
                <Select aria-label="Ventana de cancelación" value={rules.cancelWindowHours} onChange={(e) => rule("cancelWindowHours", Number(e.target.value))} className="w-36">
                  {[0, 2, 4, 12, 24, 48].map((v) => (
                    <option key={v} value={v}>
                      {v ? `${v} h antes` : "Hasta el turno"}
                    </option>
                  ))}
                </Select>
              </RuleRow>
              <RuleRow title="Seña" hint="Solo en los servicios marcados con seña.">
                <div className="flex items-center gap-3">
                  <Select
                    aria-label="Porcentaje de seña"
                    value={rules.depositPercent}
                    disabled={!rules.depositEnabled}
                    onChange={(e) => rule("depositPercent", Number(e.target.value))}
                    className="w-24"
                  >
                    {[10, 20, 30, 40, 50].map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </Select>
                  <Switch checked={rules.depositEnabled} onChange={(v) => rule("depositEnabled", v)} label="Cobrar seña" />
                </div>
              </RuleRow>
            </div>
          </Panel>
        </div>

        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Bloqueos</h2>
              <p className="mt-0.5 text-[13px] text-subtle">Feriados, vacaciones y huecos puntuales.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Bloquear
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <Panel>
              <Empty icon={<CalendarOff className="size-6" />} title="Sin bloqueos próximos" />
            </Panel>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {upcoming.map((b) => {
                const who = b.staffId ? data.staff.find((s) => s.id === b.staffId)?.name : null;
                return (
                  <li key={b.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {b.reason}
                        <Tag tone={b.kind === "feriado" ? "warn" : "neutral"}>{KIND_LABEL[b.kind]}</Tag>
                      </p>
                      <p className="tabular mt-0.5 text-[13px] text-muted">
                        {fmtDateShort(b.from)}
                        {b.to !== b.from && ` al ${fmtDateShort(b.to)}`}
                        {b.startMin !== undefined && ` · ${fmtMin(b.startMin)} a ${fmtMin(b.endMin!)}`}
                        <span className="text-subtle"> · {who ? firstName(who) : "Todo el local"}</span>
                      </p>
                    </div>
                    <IconButton
                      label="Quitar bloqueo"
                      onClick={() => {
                        removeBlock(b.id);
                        toast("Bloqueo quitado", { body: "Esos horarios vuelven a estar disponibles." });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      {adding && <BlockModal onClose={() => setAdding(false)} />}
    </>
  );
}

function RuleRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[13px] text-subtle">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function BlockModal({ onClose }: { onClose: () => void }) {
  const data = useDemo((s) => s.data!);
  const addBlock = useDemo((s) => s.addBlock);
  const now = useNow();
  const [form, setForm] = useState({
    kind: "vacaciones" as BlockKind,
    staffId: "",
    from: now.date,
    to: now.date,
    partial: false,
    start: "13:00",
    end: "15:00",
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const affected = data.bookings.filter(
    (b) =>
      b.status === "confirmado" &&
      b.date >= form.from &&
      b.date <= form.to &&
      (!form.staffId || b.staffId === form.staffId) &&
      (!form.partial || (b.start < parseHM(form.end) && b.end > parseHM(form.start))),
  ).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const candidate = {
      kind: form.kind,
      staffId: form.staffId || null,
      from: form.from,
      to: form.partial ? form.from : form.to,
      reason: form.reason || KIND_LABEL[form.kind],
      ...(form.partial ? { startMin: parseHM(form.start), endMin: parseHM(form.end) } : {}),
    };
    const r = blockSchema.safeParse(candidate);
    if (!r.success) return setErrors(firstError(r.error));
    addBlock(r.data);
    toast("Bloqueo creado", { body: "Esos horarios ya no se ofrecen online." });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Bloquear horarios"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="block-form">
            Crear bloqueo
          </Button>
        </>
      }
    >
      <form id="block-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="blk-kind">
            <Select id="blk-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BlockKind })}>
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Para" htmlFor="blk-staff">
            <Select id="blk-staff" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">Todo el local</option>
              {data.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={form.partial ? "Día" : "Desde"} htmlFor="blk-from">
            <Input id="blk-from" type="date" value={form.from} onChange={(e) => e.target.value && setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} />
          </Field>
          {!form.partial && (
            <Field label="Hasta" htmlFor="blk-to" error={errors.to}>
              <Input id="blk-to" type="date" min={form.from} value={form.to} onChange={(e) => e.target.value && setForm({ ...form, to: e.target.value })} />
            </Field>
          )}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={form.partial} onChange={(v) => setForm({ ...form, partial: v })} label="Solo algunas horas" />
          Solo algunas horas de un día
        </label>
        {form.partial && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desde las" htmlFor="blk-start">
              <Input id="blk-start" type="time" step={900} value={form.start} onChange={(e) => e.target.value && setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Hasta las" htmlFor="blk-end" error={errors.endMin}>
              <Input id="blk-end" type="time" step={900} value={form.end} onChange={(e) => e.target.value && setForm({ ...form, end: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label="Motivo" htmlFor="blk-reason" error={errors.reason} optional>
          <Input id="blk-reason" maxLength={60} value={form.reason} placeholder={KIND_LABEL[form.kind]} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        {affected > 0 && (
          <p className="rounded-lg bg-warn/10 px-3 py-2.5 text-[13px] text-warn">
            Hay {affected} {affected === 1 ? "turno confirmado" : "turnos confirmados"} en ese rango. El bloqueo no los cancela: movelos
            o avisales desde la agenda.
          </p>
        )}
      </form>
    </Modal>
  );
}
