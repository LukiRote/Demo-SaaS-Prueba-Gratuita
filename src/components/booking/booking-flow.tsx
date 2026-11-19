"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { NavajaMark } from "@/components/brand";
import { useNow } from "@/components/demo-gate";
import { SlotPicker, type SlotValue } from "@/components/slot-picker";
import { toast } from "@/components/toaster";
import { Avatar, Button, ButtonLink, Field, Input, Tag, Textarea } from "@/components/ui";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { getSlots } from "@/lib/availability";
import { chatFor } from "@/lib/chat";
import { cn, firstName, fmtMoney, fmtPhone } from "@/lib/format";
import { bookingIcs, downloadIcs, messageBody, waLink } from "@/lib/messages";
import { useDemo } from "@/lib/store";
import { addDays, fmtDateLong, fmtDuration, fmtMin, fmtRelativeDay, fmtWhen, weekday } from "@/lib/time";
import type { Booking, Service } from "@/lib/types";
import { customerFormSchema, firstError } from "@/lib/validation";

type Step = "servicio" | "profesional" | "horario" | "datos" | "sena" | "listo";

export function BookingFlow() {
  const data = useDemo((s) => s.data!);
  const createBooking = useDemo((s) => s.createBooking);
  const { business, services, staff } = data;

  const [step, setStep] = useState<Step>("servicio");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>("any");
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const depositAmount =
    service && business.rules.depositEnabled && service.requiresDeposit
      ? Math.round((service.price * business.rules.depositPercent) / 100 / 100) * 100
      : 0;

  const steps: { id: Step; label: string }[] = [
    { id: "servicio", label: "Servicio" },
    { id: "profesional", label: "Profesional" },
    { id: "horario", label: "Día y hora" },
    { id: "datos", label: "Tus datos" },
    ...(depositAmount ? [{ id: "sena" as Step, label: "Seña" }] : []),
  ];
  const index = steps.findIndex((s) => s.id === step);

  const go = (s: Step) => {
    setStep(s);
    if (typeof window !== "undefined" && window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parsed = () => {
    const res = customerFormSchema.safeParse(form);
    if (!res.success) {
      setErrors(firstError(res.error));
      return null;
    }
    setErrors({});
    return res.data;
  };

  const commit = () => {
    const customer = parsed();
    if (!customer || !service || !slot) return;
    const res = createBooking({
      serviceId: service.id,
      staffId: slot.staffId,
      date: slot.date,
      start: slot.start,
      customer,
      source: "online",
    });
    if (!res.ok) {
      toast(res.error, { tone: "error" });
      if (res.error.includes("horario")) {
        setSlot(null);
        go("horario");
      }
      return;
    }
    setBooking(res.value);
    go("listo");
  };

  const onSubmitData = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed()) return;
    if (depositAmount) go("sena");
    else commit();
  };

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      commit();
    }, 1200);
  };

  if (step === "listo" && booking) return <Confirmation booking={booking} />;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-8 md:py-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <BusinessHeader />
        <dl className="mt-6 hidden space-y-1 lg:block">
          <SummaryRow
            label="Servicio"
            value={service ? service.name : undefined}
            detail={service ? `${fmtDuration(service.durationMin)} · ${fmtMoney(service.price)}` : undefined}
            onEdit={index > 0 ? () => go("servicio") : undefined}
          />
          <SummaryRow
            label="Profesional"
            value={
              index > 1
                ? staffId === "any"
                  ? slot
                    ? `${firstName(staff.find((s) => s.id === slot.staffId)?.name ?? "")} (asignado)`
                    : "Cualquiera disponible"
                  : staff.find((s) => s.id === staffId)?.name
                : undefined
            }
            onEdit={index > 1 ? () => go("profesional") : undefined}
          />
          <SummaryRow
            label="Día y hora"
            value={slot && index > 2 ? `${fmtDateLong(slot.date, true)}` : undefined}
            detail={slot && index > 2 ? `${fmtMin(slot.start)} a ${fmtMin(slot.start + (service?.durationMin ?? 0))}` : undefined}
            onEdit={index > 2 ? () => go("horario") : undefined}
          />
        </dl>
        {depositAmount > 0 && (
          <p className="mt-4 hidden rounded-lg bg-raised px-3 py-2.5 text-[13px] text-muted lg:block">
            Este servicio pide una seña de <span className="font-medium text-fg">{fmtMoney(depositAmount)}</span>, que se
            descuenta del total.
          </p>
        )}
        <p className="mt-6 hidden items-start gap-2 text-[13px] text-subtle lg:flex">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Podés cancelar o reprogramar sin costo hasta {business.rules.cancelWindowHours} h antes.
        </p>
      </aside>

      <section className="min-w-0" aria-labelledby="step-title">
        <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" aria-label="Progreso">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  i === index ? "font-medium text-fg" : i < index ? "text-muted" : "text-subtle",
                )}
                aria-current={i === index ? "step" : undefined}
              >
                <span
                  className={cn(
                    "tabular inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                    i < index && "bg-accent/15 text-accent",
                    i === index && "bg-accent text-accent-fg",
                    i > index && "border border-line-strong",
                  )}
                >
                  {i < index ? <Check className="size-3" aria-hidden /> : i + 1}
                </span>
                <span className={cn(i !== index && "hidden sm:inline")}>{s.label}</span>
              </span>
              {i < steps.length - 1 && <ChevronRight className="size-3.5 text-subtle" aria-hidden />}
            </li>
          ))}
        </ol>

        <div key={step} className="animate-step">
          {step === "servicio" && (
            <>
              <StepTitle title="¿Qué te querés hacer?" />
              <ServiceList
                services={services}
                selected={serviceId}
                onPick={(s) => {
                  setServiceId(s.id);
                  setSlot(null);
                  if (staffId !== "any" && !staff.find((m) => m.id === staffId)?.serviceIds.includes(s.id)) setStaffId("any");
                  go("profesional");
                }}
              />
            </>
          )}

          {step === "profesional" && service && (
            <>
              <StepTitle title="¿Con quién?" back={() => go("servicio")} />
              <StaffList
                service={service}
                selected={staffId}
                onPick={(id) => {
                  setStaffId(id);
                  setSlot(null);
                  go("horario");
                }}
              />
            </>
          )}

          {step === "horario" && service && (
            <>
              <StepTitle
                title="Elegí día y horario"
                sub={`${service.name} · ${fmtDuration(service.durationMin)}`}
                back={() => go("profesional")}
              />
              <SlotPicker
                serviceId={service.id}
                staffId={staffId}
                value={slot}
                onChange={(v) => {
                  setSlot(v);
                  go("datos");
                }}
              />
            </>
          )}

          {step === "datos" && service && slot && (
            <>
              <StepTitle
                title="Último paso: tus datos"
                sub={`${service.name} · ${fmtWhen(slot.date)} a las ${fmtMin(slot.start)}`}
                back={() => go("horario")}
              />
              <form onSubmit={onSubmitData} noValidate className="max-w-lg space-y-4">
                <Field label="Nombre y apellido" htmlFor="f-name" error={errors.name}>
                  <Input
                    id="f-name"
                    autoComplete="name"
                    maxLength={60}
                    value={form.name}
                    aria-invalid={!!errors.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </Field>
                <Field
                  label="Celular con WhatsApp"
                  htmlFor="f-phone"
                  error={errors.phone}
                  hint="Te llega la confirmación y un recordatorio antes del turno."
                >
                  <div className="flex">
                    <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-line-strong bg-raised px-3 text-sm text-muted tabular">
                      +54
                    </span>
                    <Input
                      id="f-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      maxLength={30}
                      value={form.phone}
                      aria-invalid={!!errors.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="11 5555-0123"
                      className="rounded-l-none"
                    />
                  </div>
                </Field>
                <Field label="Email" htmlFor="f-email" error={errors.email} optional>
                  <Input
                    id="f-email"
                    type="email"
                    autoComplete="email"
                    maxLength={120}
                    value={form.email}
                    aria-invalid={!!errors.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nombre@mail.com"
                  />
                </Field>
                <Field label="¿Algo que tengamos que saber?" htmlFor="f-notes" error={errors.notes} optional>
                  <Textarea
                    id="f-notes"
                    maxLength={280}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ej. traigo foto de referencia"
                    className="min-h-20"
                  />
                </Field>
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-subtle">
                    <Lock className="size-3.5" aria-hidden />
                    Demo: tus datos no salen de este navegador.
                  </p>
                  <Button type="submit" size="lg">
                    {depositAmount ? "Continuar a la seña" : "Confirmar reserva"}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === "sena" && service && slot && (
            <>
              <StepTitle title="Confirmá con una seña" back={() => go("datos")} />
              <div className="max-w-lg overflow-hidden rounded-xl border border-line-strong bg-surface">
                <div className="space-y-3 px-5 py-5">
                  <Line label={service.name} value={fmtMoney(service.price)} />
                  <Line
                    label={`Seña (${business.rules.depositPercent}%)`}
                    value={fmtMoney(depositAmount)}
                    strong
                  />
                  <Line label="Pagás en el local" value={fmtMoney(service.price - depositAmount)} muted />
                </div>
                <div className="border-t border-line bg-raised/50 px-5 py-4 text-[13px] text-muted">
                  En producción esto abre el checkout de Mercado Pago o Stripe. En la demo{" "}
                  <span className="text-fg">el pago es simulado</span>: no se cobra nada y no pedimos datos de tarjeta.
                </div>
              </div>
              <div className="mt-5 flex max-w-lg justify-end">
                <Button size="lg" onClick={pay} loading={paying}>
                  {paying ? "Procesando…" : `Pagar ${fmtMoney(depositAmount)} (simulado)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StepTitle({ title, sub, back }: { title: string; sub?: string; back?: () => void }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {back && (
        <button
          type="button"
          onClick={back}
          aria-label="Volver al paso anterior"
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-muted hover:bg-raised hover:text-fg"
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      <div>
        <h1 id="step-title" className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] text-balance md:text-[30px]">
          {title}
        </h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-sm", muted && "text-subtle")}>
      <span className={cn(strong && "font-medium text-fg")}>{label}</span>
      <span className={cn("tabular", strong ? "text-lg font-semibold text-fg" : "text-muted")}>{value}</span>
    </div>
  );
}

function BusinessHeader() {
  const business = useDemo((s) => s.data!.business);
  const now = useNow();
  const today = business.hours[weekday(now.date)];
  const open = today.length > 0;
  return (
    <div className="flex items-start gap-4 lg:flex-col lg:gap-4">
      <NavajaMark className="size-12 lg:size-14" />
      <div className="min-w-0">
        <p className="font-display text-xl font-semibold tracking-[-0.02em] lg:text-2xl">{business.name}</p>
        <p className="text-sm text-muted">{business.tagline}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-subtle">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {business.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden />
            {open ? `Hoy de ${fmtMin(today[0]!.start)} a ${fmtMin(today.at(-1)!.end)}` : "Hoy cerrado"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  detail,
  onEdit,
}: {
  label: string;
  value?: string;
  detail?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="group flex items-start justify-between gap-3 border-t border-line py-3">
      <div className="min-w-0">
        <dt className="text-[12px] text-subtle">{label}</dt>
        <dd className={cn("mt-0.5 text-sm", value ? "font-medium text-fg" : "text-subtle")}>{value ?? "—"}</dd>
        {detail && <dd className="tabular text-[13px] text-muted">{detail}</dd>}
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-[12.5px] text-muted underline-offset-2 hover:text-fg hover:underline">
          Cambiar
        </button>
      )}
    </div>
  );
}

function ServiceList({
  services,
  selected,
  onPick,
}: {
  services: Service[];
  selected: string | null;
  onPick: (s: Service) => void;
}) {
  const categories = ["Barbería", "Estética"] as const;
  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const list = services.filter((s) => s.category === cat && s.active);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <h2 className="mb-2 text-[13px] font-medium text-subtle">{cat}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    className={cn(
                      "group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-raised md:px-5",
                      selected === s.id && "bg-raised",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{s.name}</span>
                        {s.requiresDeposit && <Tag>Con seña</Tag>}
                      </div>
                      <p className="mt-0.5 text-[13.5px] text-muted">{s.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular font-medium text-fg">{fmtMoney(s.price)}</p>
                      <p className="tabular text-[13px] text-subtle">{fmtDuration(s.durationMin)}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function StaffList({
  service,
  selected,
  onPick,
}: {
  service: Service;
  selected: string;
  onPick: (id: string) => void;
}) {
  const data = useDemo((s) => s.data!);
  const now = useNow();
  const members = useMemo(
    () => data.staff.filter((s) => s.active && s.serviceIds.includes(service.id)),
    [data.staff, service.id],
  );

  const nextFree = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of ["any", ...members.map((m) => m.id)]) {
      for (let i = 0; i <= data.business.rules.maxAdvanceDays; i++) {
        const date = addDays(now.date, i);
        const slots = getSlots(data, { date, serviceId: service.id, staffId: id }, now);
        if (slots.length) {
          out[id] = `${fmtRelativeDay(date, now.date)} ${fmtMin(slots[0]!.start)}`;
          break;
        }
      }
    }
    return out;
  }, [data, members, service.id, now]);

  const options = [
    { id: "any", name: "Cualquiera disponible", role: "Te asignamos a quien tenga el horario libre." },
    ...members.map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color })),
  ];

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {options.map((o) => (
        <li key={o.id}>
          <button
            type="button"
            onClick={() => onPick(o.id)}
            className={cn(
              "group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-raised md:px-5",
              selected === o.id && "bg-raised",
            )}
          >
            {o.id === "any" ? (
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-line-strong text-muted">
                <Users className="size-4" aria-hidden />
              </span>
            ) : (
              <Avatar name={o.name} color={"color" in o ? o.color : undefined} size={40} />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-fg">{o.name}</p>
              <p className="text-[13.5px] text-muted">{o.role}</p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-[12px] text-subtle">Próximo libre</p>
              <p className="tabular text-[13.5px] font-medium text-fg">{nextFree[o.id] ?? "Sin horarios"}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Confirmation({ booking: initial }: { booking: Booking }) {
  const data = useDemo((s) => s.data!);
  const booking = data.bookings.find((b) => b.id === initial.id) ?? initial;
  const service = data.services.find((s) => s.id === booking.serviceId)!;
  const member = data.staff.find((s) => s.id === booking.staffId)!;
  const customer = data.customers.find((c) => c.id === booking.customerId)!;
  const chat = chatFor(data, booking.id);
  const confirmation = messageBody(data, booking, "confirmacion");

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
      <div className="animate-step">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-ok/12 text-ok">
          <Check className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance md:text-[40px]">
          Listo, {firstName(customer.name)}. Te esperamos {fmtWhen(booking.date)} a las {fmtMin(booking.start)}.
        </h1>
        <p className="mt-3 max-w-prose text-[15px] text-muted">
          Te mandamos la confirmación por WhatsApp al {fmtPhone(customer.phone)} y te vamos a recordar el turno antes de
          que llegue.
        </p>

        <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6 text-sm">
          <div>
            <dt className="text-[12px] text-subtle">Servicio</dt>
            <dd className="mt-0.5 font-medium">{service.name}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-subtle">Profesional</dt>
            <dd className="mt-0.5 font-medium">{member.name}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-subtle">Fecha</dt>
            <dd className="mt-0.5 font-medium">{fmtDateLong(booking.date, true)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-subtle">Horario</dt>
            <dd className="tabular mt-0.5 font-medium">
              {fmtMin(booking.start)} a {fmtMin(booking.end)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-subtle">Total</dt>
            <dd className="tabular mt-0.5 font-medium">
              {fmtMoney(booking.price)}
              {booking.deposit.amount > 0 && (
                <span className="ml-1 font-normal text-muted">(seña {fmtMoney(booking.deposit.amount)} pagada)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-subtle">Código</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium tracking-wider">{booking.code}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadIcs(`turno-${booking.code}.ics`, bookingIcs(data, booking))}
          >
            <CalendarPlus className="size-4" aria-hidden />
            Agregar al calendario
          </Button>
          <ButtonLink href={`/reserva/${booking.code}`} variant="secondary">
            <Settings2 className="size-4" aria-hidden />
            Reprogramar o cancelar
          </ButtonLink>
          <ButtonLink href={waLink(confirmation, customer.phone)} variant="ghost">
            <MessageCircle className="size-4" aria-hidden />
            Abrir en mi WhatsApp
          </ButtonLink>
        </div>

        <div className="mt-12 max-w-xl rounded-xl border border-accent/30 bg-accent/[0.07] p-5">
          <p className="text-[15px] font-medium text-fg">Ahora mirá el otro lado.</p>
          <p className="mt-1 text-sm text-muted">
            Tu reserva ya está en la agenda de {data.business.name}, con los recordatorios en la cola de envío.
          </p>
          <ButtonLink href={`/panel/agenda?fecha=${booking.date}&turno=${booking.id}`} className="mt-4">
            <LayoutDashboard className="size-4" aria-hidden />
            Ver la reserva en el panel
          </ButtonLink>
        </div>
      </div>

      <div className="lg:pt-2">
        <p className="mb-3 text-[13px] font-medium text-subtle">Lo que te llega por WhatsApp</p>
        <WhatsAppPreview businessName={data.business.name} messages={chat} />
      </div>
    </div>
  );
}
