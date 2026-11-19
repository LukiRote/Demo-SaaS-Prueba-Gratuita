import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { DemoGate } from "@/components/demo-gate";
import { PublicShell } from "@/components/public-shell";

const DEMO_SLUG = "navaja";

export const metadata: Metadata = {
  title: "Reservá en Navaja Studio",
  description: "Elegí servicio, profesional y horario. Confirmación por WhatsApp al instante.",
};

export function generateStaticParams() {
  return [{ slug: DEMO_SLUG }];
}

export const dynamicParams = false;

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== DEMO_SLUG) notFound();
  return (
    <DemoGate>
      <PublicShell>
        <BookingFlow />
      </PublicShell>
    </DemoGate>
  );
}
