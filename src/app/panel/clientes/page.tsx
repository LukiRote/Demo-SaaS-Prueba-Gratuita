"use client";

import { MessageCircle, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useNow } from "@/components/demo-gate";
import { PageHeader } from "@/components/panel/panel-shell";
import { usePanelUI } from "@/components/panel/ui-state";
import { toast } from "@/components/toaster";
import { Avatar, Button, ButtonLink, Empty, Input, Modal, Select, StatusBadge, Tag, Textarea } from "@/components/ui";
import { firstName, fmtMoney, fmtPhone } from "@/lib/format";
import { waLink } from "@/lib/messages";
import { customerStats, type CustomerStats } from "@/lib/stats";
import { useDemo } from "@/lib/store";
import { diffDays, fmtDateShort, fmtMin } from "@/lib/time";
import type { Customer } from "@/lib/types";

type Sort = "visitas" | "gasto" | "reciente" | "nombre";

export default function ClientesPage() {
  const data = useDemo((s) => s.data!);
  const now = useNow();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("visitas");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = data.customers.map((c) => ({ c, s: customerStats(data, c.id, now) }));
    const needle = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const digits = q.replace(/\D/g, "");
    const filtered = list.filter(({ c }) => {
      if (!needle) return true;
      const name = c.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return name.includes(needle) || (digits.length >= 3 && c.phone.includes(digits));
    });
    const key = (x: (typeof list)[number]) =>
      sort === "visitas" ? x.s.visits : sort === "gasto" ? x.s.spent : sort === "reciente" ? (x.s.last ? -diffDays(now.date, x.s.last.date) : -9999) : 0;
    return filtered.sort((a, b) => (sort === "nombre" ? a.c.name.localeCompare(b.c.name, "es") : key(b) - key(a)));
  }, [data, q, sort, now]);

  const open = rows.find((r) => r.c.id === openId);

  return (
    <>
      <PageHeader title="Clientes" sub={`${data.customers.length} clientes · historial de visitas y gasto`}>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
              aria-label="Buscar clientes"
              className="h-8 pl-9 text-[13px]"
              maxLength={60}
            />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar" className="h-8 w-auto text-[13px]">
            <option value="visitas">Más visitas</option>
            <option value="gasto">Mayor gasto</option>
            <option value="reciente">Visita más reciente</option>
            <option value="nombre">Nombre</option>
          </Select>
        </div>
      </PageHeader>

      <div className="px-4 py-4 md:px-8">
        {rows.length === 0 ? (
          <Empty icon={<SearchX className="size-6" />} title="Ningún cliente coincide" body="Probá con parte del nombre o del teléfono." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-[12px] text-subtle">
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 text-right font-medium">Visitas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gasto total</th>
                  <th className="px-4 py-2.5 font-medium">Última visita</th>
                  <th className="px-4 py-2.5 font-medium">Próximo turno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ c, s }) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={() => setOpenId(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenId(c.id)}
                    className="cursor-pointer transition-colors hover:bg-raised/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={30} />
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            {c.name}
                            {s.visits >= 6 && <Tag tone="accent">Frecuente</Tag>}
                            {!c.demo && <Tag>Vos</Tag>}
                          </p>
                          <p className="tabular text-[12.5px] text-subtle">{fmtPhone(c.phone)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular px-4 py-3 text-right">{s.visits}</td>
                    <td className="tabular px-4 py-3 text-right">{fmtMoney(s.spent)}</td>
                    <td className="tabular px-4 py-3 text-muted">
                      {s.last ? `${fmtDateShort(s.last.date)} · hace ${diffDays(now.date, s.last.date)} d` : "—"}
                    </td>
                    <td className="tabular px-4 py-3">
                      {s.next ? `${fmtDateShort(s.next.date)} ${fmtMin(s.next.start)}` : <span className="text-subtle">Sin turno</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <CustomerSheet customer={open.c} stats={open.s} onClose={() => setOpenId(null)} />}
    </>
  );
}

function CustomerSheet({ customer, stats, onClose }: { customer: Customer; stats: CustomerStats; onClose: () => void }) {
  const data = useDemo((s) => s.data!);
  const updateNotes = useDemo((s) => s.updateCustomerNotes);
  const openBooking = usePanelUI((s) => s.openBooking);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const services = new Map(data.services.map((s) => [s.id, s]));
  const staff = new Map(data.staff.map((s) => [s.id, s]));
  const favorite = (() => {
    const count = new Map<string, number>();
    for (const b of stats.history) if (b.status === "completado") count.set(b.serviceId, (count.get(b.serviceId) ?? 0) + 1);
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? services.get(top[0])?.name : undefined;
  })();

  return (
    <Modal open onClose={onClose} variant="sheet" title={customer.name} description={<span className="tabular">{fmtPhone(customer.phone)}</span>}>
      <div className="space-y-6">
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
          {[
            ["Visitas", String(stats.visits)],
            ["Gasto", fmtMoney(stats.spent)],
            ["Ausencias", String(stats.noShows)],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-2 py-3">
              <dt className="text-[12px] text-subtle">{k}</dt>
              <dd className="tabular mt-0.5 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {favorite && (
          <p className="text-sm text-muted">
            Suele pedir <span className="font-medium text-fg">{favorite}</span>.
          </p>
        )}

        <div className="flex gap-2">
          <ButtonLink
            href={waLink(`Hola ${firstName(customer.name)}! Te escribimos de ${data.business.name}. `, customer.demo ? undefined : customer.phone)}
            variant="secondary"
            size="sm"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Escribir por WhatsApp
          </ButtonLink>
        </div>

        <div className="space-y-2">
          <label htmlFor="cust-notes" className="text-[13px] font-medium">
            Notas internas
          </label>
          <Textarea id="cust-notes" value={notes} maxLength={280} onChange={(e) => setNotes(e.target.value)} placeholder="Preferencias, alergias, etc." />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={notes === (customer.notes ?? "")}
              onClick={() => {
                updateNotes(customer.id, notes.trim().slice(0, 280));
                toast("Nota guardada");
              }}
            >
              Guardar nota
            </Button>
          </div>
        </div>

        <section>
          <p className="mb-2 text-[13px] font-medium text-subtle">Historial</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {stats.history.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => openBooking(b.id)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-raised/50"
                >
                  <span className="tabular w-24 shrink-0 text-muted">{fmtDateShort(b.date)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {services.get(b.serviceId)?.name}
                    <span className="text-subtle"> · {firstName(staff.get(b.staffId)?.name ?? "")}</span>
                  </span>
                  <StatusBadge status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
