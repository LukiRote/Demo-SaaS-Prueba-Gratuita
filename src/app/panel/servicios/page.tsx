"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/panel/panel-shell";
import { toast } from "@/components/toaster";
import { Avatar, Button, Field, Input, Modal, Select, Switch, Tag, Textarea } from "@/components/ui";
import { cn, fmtMoney } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { fmtDuration } from "@/lib/time";
import type { Service, ServiceCategory } from "@/lib/types";
import { firstError, serviceSchema } from "@/lib/validation";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

export default function ServiciosPage() {
  const data = useDemo((s) => s.data!);
  const toggle = useDemo((s) => s.toggleService);
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  return (
    <>
      <PageHeader
        title="Servicios"
        sub="Lo que se puede reservar, con su duración, precio y seña."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden />
            Nuevo servicio
          </Button>
        }
      />
      <div className="space-y-8 px-4 py-6 md:px-8">
        {(["Barbería", "Estética"] as ServiceCategory[]).map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 text-[13px] font-medium text-subtle">{cat}</h2>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.services
                .filter((s) => s.category === cat)
                .map((s) => {
                  const team = data.staff.filter((m) => m.serviceIds.includes(s.id));
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4",
                        !s.active && "opacity-55",
                      )}
                    >
                      <button type="button" onClick={() => setEditing(s)} className="min-w-0 flex-1 text-left">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {s.name}
                          {s.requiresDeposit && data.business.rules.depositEnabled && (
                            <Tag>Seña {data.business.rules.depositPercent}%</Tag>
                          )}
                          {!s.active && <Tag tone="warn">Pausado</Tag>}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted sm:truncate">{s.description}</p>
                      </button>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex gap-1" aria-label={`${team.length} profesionales`}>
                          {team.map((m) => (
                            <span key={m.id} title={m.name}>
                              <Avatar name={m.name} color={m.color} size={24} />
                            </span>
                          ))}
                        </div>
                        <span className="tabular ml-auto text-sm whitespace-nowrap text-muted sm:ml-0 sm:w-20 sm:text-right">
                          {fmtDuration(s.durationMin)}
                        </span>
                        <span className="tabular text-sm font-medium whitespace-nowrap sm:w-24 sm:text-right">{fmtMoney(s.price)}</span>
                        <Switch checked={s.active} onChange={() => toggle(s.id)} label={`${s.active ? "Pausar" : "Activar"} ${s.name}`} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
        <p className="text-[13px] text-subtle">
          Un servicio pausado deja de aparecer en la página pública. Los turnos ya reservados se mantienen.
        </p>
      </div>
      {editing && <ServiceModal service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ServiceModal({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const upsert = useDemo((s) => s.upsertService);
  const [form, setForm] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    category: service?.category ?? ("Barbería" as ServiceCategory),
    durationMin: service?.durationMin ?? 30,
    price: service?.price ?? 15000,
    requiresDeposit: service?.requiresDeposit ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = serviceSchema.safeParse(form);
    if (!r.success) return setErrors(firstError(r.error));
    upsert({ ...r.data, id: service?.id });
    toast(service ? "Servicio actualizado" : "Servicio creado");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? `Editar ${service.name}` : "Nuevo servicio"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="svc-form">
            Guardar
          </Button>
        </>
      }
    >
      <form id="svc-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nombre" htmlFor="svc-name" error={errors.name}>
          <Input id="svc-name" maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Descripción" htmlFor="svc-desc" error={errors.description} optional>
          <Textarea id="svc-desc" maxLength={140} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-16" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Categoría" htmlFor="svc-cat">
            <Select id="svc-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
              <option>Barbería</option>
              <option>Estética</option>
            </Select>
          </Field>
          <Field label="Duración" htmlFor="svc-dur">
            <Select id="svc-dur" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {fmtDuration(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Precio (ARS)" htmlFor="svc-price" error={errors.price}>
            <Input
              id="svc-price"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Math.round(Number(e.target.value) || 0) })}
              aria-invalid={!!errors.price}
            />
          </Field>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-line px-3.5 py-3">
          <span>
            <span className="block text-sm font-medium">Pedir seña al reservar</span>
            <span className="block text-[13px] text-subtle">El porcentaje se configura en Horarios y reglas.</span>
          </span>
          <Switch checked={form.requiresDeposit} onChange={(v) => setForm({ ...form, requiresDeposit: v })} label="Pedir seña" />
        </label>
      </form>
    </Modal>
  );
}
