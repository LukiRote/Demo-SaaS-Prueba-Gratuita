import { ArrowRight, CheckCheck, LayoutDashboard, Smartphone } from "lucide-react";
import Link from "next/link";
import { KaelopWordmark } from "@/components/brand";

const AGENCY_URL = process.env.NEXT_PUBLIC_AGENCY_URL;

const FEATURES: [string, string][] = [
  ["Reserva online en 4 pasos", "Servicio, profesional, día y hora, datos. Sin registrarse, desde el celular."],
  ["WhatsApp automático", "Confirmación al instante y recordatorios 24 h y 2 h antes, con plantillas editables."],
  ["Agenda por profesional", "Vista del día con cada barbero en su columna, horarios partidos y descansos."],
  ["Reglas que evitan huecos", "Buffer entre turnos, anticipación mínima y máxima, política de cancelación."],
  ["Bloqueos y feriados", "Vacaciones de un profesional o el local cerrado: la disponibilidad se ajusta sola."],
  ["Seña y clientes", "Seña opcional por servicio e historial de visitas y gasto de cada cliente."],
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <KaelopWordmark />
        {AGENCY_URL && (
          <a href={AGENCY_URL} className="text-sm text-muted hover:text-fg" rel="noopener">
            kaelop
          </a>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-8">
        <section className="grid items-center gap-12 pt-8 pb-16 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16 lg:pb-24">
          <div>
            <h1 className="font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[52px] lg:text-[64px]">
              Turnos que se reservan solos y se recuerdan por WhatsApp.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
              Esta es una demo funcionando de verdad. Sacá un turno en <span className="text-fg">Navaja Studio</span>, una
              barbería ficticia, y después abrí el panel del dueño para verlo llegar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/r/navaja"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-medium text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_10px_24px_-12px_var(--accent)] transition-colors hover:bg-accent-hi"
              >
                <Smartphone className="size-4" aria-hidden />
                Reservar como cliente
              </Link>
              <Link
                href="/panel"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-raised px-5 text-[15px] font-medium transition-colors hover:bg-raised-hi"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Abrir el panel del negocio
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-subtle">
              Sin registro. Lo que cargues queda solo en tu navegador y la demo se reinicia sola.
            </p>
          </div>

          <HeroDiagram />
        </section>

        <section className="border-t border-line py-14 md:py-20" aria-labelledby="features">
          <h2 id="features" className="max-w-xl font-display text-[28px] leading-tight font-semibold tracking-[-0.025em] md:text-[34px]">
            Lo que podés probar en la demo
          </h2>
          <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, body]) => (
              <div key={title}>
                <dt className="font-medium text-fg">{title}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[13px] text-subtle sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>Un proyecto de Kaelop, estudio de desarrollo web. Negocio, personas y datos ficticios.</span>
          <span>Next.js · TypeScript · Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}

/** La misma reserva vista de los dos lados: el horario que elige el cliente aparece en la agenda. */
function HeroDiagram() {
  const times = ["10:00", "10:35", "11:15", "12:00", "15:00", "15:45", "16:30", "17:15"];
  return (
    <div className="relative" aria-hidden>
      <div className="grid grid-cols-[1fr_1.15fr] gap-3">
        <div className="rounded-2xl border border-line-strong bg-surface p-4 shadow-panel">
          <p className="text-[11px] text-subtle">Cliente · jueves</p>
          <p className="mt-0.5 text-sm font-medium">Corte + barba</p>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {times.map((t) => (
              <span
                key={t}
                className={
                  t === "15:45"
                    ? "tabular flex h-8 items-center justify-center rounded-md bg-accent text-[13px] font-medium text-white"
                    : "tabular flex h-8 items-center justify-center rounded-md border border-line-strong text-[13px] text-muted"
                }
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[var(--chat-in)] px-3 py-2 text-[12px] leading-snug text-[#e9edef]">
            ¡Hola Juan! Tu turno quedó confirmado para el jueves a las 15:45 ✂️
            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8fa59b]">
              15:02 <CheckCheck className="size-3 text-[#53bdeb]" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line-strong bg-surface p-4 shadow-panel">
          <p className="text-[11px] text-subtle">Panel · agenda de hoy</p>
          <div className="mt-3 grid grid-cols-[28px_1fr_1fr] gap-x-1.5 text-[11px]">
            {["15", "16", "17"].map((h, row) => (
              <div key={h} className="contents">
                <span className="tabular pt-0.5 text-subtle">{h}:00</span>
                <div className="relative h-14 border-t border-line">
                  {row === 0 && (
                    <span className="absolute inset-x-0 top-1 h-6 rounded-md bg-raised-hi px-1.5 pt-1 text-muted">Facundo</span>
                  )}
                  {row === 0 && (
                    <span className="absolute inset-x-0 top-[38px] h-[52px] rounded-md bg-accent/20 px-1.5 pt-1 font-medium text-fg ring-1 ring-accent">
                      Juan · nuevo
                    </span>
                  )}
                  {row === 2 && <span className="absolute inset-x-0 top-2 h-8 rounded-md bg-raised-hi px-1.5 pt-1 text-muted">Paula</span>}
                </div>
                <div className="relative h-14 border-t border-line">
                  {row === 0 && <span className="hatch absolute inset-x-0 top-0 h-14 rounded-md" />}
                  {row === 1 && <span className="absolute inset-x-0 top-3 h-9 rounded-md bg-raised-hi px-1.5 pt-1 text-muted">Bruno</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[11px]">
            <span className="text-subtle">Recordatorio 24 h</span>
            <span className="text-fg">programado</span>
          </div>
        </div>
      </div>
      <span className="absolute top-1/2 left-[46%] hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-bg text-accent sm:inline-flex">
        <ArrowRight className="size-4" />
      </span>
    </div>
  );
}
