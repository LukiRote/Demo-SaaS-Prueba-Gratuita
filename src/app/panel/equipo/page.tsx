"use client";

import { useEffect, useState } from "react";
import { HoursEditor, hoursErrors } from "@/components/panel/hours-editor";
import { PageHeader } from "@/components/panel/panel-shell";
import { toast } from "@/components/toaster";
import { Avatar, Button, Panel, PanelHeader, Switch } from "@/components/ui";
import { cn } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { WeeklyHours } from "@/lib/types";

export default function EquipoPage() {
  const data = useDemo((s) => s.data!);
  const updateStaff = useDemo((s) => s.updateStaff);
  const [selectedId, setSelectedId] = useState(data.staff[0]!.id);
  const member = data.staff.find((s) => s.id === selectedId)!;
  const [hours, setHours] = useState<WeeklyHours>(member.hours);
  const [serviceIds, setServiceIds] = useState<string[]>(member.serviceIds);

  useEffect(() => {
    setHours(member.hours);
    setServiceIds(member.serviceIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const dirty = JSON.stringify(hours) !== JSON.stringify(member.hours) || serviceIds.join() !== member.serviceIds.join();
  const invalid = Object.keys(hoursErrors(hours)).length > 0 || serviceIds.length === 0;

  const save = () => {
    updateStaff(member.id, {
      hours: Object.fromEntries(
        Object.entries(hours).map(([d, r]) => [d, [...r].sort((a, b) => a.start - b.start)]),
      ) as WeeklyHours,
      serviceIds,
    });
    toast("Cambios guardados", { body: "La disponibilidad pública ya se actualizó." });
  };

  return (
    <>
      <PageHeader title="Equipo" sub="Horarios propios y servicios de cada profesional." />
      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Profesionales">
          {data.staff.map((s) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                aria-current={s.id === selectedId}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  s.id === selectedId ? "bg-raised" : "hover:bg-raised/50",
                  !s.active && "opacity-55",
                )}
              >
                <Avatar name={s.name} color={s.color} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  <span className="block truncate text-[12.5px] text-subtle">{s.role}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 space-y-6">
          <Panel>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={member.name} color={member.color} size={44} />
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-[13px] text-muted">{member.role}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-muted">
                {member.active ? "Toma turnos" : "Pausado"}
                <Switch
                  checked={member.active}
                  onChange={(v) => {
                    updateStaff(member.id, { active: v });
                    toast(v ? `${member.name.split(" ")[0]} vuelve a tomar turnos` : `${member.name.split(" ")[0]} quedó pausado`);
                  }}
                  label="Toma turnos"
                />
              </label>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Servicios que hace" />
            <div className="flex flex-wrap gap-2 px-4 py-4">
              {data.services.map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setServiceIds(on ? serviceIds.filter((x) => x !== s.id) : [...serviceIds, s.id])}
                    className={cn(
                      "h-8 rounded-lg border px-3 text-[13px] transition-colors",
                      on ? "border-accent/50 bg-accent/12 text-fg" : "border-line-strong text-muted hover:text-fg",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            {serviceIds.length === 0 && <p className="px-4 pb-4 text-[13px] text-bad">Elegí al menos un servicio.</p>}
          </Panel>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Horario semanal</h2>
                <p className="mt-0.5 text-[13px] text-subtle">
                  Se cruza con el horario del local. Partí el día para dejar el corte del mediodía.
                </p>
              </div>
            </div>
            <HoursEditor value={hours} onChange={setHours} limits={data.business.hours} />
          </section>

          <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
            <Button
              variant="ghost"
              disabled={!dirty}
              onClick={() => {
                setHours(member.hours);
                setServiceIds(member.serviceIds);
              }}
            >
              Descartar
            </Button>
            <Button onClick={save} disabled={!dirty || invalid}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
