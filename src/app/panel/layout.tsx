import type { Metadata } from "next";
import { DemoGate } from "@/components/demo-gate";
import { PanelShell } from "@/components/panel/panel-shell";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel · Kaelop Turnos" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoGate>
      <PanelShell>{children}</PanelShell>
    </DemoGate>
  );
}
