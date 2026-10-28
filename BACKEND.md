# Backend de La Casa de los Vientos: lo que el front espera

Documento de traspaso para quien arme el backend (otro proyecto, otro chat). Resume el contrato que el front ya tiene
escrito. Los tipos exactos están en `src/api/contract.ts` (fuente de verdad); si este archivo y los tipos discrepan, mandan los tipos.

## Contexto

- Sitio de una hostería en San Carlos, Valle Calchaquí, Salta (Argentina). Front: React + Vite + TypeScript + Tailwind v4. Idiomas: `es`, `en`, `fr`, `pt-BR`.
- **El backend cubre solo dos cosas:** las fotos (`GET /api/photos`) y el contacto (`POST /api/contact`). Nada más.
- **No hay backend de disponibilidad, bloqueos, precios ni panel de admin.** La disponibilidad la manejan los dueños a mano por WhatsApp.
- **El hero NO usa el backend:** su formulario valida y abre WhatsApp (`wa.me`) con el mensaje armado en el navegador.
- El backend vive en un proyecto aparte: **no se agrega al repo del front** (sin Express, MongoDB ni nada de servidor acá).

## 1. Fotos: `GET /api/photos`

- **Recibe:** nada (sin parámetros ni cuerpo).
- **Responde:** HTTP `200`, JSON. Un **arreglo** de `PhotoData` directo, sin envolverlo en `{ data: [...] }`. El orden no importa.

```json
[
  {
    "id": "rooms/01-sonqoy/01",
    "width": 3000,
    "height": 2000,
    "files": {
      "avif": [{ "url": "https://…/01-480.avif", "width": 480 }],
      "webp": [
        { "url": "https://…/01-480.webp",  "width": 480 },
        { "url": "https://…/01-800.webp",  "width": 800 },
        { "url": "https://…/01-1200.webp", "width": 1200 }
      ]
    }
  }
]
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Tiene que coincidir **exacto** con los ids de abajo. |
| `width`, `height` | number | Tamaño del **original** en píxeles. Reserva el lugar de la imagen (evita saltos de layout). |
| `files.webp` / `avif` / `jpeg` | `{ url, width }[]` | Los tres son opcionales, pero tiene que haber al menos uno. `width` es el ancho **real** del archivo. `url` puede ser relativa o completa. |

### Cómo usa el front los archivos

- Arma un `<picture>` con `srcset` (`url 480w, url 800w…`) y `sizes`. El navegador elige solo el archivo según el ancho en pantalla × la densidad (un celular de 390 px baja el de 480 u 800, no el de 1200). Por eso `width` tiene que ser el real: si se declara mal, el navegador elige mal.
- Formato: usa AVIF primero si hay; si no, WebP; si no, JPEG. **Solo con WebP funciona igual.**
- **Anchos a generar:**
  - Habitaciones, instalaciones y Conocenos: **480, 800 y 1200** px.
  - `hero` (ocupa todo el ancho): **640, 960, 1280, 1600 y 1920** px.
- Quitar los metadatos EXIF (incluido el GPS) y respetar la rotación EXIF de los celulares. Los HEIC de iPhone convertirlos a JPG antes de procesar.

### Ids que el front pide

Siempre con 2 dígitos (`01`, no `1`).

| Zona | Ids |
|---|---|
| Hero | `hero` |
| Conocenos (3 fotos) | `about/01` … `about/03` |
| Habitaciones (6 fotos cada una) | `rooms/<carpeta>/01` … `/06`, con las carpetas `01-sonqoy`, `02-el-fuego`, `03-los-buhos`, `04-el-amanecer`, `05-los-teros`, `06-el-atardecer`, `07-huayra-huasi` |
| Instalaciones (5 fotos cada una) | `facilities/<carpeta>/01` … `/05`, con las carpetas `patios`, `desayunador`, `pileta`, `anfitriones` |

Total esperado: 1 + 3 + 42 + 20 = 66 fotos. Salen de `src/data/rooms.ts`, `src/data/facilities.ts` y `src/data/photoIds.ts`.

### Qué hace el front según lo que llegue

- Foto sin datos para un id: queda un placeholder gris en ese lugar; el resto anda igual.
- Un lugar (habitación o instalación) con **0** fotos: placeholder. Con **1**: la foto sola. Con **2 o más**: carrusel (flechas, contador, deslizar). Hoy el carrusel **no da la vuelta** (se apagan las flechas en los extremos) y el click en la foto no abre nada.
- Status distinto de 200, JSON roto o corte de red: todas quedan en placeholder y la página sigue funcionando (en desarrollo hay un `console.warn`).
- Mientras la API no responde, los placeholders pulsan. Cuando responde, cada imagen aparece con un fundido al terminar de bajar.

### Recomendaciones

- `Cache-Control` largo para los archivos de imagen (URLs estables o con hash).
- **Hero:** la foto llega por la API, así que su descarga espera: JS → render → API → imagen. Eso retrasa el LCP. Lo mejor es servir la foto del hero también como **archivo estático con URL estable** (el front le puede poner `<link rel="preload" as="image">` en `index.html`), y el resto por la API.
- Lo que falta del lado del front: `loadPhotos` en `src/api/photos.ts` devuelve `[]` con un `TODO`. Ahí va el `fetch('/api/photos', { signal })`, controlando `res.ok` (`fetch` no falla con un 404 o 500) y devolviendo el `res.json()`.

## 2. Contacto: `POST /api/contact`

- **Recibe** `Content-Type: application/json`:

```json
{
  "name": "Ana Pérez",
  "email": "ana@correo.com",
  "phone": "+54 9 3868 46-3838",
  "message": "Quisiera consultar por una estadía en diciembre.",
  "language": "es",
  "subject": "Consulta desde la web"
}
```

| Campo | Reglas |
|---|---|
| `name` | string, 2 a 100 caracteres (el front manda el texto sin espacios en los bordes). |
| `email` | string, email válido, hasta 254. |
| `phone` | **Opcional**, hasta 30. Si está vacío, el campo no llega. |
| `message` | string, 10 a 2000 caracteres. |
| `language` | `"es"`, `"en"`, `"fr"` o `"pt-BR"`: el idioma activo de la página. |
| `subject` | Siempre `"Consulta desde la web"`. |
| `website` | **Honeypot**, opcional. El formulario real nunca lo manda (un bot sí). Si llega con algo: responder `200 { "ok": true }` y descartar sin enviar nada. |

Los límites están en `CONTACT_LIMITS` (`src/api/contract.ts`). Se repiten en el servidor: lo que valida el navegador se puede saltear.

- **Responde:** JSON (`ContactResponse`).

| Caso | HTTP | Cuerpo |
|---|---|---|
| Enviado | `200` | `{ "ok": true }` |
| Datos inválidos | `400` | `{ "ok": false, "error": "invalid", "fields": ["email"] }` (`fields` es opcional) |
| Demasiados envíos | `429` | `{ "ok": false, "error": "rate_limited" }` |
| No se pudo enviar | `503` | `{ "ok": false, "error": "unavailable" }` |

- El front **solo confía en esos cuerpos.** Un cuerpo distinto, una página de error de un proxy, un corte de red o más de **15 segundos** sin respuesta se tratan como `unavailable`: nunca muestra «enviado» sin confirmación. Por eso: **responder `200` únicamente cuando el proveedor de mail ya aceptó el mensaje.**
- Ante un error, el front muestra un aviso con enlace a WhatsApp y el correo de la hostería como alternativa.

### Qué debería hacer el backend con este POST

1. Limitar el tamaño del cuerpo (unos pocos KB alcanzan).
2. Honeypot primero (ver `website` arriba).
3. Validar de nuevo siempre: mismos límites, email válido, tipos correctos.
4. Anti-spam: límite por IP (y quizá por email) con `429`, chequeo de la cabecera `Origin` y, si hace falta, un captcha.
5. Enviar el mail con un proveedor. **El destino vive solo en el servidor** (hoy el correo público es `reservas@casadelosvientos.com.ar`, en `src/data/siteConfig.ts`; confirmar con los dueños adónde deben llegar las consultas). Asunto = el recibido; cuerpo en texto plano con los datos y el idioma. `From` de tu dominio (SPF/DKIM, para no caer en spam) y el email del visitante en `Reply-To`. Sacar los saltos de línea de `name` y `email` antes de usarlos en cabeceras (inyección).
6. Responder `200` solo si el proveedor aceptó el mail; si falla, `503`. No devolver detalles internos.

## Para las dos rutas

- **CORS:** lo más simple es servir el sitio y la API desde el **mismo origen** (con un proxy). Si son distintos: responder `OPTIONS` y `Access-Control-Allow-Origin` con el dominio exacto del sitio (**no `*`**); el `Content-Type: application/json` hace que el navegador pregunte antes con un `OPTIONS`.
- Cuidado en desarrollo: los navegadores bloquean algunos puertos (por ejemplo el 4190). Usar uno común (3000, 3001, 8080…).
- El front de desarrollo corre en `http://localhost:5173` (`npm run dev`) y **no tiene proxy configurado** en `vite.config.ts`; con un backend en otro puerto hace falta CORS o agregar un `server.proxy`.

