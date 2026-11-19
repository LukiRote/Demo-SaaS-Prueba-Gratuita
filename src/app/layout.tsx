import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/toaster";
import { VercelAnalytics } from "@/components/vercel-analytics";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Kaelop Turnos · Demo", template: "%s · Kaelop Turnos" },
  description:
    "Demo de un SaaS de turnos y reservas con confirmación y recordatorios por WhatsApp. Un proyecto de Kaelop.",
  applicationName: "Kaelop Turnos",
  openGraph: {
    title: "Kaelop Turnos · Demo",
    description: "Reservá como cliente y mirá cómo llega al panel del negocio. Recordatorios por WhatsApp incluidos.",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" data-theme="dark" className={`${geist.variable} ${geistMono.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
        <VercelAnalytics />
      </body>
    </html>
  );
}
