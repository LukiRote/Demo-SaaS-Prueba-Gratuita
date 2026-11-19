import { z } from "zod";

/**
 * Normaliza celulares argentinos a E.164 móvil (+549 + área + número, 10 dígitos nacionales).
 * Acepta "11 5555-0123", "011 15 5555 0123", "+54 9 11 5555 0123", etc.
 */
export function normalizeArPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  // Quita el "15" de celulares escritos a la vieja usanza (área de 2 a 4 dígitos + 15).
  for (const areaLen of [2, 3, 4]) {
    if (d.length === 12 && d.slice(areaLen, areaLen + 2) === "15") {
      d = d.slice(0, areaLen) + d.slice(areaLen + 2);
      break;
    }
  }
  // Los códigos de área argentinos empiezan con 1, 2 o 3.
  if (!/^[123]\d{9}$/.test(d)) return null;
  return `+549${d}`;
}

const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `Máximo ${max} caracteres.`));

export const customerFormSchema = z.object({
  name: cleanText(60).pipe(
    z
      .string()
      .min(2, "Escribí tu nombre y apellido.")
      .regex(/^[\p{L}][\p{L}\s'.-]*$/u, "Usá solo letras."),
  ),
  phone: z
    .string()
    .max(30, "Número demasiado largo.")
    .transform((s, ctx) => {
      const n = normalizeArPhone(s);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Usá un celular argentino, ej. 11 5555-0123." });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((s) => s === "" || z.email().safeParse(s).success, "Revisá el email.")
    .optional()
    .transform((s) => s || undefined),
  notes: cleanText(280).optional().transform((s) => s || undefined),
});

export type CustomerForm = { name: string; phone: string; email?: string; notes?: string };

export const serviceSchema = z.object({
  name: cleanText(50).pipe(z.string().min(2, "Ponele un nombre.")),
  description: cleanText(140),
  category: z.enum(["Barbería", "Estética"]),
  durationMin: z.number().int().min(10).max(240),
  price: z.number().int().min(0, "El precio no puede ser negativo.").max(5_000_000),
  requiresDeposit: z.boolean(),
});

export const templateSchema = cleanText(600);

export const blockSchema = z
  .object({
    staffId: z.string().nullable(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startMin: z.number().int().min(0).max(1440).optional(),
    endMin: z.number().int().min(0).max(1440).optional(),
    kind: z.enum(["feriado", "vacaciones", "descanso", "otro"]),
    reason: cleanText(60).pipe(z.string().min(2, "Escribí un motivo.")),
  })
  .refine((b) => b.to >= b.from, { message: "La fecha final es anterior a la inicial.", path: ["to"] })
  .refine((b) => b.startMin === undefined || (b.endMin !== undefined && b.endMin > b.startMin), {
    message: "La hora final tiene que ser posterior.",
    path: ["endMin"],
  });

export function firstError(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