## Variables de entorno del front

Hoy hay **una sola**: `VITE_CONTACT_ENDPOINT`, la URL completa del POST de contacto (relativa, como `/api/contact`, o `https://…`).

- Vite la escribe en el JS **al compilar**: nunca poner claves secretas en variables `VITE_`, y si se cambia hay que volver a compilar y desplegar.
- Sin ella: en desarrollo el formulario se ve con el botón deshabilitado y un `console.warn`; en producción **el formulario no se muestra**.
- Para las fotos todavía no hay variable: `loadPhotos` usaría una ruta fija `/api/photos` o una variable nueva. Hay que decidirlo al conectar.

## Cómo probar el front contra un backend local

1. Levantar un servidor que cumpla este contrato (con CORS si es otro puerto/origen).
2. Contacto: compilar o correr con `VITE_CONTACT_ENDPOINT=http://localhost:PUERTO/api/contact` (en `.env`, ver `.env.example`).
3. Fotos: implementar `loadPhotos` y servir las imágenes con los anchos reales. Para ver el carrusel necesitan llegar 2 o más fotos del mismo lugar.
4. Verificar en DevTools → Network que cada resolución baje un archivo distinto (por ejemplo a 390 px y a 1440 px).

## Pendientes del front que dependen de estos datos

- `loadPhotos` (`src/api/photos.ts`): escribir el `fetch` real.
- Línea de privacidad del formulario de contacto: el texto definitivo está con `TODO` (qué se hace con los datos del mensaje).
- Opcional: preload de la foto del hero como archivo estático; carrusel circular o visor grande al hacer click (se hablaron, no se pidieron todavía).

## Referencias dentro del repo

- `src/api/contract.ts`: tipos y constantes del contrato (`PhotoData`, `ContactRequest`, `ContactResponse`, `CONTACT_LIMITS`).
- `src/lib/contactClient.ts`: cómo el front arma el POST y lee la respuesta (`parseContactResponse`).
- `src/api/photos.ts`: el único lugar donde se piden las fotos.
- `README.md`: arranque, variable de entorno y contrato de contacto (resumen).
- `CLAUDE.md`: convenciones y decisiones del proyecto.
