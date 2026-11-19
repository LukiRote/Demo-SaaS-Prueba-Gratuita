# Kaelop Turnos

Demo de un SaaS de turnos y reservas con confirmación y recordatorios por WhatsApp. Es un proyecto de portafolio de **Kaelop**.

El negocio de ejemplo es **Navaja Studio**, una barbería y estética ficticia de Palermo con cuatro profesionales, ocho servicios y unas seis semanas de agenda generadas.

- **Vista pública** (`/r/navaja`): el cliente elige servicio, profesional o "cualquiera disponible", día y horario, completa sus datos y, si el servicio lo pide, paga una seña simulada. Recibe la confirmación como vista previa de WhatsApp.
- **Link de gestión** (`/reserva/{código}`): reprogramar o cancelar respetando la política de anticipación del negocio.
- **Panel** (`/panel`): inicio con métricas, agenda por profesional, reservas, clientes con historial, servicios, equipo con horarios propios, horarios y reglas, bloqueos, cola de mensajes y plantillas, y ajustes de marca.

> Probalo de punta a punta: reservá en `/r/navaja` y abrí `/panel` en otra pestaña. La reserva aparece al instante marcada como **Nuevo**, porque las pestañas se sincronizan.

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript estricto |
| Estilos | Tailwind CSS 4 con tokens propios (paleta Kaelop) |
| Estado | Zustand con persistencia en `localStorage` |
| Validación | Zod |
| Íconos | Lucide |
| Tests | Vitest |
| Deploy | Vercel (estático, sin variables de entorno obligatorias) |

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # motor de disponibilidad, mensajes y validaciones
npm run build
```

Variable opcional: `NEXT_PUBLIC_AGENCY_URL` agrega un link a la web de la agencia en la portada.

### Deploy en Vercel

1. Subí el repo a GitHub.
2. En Vercel: **Add New → Project**, importá el repo y dejá los valores por defecto. No hace falta configurar nada más.
3. Opcional: cargá `NEXT_PUBLIC_AGENCY_URL` en *Settings → Environment Variables* y asigná un dominio (ej. `turnos.kaelop.com`).

## Arquitectura

```
src/
├─ app/
│  ├─ page.tsx                 Portada de la demo
│  ├─ r/[slug]/                Vista pública de reserva
│  ├─ reserva/[code]/          Gestión de una reserva (reprogramar / cancelar)
│  └─ panel/                   Dashboard: inicio, agenda, reservas, clientes,
│                              mensajes, servicios, equipo, horarios, ajustes
├─ components/
│  ├─ booking/                 Flujo público y gestión
│  ├─ panel/                   Shell, detalle de turno, alta manual, gráficos, editor de horarios
│  ├─ slot-picker.tsx          Calendario + horarios (compartido)
│  ├─ whatsapp-preview.tsx     Vista previa del chat
│  └─ ui.tsx                   Botones, campos, diálogos nativos, pestañas
└─ lib/
   ├─ types.ts                 Modelo de datos
   ├─ time.ts                  Fechas en hora de pared del negocio
   ├─ availability.ts          Motor de disponibilidad (puro, testeado)
   ├─ messages.ts              Plantillas, programación de recordatorios, wa.me, .ics
   ├─ seed.ts                  Generador determinista de la demo
   ├─ store.ts                 Store + reglas de negocio (crear, mover, cancelar…)
   └─ validation.ts            Esquemas Zod y normalización de celulares AR
```

### Decisiones clave

**Datos aislados por visitante.** Como la demo es pública, cada visitante recibe su propia copia sembrada en su navegador. Nadie ve los nombres ni teléfonos que cargaron otros, no hay spam posible en una base compartida y no hay backend que mantener ni que se duerma por inactividad. La demo se regenera sola cada 48 h, así la agenda siempre es "de esta semana".

**Hora de pared, no `Date`.** Todo se guarda como fecha ISO + minutos desde la medianoche en la zona del negocio (`America/Argentina/Buenos_Aires`). Un visitante en Madrid ve los mismos horarios que uno en Córdoba, y la aritmética de turnos no tiene bugs de horario de verano.

**Motor de disponibilidad puro.** `getSlots()` cruza el horario del local con el del profesional, descuenta bloqueos de día completo y parciales, ocupa cada turno con su buffer y aplica anticipación mínima y máxima. Con "cualquiera disponible" junta los profesionales que hacen el servicio y asigna al de menor carga del día. La misma función valida de nuevo justo antes de guardar.

**WhatsApp simulado con forma de producción.** Cada reserva genera su confirmación (enviada) y los recordatorios a 24 h y 2 h (programados). Un "cron" en el navegador marca como enviados los que vencen. Reprogramar o cancelar anula los pendientes y encola el aviso correspondiente. Para clientes ficticios, `wa.me` se abre **sin número**, así nunca se le escribe a un teléfono que podría ser de una persona real.

### Modelo de datos

`Business` (horario semanal + reglas), `Service`, `Staff` (horario propio + servicios), `Block` (feriado, vacaciones o descanso; local o profesional; día completo o franja), `Customer`, `Booking` (estado, seña, origen) y `Message` (tipo, horario programado, estado).

## Seguridad

Ver [SECURITY.md](SECURITY.md). En resumen: CSP estricta sin orígenes de terceros, cabeceras de seguridad, validación y límites en todas las entradas, nada se renderiza como HTML, códigos de reserva de 40 bits con `crypto.getRandomValues`, tope de reservas por visitante, sin secretos en el repo, y CI con `npm audit` y Dependabot.

## Camino a producción

La lógica de negocio vive en `lib/` y no depende del almacenamiento, así que pasar a un backend real es reemplazar el store:

1. **Base de datos**: Supabase (Postgres) con una tabla por entidad de `types.ts`, `business_id` en todas y Row Level Security por negocio. La restricción de no superposición se garantiza en la base con `EXCLUDE USING gist (staff_id WITH =, tstzrange(start, end) WITH &&)`.
2. **Auth**: Supabase Auth para dueños y equipo. La reserva pública sigue sin registro, con verificación por código de WhatsApp para gestionar el turno.
3. **WhatsApp**: WhatsApp Cloud API con plantillas aprobadas por Meta. La cola de `messages` la consume un cron (Vercel Cron o Supabase `pg_cron`).
4. **Pagos**: checkout de Mercado Pago o Stripe para la seña, con webhook que confirma la reserva.
5. **Abuso**: rate limiting por IP en la creación de reservas (Upstash) y Turnstile en el formulario público.

---

Proyecto de portafolio de Kaelop. El negocio, las personas y los datos son ficticios.
