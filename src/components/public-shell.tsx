"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useDemo } from "@/lib/store";
import { KaelopMark } from "./brand";

/** Envoltorio de las páginas que ve el cliente final: aplica tema y color del negocio. */
export function PublicShell({ children }: { children: ReactNode }) {
  const business = useDemo((s) => s.data!.business);
  const style = {
    "--accent": business.accent,
    "--accent-hi": `color-mix(in oklab, ${business.accent} 82%, white)`,
  } as CSSProperties;

  return (
    <div data-theme={business.publicTheme} style={style} className="flex min-h-dvh flex-col bg-bg text-fg">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-3 px-4 text-[12.5px] md:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-muted hover:text-fg">
            <KaelopMark className="size-4" />
            <span className="truncate">
              Demo de Kaelop Turnos · <span className="text-fg">vista del cliente</span>
            </span>
          </Link>
          <Link href="/panel" className="flex shrink-0 items-center gap-1 font-medium text-fg hover:underline">
            Ver el panel del negocio
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-[12.5px] text-subtle md:px-8">
          <span>Negocio y datos ficticios. Lo que cargues queda solo en este navegador.</span>
          <Link href="/" className="flex items-center gap-1.5 hover:text-fg">
            Reservas con <span className="font-medium text-muted">Kaelop Turnos</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
