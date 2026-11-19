"use client";

import { CheckCheck, Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { fmtMin, nowWall } from "@/lib/time";

export interface ChatMessage {
  id: string;
  body: string;
  /** Hora a mostrar, ej. "14:32" o "mañana 10:30" */
  time: string;
  status: "enviado" | "programado" | "cancelado";
  label?: string;
}

/** Linkifica URLs sin HTML: devuelve nodos de texto y <a>. */
function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} className="break-all text-[#53bdeb] underline-offset-2 hover:underline">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/**
 * Vista previa de la conversación de WhatsApp tal como la vería el cliente.
 * La primera vez muestra "escribiendo…" y el mensaje entra con el único movimiento autorado de la app.
 */
export function WhatsAppPreview({
  businessName,
  messages,
  animate = true,
  className,
  compact,
}: {
  businessName: string;
  messages: ChatMessage[];
  animate?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [typing, setTyping] = useState(animate);
  const body = useRef<HTMLDivElement>(null);
  // En la versión compacta, mostrar siempre el último mensaje.
  useEffect(() => {
    if (compact && body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [compact, messages.length, typing]);
  useEffect(() => {
    if (!animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setTyping(false), reduce ? 0 : 1100);
    return () => clearTimeout(t);
  }, [animate]);

  const clock = fmtMin(nowWall().min);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border border-line-strong bg-[var(--chat-bg)] text-[#e9edef]",
        className,
      )}
      role="group"
      aria-label={`Vista previa del chat de WhatsApp con ${businessName}`}
    >
      <div className="flex items-center gap-3 border-b border-white/5 bg-[#1a2420] px-4 py-3">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#2a3a33] text-[13px] font-semibold">
          {businessName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{businessName}</p>
          <p className="text-[11px] text-[#8fa59b]">{typing ? "escribiendo…" : "cuenta de empresa"}</p>
        </div>
        {!compact && <span className="tabular text-[11px] text-[#8fa59b]">{clock}</span>}
      </div>

      <div
        ref={body}
        className={cn("flex flex-col gap-2 px-3 py-4", compact ? "max-h-72 overflow-y-auto" : "min-h-56")}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.035) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      >
        {typing ? (
          <div className="animate-typing flex w-fit gap-1 rounded-2xl rounded-tl-sm bg-[var(--chat-in)] px-3.5 py-3" aria-label="Escribiendo">
            <span className="size-1.5 rounded-full bg-[#8fa59b]" />
            <span className="size-1.5 rounded-full bg-[#8fa59b]" />
            <span className="size-1.5 rounded-full bg-[#8fa59b]" />
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id}
              className={cn("max-w-[88%]", animate && "animate-bubble")}
              style={animate ? { animationDelay: `${i * 140}ms` } : undefined}
            >
              {m.label && (
                <p className="mb-1 flex items-center gap-1 px-1 text-[11px] text-[#8fa59b]">
                  {m.status === "programado" && <Clock3 className="size-3" aria-hidden />}
                  {m.label}
                </p>
              )}
              <div
                className={cn(
                  "rounded-2xl rounded-tl-sm px-3 pt-2 pb-1.5 text-[13.5px] leading-[1.45] whitespace-pre-wrap",
                  m.status === "programado" ? "border border-dashed border-white/15 bg-[var(--chat-in)]/60" : "bg-[var(--chat-in)]",
                  m.status === "cancelado" && "opacity-50 line-through decoration-white/30",
                )}
              >
                {linkify(m.body)}
                <span className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-[#8fa59b]">
                  <span className="tabular">{m.time}</span>
                  {m.status === "enviado" && <CheckCheck className="size-3.5 text-[#53bdeb]" aria-label="Entregado" />}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
