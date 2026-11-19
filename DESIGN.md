# Kaelop Turnos — sistema visual

Pantallas de trabajo (modo Operate): precisión y calma antes que expresión. La marca vive en los detalles: el índigo marca lo accionable y "lo nuevo", y nada más.

## Escena
El dueño mira la agenda en la laptop del mostrador o en el celular entre cortes, con luz de local. El cliente reserva de noche desde el link de Instagram. Por eso es oscuro, por la línea Kaelop y por el uso.

## Color (tokens en `src/app/globals.css`)
| Token | Dark | Uso |
|---|---|---|
| `bg` | `#0B0B0F` | Fondo |
| `surface` | `#111118` | Paneles, tablas, sidebar |
| `raised` / `raised-hi` | `#1F1F28` / `#272732` | Hover, selección, chips |
| `line` / `line-strong` | `#22222C` / `#33333F` | Divisores / bordes de controles |
| `fg` / `muted` / `subtle` | `#F8FAFC` / `#A6A6B8` / `#80808F` | Texto |
| `accent` | `#6366F1` (personalizable por negocio en la vista pública) | Acción primaria, selección, "Nuevo", línea de ahora |
| `violet` | `#A78BFA` | Solo en la marca Kaelop |
| `ok` `warn` `bad` | `#34D399` `#FBBF24` `#F87171` | Estados: completado, no asistió, cancelado (siempre con texto) |

El tema claro existe solo para la página pública (`[data-theme="light"]`).

## Tipografía
- **Geist**: UI. Números con `tabular` en horarios, montos y tablas.
- **Geist Mono**: códigos de reserva y variables de plantillas.
- **Bricolage Grotesque**: títulos de la portada y de la vista pública (nombre del negocio y pasos). No se usa en el panel.

## Componentes
Botones de 32, 40 y 48 px con radio de 8 a 12 px. Listas con divisores en lugar de tarjetas sueltas. Diálogos nativos `<dialog>`: centrados para formularios y hoja lateral para el detalle de un turno. Las franjas fuera de horario usan un rayado diagonal (`hatch`).

## Movimiento
Un solo momento autorado: el mensaje de WhatsApp entra con un "escribiendo…" y luego un desenfoque y desplazamiento. Las transiciones de paso usan `fade-up`, de 280 ms. Todo se desactiva con `prefers-reduced-motion`.
