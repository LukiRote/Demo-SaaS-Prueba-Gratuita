import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const fmtMoney = (n: number) => ars.format(n);

const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
export const fmtCompactMoney = (n: number) => `$${compact.format(n)}`;

export const fmtPercent = (n: number) => `${Math.round(n * 100)}%`;

/** +5491155550123 → +54 9 11 5555-0123 */
export function fmtPhone(e164: string): string {
  const m = e164.match(/^\+549(11|\d{3,4})(\d+)$/);
  if (!m) return e164;
  const [, area, rest] = m;
  const cut = rest.length - 4;
  return `+54 9 ${area} ${rest.slice(0, cut)}-${rest.slice(cut)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Une clases y resuelve conflictos de Tailwind (la última gana: `h-10` + `h-8` → `h-8`). */
export function cn(...parts: ClassValue[]) {
  return twMerge(clsx(parts));
}
