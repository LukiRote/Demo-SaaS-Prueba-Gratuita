import type { Metadata } from "next";
import { ManageBooking } from "@/components/booking/manage-booking";
import { DemoGate } from "@/components/demo-gate";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Tu reserva",
  // Los links de gestión son personales: que no aparezcan en buscadores.
  robots: { index: false, follow: false },
};

export default async function ManagePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safe = code.toUpperCase().slice(0, 16);
  return (
    <DemoGate>
      <PublicShell>
        <ManageBooking code={safe} />
      </PublicShell>
    </DemoGate>
  );
}
