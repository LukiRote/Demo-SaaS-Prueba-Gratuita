"use client";

import { Check, ExternalLink, Moon, RotateCcw, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { NavajaMark } from "@/components/brand";
import { PageHeader } from "@/components/panel/panel-shell";
import { toast } from "@/components/toaster";
import { Button, ButtonLink, Field, Input, Modal, Panel, PanelHeader } from "@/components/ui";
import { cn } from "@/lib/format";
import { bookUrl } from "@/lib/messages";
import { useDemo } from "@/lib/store";
import type { PublicTheme } from "@/lib/types";

/** Acentos con contraste suficiente sobre fondo claro y oscuro. */
const ACCENTS = [
  { value: "#6366F1", name: "Índigo" },
  { value: "#7C3AED", name: "Violeta" },
  { value: "#0E7490", name: "Petróleo" },
  { value: "#047857", name: "Verde" },
  { value: "#B45309", name: "Ámbar" },
  { value: "#BE123C", name: "Carmín" },
];

export default function AjustesPage() {
  const data = useDemo((s) => s.data!);
  const { updateBusiness, reset } = useDemo();
  const b = data.business;
  const [form, setForm] = useState({ name: b.name, tagline: b.tagline, location: b.location, instagram: b.instagram });
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = form.name !== b.name || form.tagline !== b.tagline || form.location !== b.location || form.instagram !== b.instagram;

  const save = (e: FormEvent) => {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.replace(/\s+/g, " ").trim()])) as typeof form;
    if (clean.name.length < 2 || clean.name.length > 40) return setError("El nombre tiene que tener entre 2 y 40 caracteres.");
    setError(null);
    updateBusiness({
      name: clean.name,
      tagline: clean.tagline.slice(0, 60),
      location: clean.location.slice(0, 80),
      instagram: clean.instagram.slice(0, 31),
    });
    toast("Datos del negocio guardados");
  };

  return (
    <>
      <PageHeader
        title="Ajustes"
        sub="Cómo se ve tu página de reservas."
        actions={
          <ButtonLink href="/r/navaja" target="_blank" variant="secondary">
            <ExternalLink className="size-4" aria-hidden />
            Ver página pública
          </ButtonLink>
        }
      />
      <div className="grid gap-6 px-4 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <PanelHeader title="Negocio" />
            <form onSubmit={save} noValidate className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="b-name" error={error ?? undefined}>
                <Input id="b-name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Bajada" htmlFor="b-tag">
                <Input id="b-tag" maxLength={60} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </Field>
              <Field label="Ubicación" htmlFor="b-loc">
                <Input id="b-loc" maxLength={80} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label="Instagram" htmlFor="b-ig">
                <Input id="b-ig" maxLength={31} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <p className="tabular truncate text-[13px] text-subtle">Link: {bookUrl(b.slug)}</p>
                <Button type="submit" disabled={!dirty}>
                  Guardar
                </Button>
              </div>
            </form>
          </Panel>

          <Panel>
            <PanelHeader title="Marca de la página pública" sub="El panel siempre usa el tema de Kaelop." />
            <div className="space-y-5 px-4 py-4">
              <div>
                <p className="mb-2 text-[13px] font-medium">Color de acento</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de acento">
                  {ACCENTS.map((a) => {
                    const on = b.accent.toLowerCase() === a.value.toLowerCase();
                    return (
                      <button
                        key={a.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={a.name}
                        title={a.name}
                        onClick={() => updateBusiness({ accent: a.value })}
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                          on ? "ring-2 ring-fg" : "hover:ring-2 hover:ring-line-strong",
                        )}
                        style={{ background: a.value }}
                      >
                        {on && <Check className="size-4 text-white" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Tema</p>
                <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label="Tema">
                  {(
                    [
                      ["dark", "Oscuro", Moon],
                      ["light", "Claro", Sun],
                    ] as [PublicTheme, string, typeof Moon][]
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={b.publicTheme === value}
                      onClick={() => updateBusiness({ publicTheme: value })}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium",
                        b.publicTheme === value ? "bg-raised-hi text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="border-bad/25">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-sm font-medium">Reiniciar la demo</p>
                <p className="text-[13px] text-subtle">Borra tus reservas de prueba y cambios, y genera una agenda nueva.</p>
              </div>
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-4" aria-hidden />
                Reiniciar
              </Button>
            </div>
          </Panel>
        </div>

        <div>
          <p className="mb-3 text-[13px] font-medium text-subtle">Así se ve el encabezado</p>
          <div
            data-theme={b.publicTheme}
            style={{ ["--accent" as string]: b.accent }}
            className="overflow-hidden rounded-xl border border-line bg-bg p-5 text-fg"
          >
            <NavajaMark className="size-12" accent={b.accent} />
            <p className="mt-3 font-display text-xl font-semibold tracking-[-0.02em]">{b.name}</p>
            <p className="text-sm text-muted">{b.tagline}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {["10:30", "11:15", "12:00"].map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    "tabular flex h-9 items-center justify-center rounded-lg border text-sm font-medium",
                    i === 1 ? "border-transparent bg-accent text-white" : "border-line-strong",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Reiniciar la demo?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirmReset(false);
                toast("Demo reiniciada");
                window.location.reload();
              }}
            >
              Reiniciar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Se pierden las reservas y cambios que hiciste en este navegador.</p>
      </Modal>
    </>
  );
}
