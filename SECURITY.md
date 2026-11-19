# Seguridad

## Modelo de amenazas de la demo

La demo es pública y no tiene backend: todo corre en el navegador del visitante y sus datos quedan en su `localStorage`. No hay base de datos compartida, cuentas, secretos ni APIs de terceros. Las medidas apuntan a que el sitio no sirva como vector contra quien lo visita y a que nadie vea datos de otro visitante.

## Medidas implementadas

- **Content Security Policy** (`next.config.ts`): `default-src 'self'`, sin orígenes externos para scripts, estilos, fuentes ni conexiones; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Next.js necesita `'unsafe-inline'` en `script-src` para sus scripts de hidratación en páginas estáticas.
- **Cabeceras**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva, `Cross-Origin-Opener-Policy: same-origin`, HSTS y sin `X-Powered-By`.
- **Entradas**: todas las entradas pasan por Zod con largo máximo, recorte de caracteres de control y normalización. Los celulares se normalizan a E.164 argentino.
- **Salida**: nada se renderiza con `dangerouslySetInnerHTML`. Las plantillas de WhatsApp reemplazan solo variables de una lista blanca y se muestran como texto. Los links se construyen con `encodeURIComponent`, y el archivo `.ics` escapa cada campo.
- **Datos**: el estado persistido se valida al cargar (versión y forma); si está corrupto o es viejo se descarta y se vuelve a sembrar. Si `localStorage` no está disponible, se usa memoria.
- **Privacidad**: los links de gestión y el panel llevan `noindex`. En clientes ficticios, WhatsApp se abre sin destinatario para no escribirle a números que podrían ser reales. Nunca se piden datos de tarjeta: la seña es simulada.
- **Códigos de reserva**: 8 caracteres de un alfabeto de 31 (unos 40 bits) generados con `crypto.getRandomValues`.
- **Límites**: tope de 25 reservas online por visitante por día, para no llenar el almacenamiento.
- **Cadena de suministro**: CI con lint, tipos, tests, `npm audit --audit-level=high` y build; Dependabot semanal.

## En una versión con backend

Validación del lado del servidor con los mismos esquemas, RLS por negocio, rate limiting por IP, CAPTCHA en la reserva pública, verificación por WhatsApp antes de mostrar datos de una reserva, nonces en la CSP y secretos solo en variables de entorno del servidor.

## Reportar un problema

Escribí a Kaelop por el canal de contacto de la agencia. No abras un issue público con detalles de una vulnerabilidad.
