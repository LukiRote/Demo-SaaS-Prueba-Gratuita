import { cn } from "@/lib/format";

/** Marca de Kaelop: dos trazos que forman una K abierta. */
export function KaelopMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#6366F1" />
      <path d="M8 6.5v11" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.5 6.5 10.6 12l5.9 5.5" stroke="#A78BFA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function KaelopWordmark({ className, product = true }: { className?: string; product?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]", className)}>
      <KaelopMark />
      <span>
        Kaelop{product && <span className="font-normal text-muted"> Turnos</span>}
      </span>
    </span>
  );
}

/** Logo del negocio ficticio: una navaja plegable de perfil. */
export function NavajaMark({ className, accent = "var(--accent)" }: { className?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-11", className)} aria-hidden>
      <rect width="48" height="48" rx="12" fill="var(--raised)" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="11.5" fill="none" stroke="var(--line-strong)" />
      {/* hoja */}
      <path d="M13 27.5c6.5-.4 15.6-3.6 22.6-10.6.6-.6 1.6-.2 1.5.7-.6 5.6-6.3 10.6-14.8 11.6l-9.3.9Z" fill="var(--fg)" opacity=".92" />
      {/* mango */}
      <path d="M11 29.2 30.8 27c1.4-.2 2.4 1.4 1.5 2.5l-1.1 1.3c-.4.5-1 .8-1.6.8l-17.8.6a1.6 1.6 0 0 1-.8-3Z" fill={accent} />
      <circle cx="14.2" cy="29.6" r="1.3" fill="var(--raised)" />
    </svg>
  );
}
