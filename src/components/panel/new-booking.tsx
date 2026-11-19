"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNow } from "@/components/demo-gate";
import { toast } from "@/components/toaster";
import { Button, Field, Input, Modal, Select, Tabs } from "@/components/ui";
import { getSlots } from "@/lib/availability";
import { fmtMoney, fmtPhone } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { fmtDuration, fmtMin } from "@/lib/time";
import { customerFormSchema, firstError } from "@/lib/validation";
import { usePanelUI } from "./ui-state";

export function NewBookingModal() {
  const prefill = usePanelUI((s) => s.newBooking);
  const close = usePanelUI((s) => s.closeNewBooking);
  const openBooking = usePanelUI((s) => s.openBooking);
  const data = useDemo((s) => s.data!);
  const createBooking = useDemo((s) => s.createBooking);
  const now = useNow();

  const [mode, setMode] = useState<"existente" | "nuevo">("existente");
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(now.date);
  const [start, setStart] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!prefill) return;
    const staff = prefill.staffId ? data.staff.find((s) => s.id === prefill.staffId) : undefined;
    const svc = data.services.find((s) => s.active && (!staff || staff.serviceIds.includes(s.id)));
    setMode("existente");
    setCustomerId("");
    setForm({ name: "", phone: "" });
    setServiceId(svc?.id ?? "");
    setStaffId(staff?.id ?? data.staff.find((s) => s.active && svc && s.serviceIds.includes(svc.id))?.id ?? "");
    setDate(prefill.date ?? now.date);
    setStart(prefill.start ?? null);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const service = data.services.find((s) => s.id === serviceId);
  const staffOptions = data.staff.filter((s) => s.active && (!service || s.serviceIds.includes(service.id)));
  const slots = useMemo(
    () =>
      serviceId && staffId && date
        ? getSlots(data, { date, serviceId, staffId }, now, { ignoreAdvance: true })
        : [],
    [data, date, serviceId, staffId, now],
  );
  const customers = useMemo(() => [...data.customers].sort((a, b) => a.name.localeCompare(b.name, "es")), [data.customers]);

  // Si el horario precargado no está libre para ese servicio, no lo forzamos.
  const startValid = start !== null && slots.some((s) => s.start === start);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    let customer: { name: string; phone: string } | null = null;
    if (mode === "existente") {
      const c = data.customers.find((x) => x.id === customerId);
      if (!c) errs.customer = "Elegí un cliente.";
      else customer = { name: c.name, phone: c.phone };
    } else {
      const res = customerFormSchema.safeParse(form);
      if (!res.success) Object.assign(errs, firstError(res.error));
      else customer = res.data;
    }
    if (!service) errs.service = "Elegí un servicio.";
    if (!startValid) errs.start = "Elegí un horario libre.";
    setErrors(errs);
    if (Object.keys(errs).length || !customer || !service || start === null) return;

    const r = createBooking({ serviceId: service.id, staffId, date, start, customer, source: "manual" });
    if (!r.ok) return toast(r.error, { tone: "error" });
    toast("Reserva creada", { body: "Se envió la confirmación por WhatsApp." });
    close();
    openBooking(r.value.id);
  };

  return (
    <Modal
      open={!!prefill}
      onClose={close}
      title="Nueva reserva"
      description="Para turnos que llegan por teléfono, Instagram o en el local."
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="new-booking">
            Crear reserva
          </Button>
        </>
      }
    >
      <form id="new-booking" onSubmit={submit} noValidate className="space-y-5">
        <div className="space-y-3">
          <Tabs
            value={mode}
            onChange={setMode}
            items={[
              { value: "existente", label: "Cliente existente" },
              { value: "nuevo", label: "Cliente nuevo" },
            ]}
          />
          {mode === "existente" ? (
            <Field label="Cliente" htmlFor="nb-customer" error={errors.customer}>
              <Select id="nb-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} aria-invalid={!!errors.customer}>
                <option value="">Elegí un cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {fmtPhone(c.phone)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre y apellido" htmlFor="nb-name" error={errors.name}>
                <Input id="nb-name" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
              </Field>
              <Field label="Celular" htmlFor="nb-phone" error={errors.phone}>
                <Input
                  id="nb-phone"
                  type="tel"
                  maxLength={30}
                  placeholder="11 5555-0123"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  aria-invalid={!!errors.phone}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Servicio" htmlFor="nb-service" error={errors.service}>
            <Select
              id="nb-service"
              value={serviceId}
              onChange={(e) => {
                const id = e.target.value;
                setServiceId(id);
                if (!data.staff.find((s) => s.id === staffId)?.serviceIds.includes(id))
                  setStaffId(data.staff.find((s) => s.active && s.serviceIds.includes(id))?.id ?? "");
              }}
            >
              {data.services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {fmtDuration(s.durationMin)} · {fmtMoney(s.price)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Profesional" htmlFor="nb-staff">
            <Select id="nb-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" htmlFor="nb-date">
            <Input id="nb-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field
            label="Horario"
            htmlFor="nb-start"
            error={errors.start}
            hint={slots.length ? `${slots.length} horarios libres` : "Sin horarios libres ese día"}
          >
            <Select
              id="nb-start"
              value={startValid ? String(start) : ""}
              onChange={(e) => setStart(e.target.value ? Number(e.target.value) : null)}
              aria-invalid={!!errors.start}
              disabled={!slots.length}
            >
              <option value="">Elegí…</option>
              {slots.map((s) => (
                <option key={s.start} value={s.start}>
                  {fmtMin(s.start)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
