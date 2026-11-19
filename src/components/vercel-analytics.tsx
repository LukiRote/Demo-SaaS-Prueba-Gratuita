import Script from "next/script";

/**
 * Vercel Web Analytics sin dependencias: el script lo sirve Vercel desde el mismo dominio
 * (/_vercel/insights), así que la CSP no necesita orígenes externos. No usa cookies y
 * sigue solo las navegaciones entre páginas. Se carga únicamente en el deploy de producción.
 */
export function VercelAnalytics() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <>
      <Script id="va-init" strategy="afterInteractive">
        {"window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};"}
      </Script>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
    </>
  );
}
