"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Home,
  ListChecks,
  Menu,
  MessageCircle,
  Plus,
  RotateCcw,
  Scissors,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { KaelopMark, NavajaMark } from "@/components/brand";
import { toast } from "@/components/toaster";
import { Button, IconButton, Modal } from "@/components/ui";
import { cn } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { BookingSheet } from "./booking-sheet";
import { NewBookingModal } from "./new-booking";
import { usePanelUI } from "./ui-state";

const NAV = [
  {
    group: null,
    items: [
      { href: "/panel", label: "Inicio", icon: Home },
      { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/panel/reservas", label: "Reservas", icon: ListChecks, badge: true },
      { href: "/panel/clientes", label: "Clientes", icon: Users },
      { href: "/panel/mensajes", label: "Mensajes", icon: MessageCircle },
    ],
  },
  {
    group: "Configuración",
    items: [
      { href: "/panel/servicios", label: "Servicios", icon: Scissors },
      { href: "/panel/equipo", label: "Equipo", icon: UsersRound },
      { href: "/panel/horarios", label: "Horarios y reglas", icon: Clock },
      { href: "/panel/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unseen = useDemo((s) => s.data!.bookings.reduce((n, b) => n + (b.seen ? 0 : 1), 0));
  return (
    <nav className="space-y-6" aria-label="Panel">
      {NAV.map((section, i) => (
        <div key={i}>
          {section.group && <p className="mb-1.5 px-2.5 text-[11.5px] font-medium text-subtle">{section.group}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === "/panel" ? pathname === "/panel" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                      active ? "bg-raised font-medium text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                    )}
                  >
                    <item.icon className={cn("size-4", active ? "text-accent" : "text-subtle")} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && unseen > 0 && (
                      <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                        {unseen}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const reset = useDemo((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-0.5 border-t border-line pt-3">
      <Link
        href="/r/navaja"
        target="_blank"
        className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-muted hover:bg-raised/60 hover:text-fg"
      >
        <ArrowUpRight className="size-4 text-subtle" aria-hidden />
        Página de reservas
      </Link>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] text-muted hover:bg-raised/60 hover:text-fg"
      >
        <RotateCcw className="size-4 text-subtle" aria-hidden />
        Reiniciar demo
      </button>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Reiniciar la demo?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirm(false);
                toast("Demo reiniciada", { body: "Volvió la agenda original de Navaja Studio." });
              }}
            >
              Reiniciar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Se borran las reservas y cambios que hiciste, y se genera una agenda nueva con datos de ejemplo.
        </p>
      </Modal>
    </div>
  );
}

function BusinessBadge() {
  const business = useDemo((s) => s.data!.business);
  return (
    <div className="flex items-center gap-2.5 px-1">
      <NavajaMark className="size-8" />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold">{business.name}</p>
        <p className="text-[11.5px] text-subtle">Plan Pro · demo</p>
      </div>
    </div>
  );
}

export function PanelShell({ children }: { children: ReactNode }) {
  const { navOpen, setNav, openNewBooking } = usePanelUI();
  const pathname = usePathname();

  useEffect(() => setNav(false), [pathname, setNav]);

  // Atajo: N para nueva reserva (fuera de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.closest("input, textarea, select, [contenteditable], dialog")) return;
      e.preventDefault();
      openNewBooking();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewBooking]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-4 lg:flex">
        <BusinessBadge />
        <Button onClick={() => openNewBooking()} className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Plus className="size-4" aria-hidden />
            Nueva reserva
          </span>
          <kbd className="rounded bg-white/15 px-1.5 font-mono text-[11px]">N</kbd>
        </Button>
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <SidebarFooter />
        <Link href="/" className="flex items-center gap-2 px-2.5 text-[12px] text-subtle hover:text-muted">
          <KaelopMark className="size-3.5" />
          Kaelop Turnos
        </Link>
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <IconButton label="Abrir menú" onClick={() => setNav(true)} className="-ml-1.5">
            <Menu className="size-5" />
          </IconButton>
          <BusinessBadge />
        </div>
        <Button size="sm" onClick={() => openNewBooking()}>
          <Plus className="size-4" aria-hidden />
          Reserva
        </Button>
      </div>

      <main className="min-w-0">{children}</main>

      <Modal open={navOpen} onClose={() => setNav(false)} title="Menú" variant="sheet">
        <div className="flex h-full flex-col gap-6">
          <NavList onNavigate={() => setNav(false)} />
          <SidebarFooter />
        </div>
      </Modal>

      <BookingSheet />
      <NewBookingModal />
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line px-4 pt-6 pb-5 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
