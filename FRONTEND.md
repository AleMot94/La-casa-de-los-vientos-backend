# Cómo usar el backend desde el front

Guía para conectar el front (`Casa-de-los-vientos`: React + Vite + TypeScript) con este backend. Los tipos exactos del contrato están en
`src/api/contract.ts` del front (`PhotoData`, `ContactRequest`, `ContactResponse`, `CONTACT_LIMITS`); si algo de acá los contradice, mandan los tipos.

El backend tiene **dos endpoints** y nada más:

| Endpoint | Para qué |
|---|---|
| `GET /api/photos` | Todas las fotos, con sus archivos por ancho y formato |
| `POST /api/contact` | Formulario de contacto (guarda la consulta y manda el mail) |

Además sirve los archivos de las fotos como estáticos en `/photos/...`.

---

## 1. Levantarlo

Desde la carpeta del backend (`Backend-casa-de-los-vientos`):

```bash
npm run dev      # servidor en http://localhost:3001 (nodemon, se reinicia al guardar)
```

Tiene que mostrar `MongoDB connected successfully` y `Server is running on port 3001`.

**Las fotos hay que procesarlas una vez** (y de nuevo cuando se agregue o cambie alguna):

```bash
npm run photos   # photos-originals/ → storage/photos/ + datos en Mongo (tarda varios minutos por el AVIF)
```

Sin ese paso `GET /api/photos` responde `[]`. Hoy ya está corrido: **129 fotos** cargadas.

> **Mail:** con `MAIL_DRY_RUN=true` (como está en desarrollo) el formulario responde `200` pero **no sale ningún mail**: el mensaje armado se imprime
> en la consola del backend. El envío real se activa configurando `SMTP_*` en el `.env` del backend y poniendo `MAIL_DRY_RUN=false`.

---

## 2. Cómo conectar front y back (recomendado: mismo origen con proxy de Vite)

En desarrollo el front corre en `http://localhost:5173` y el backend en `http://localhost:3001`. Lo más simple es que el navegador crea que son **el mismo origen**,
con un proxy en `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/photos': 'http://localhost:3001', // los archivos de imagen
    },
  },
})
```

Con eso:

- `fetch('/api/photos')` y `fetch('/api/contact')` funcionan sin CORS.
- Las `url` de las imágenes (`/photos/rooms/01-sonqoy/01-800.webp?v=…`) funcionan tal cual, porque son relativas.
- En el `.env` del front: `VITE_CONTACT_ENDPOINT=/api/contact`.

El proxy vale solo para `npm run dev` del front. En producción lo hace Nginx (ver el final).

**Alternativa: orígenes distintos** (sin proxy). Se usan URLs completas (`http://localhost:3001/api/...`) y el backend ya acepta CORS desde `http://localhost:5173`.
Pero las `url` de las imágenes vienen **relativas** y el navegador las resolvería contra `localhost:5173` → **404**. Para evitarlo, en el `.env` del **backend** se pone
`PUBLIC_BASE_URL=http://localhost:3001` y se reinicia: la API las devuelve absolutas.

---

## 3. `GET /api/photos`

- **Recibe:** nada (ni parámetros ni cuerpo).
- **Responde:** `200` con un **arreglo** de `PhotoData` directo (sin envoltorio `{ data: [...] }`), `Cache-Control: public, max-age=300`.
- Si falla la base: `500` con `{ "error": "internal" }`.

Una foto de una habitación (respuesta real):

```json
{
  "id": "rooms/01-sonqoy/01",
  "width": 1200,
  "height": 800,
  "files": {
    "avif": [
      { "url": "/photos/rooms/01-sonqoy/01-480.avif?v=74b1919c",  "width": 480 },
      { "url": "/photos/rooms/01-sonqoy/01-800.avif?v=74b1919c",  "width": 800 },
      { "url": "/photos/rooms/01-sonqoy/01-1200.avif?v=74b1919c", "width": 1200 }
    ],
    "webp": [
      { "url": "/photos/rooms/01-sonqoy/01-480.webp?v=74b1919c",  "width": 480 },
      { "url": "/photos/rooms/01-sonqoy/01-800.webp?v=74b1919c",  "width": 800 },
      { "url": "/photos/rooms/01-sonqoy/01-1200.webp?v=74b1919c", "width": 1200 }
    ]
  }
}
```

| Campo | Notas |
|---|---|
| `id` | Es el mismo id que usan `Room.photos` y `Facility.photos`. |
| `width`, `height` | Tamaño **del original** (ya rotado): sirve para reservar el lugar y evitar saltos de layout. |
| `files.avif` / `files.webp` | Lista de `{ url, width }`. `width` es el ancho **real** del archivo, apto para el `srcset` (`url 480w`). Hoy no se generan `jpeg`. |

Detalles que conviene saber:

- Si el original es más angosto que un ancho estándar, **no se agranda**: se genera hasta el ancho del original y ese es el `width` declarado (por eso hay anchos como 942 o 736).
- El `?v=…` es un hash del original: cambia si se reemplaza la foto. Los archivos con hash se cachean **un año** (`immutable`).
- Los metadatos (EXIF, GPS) ya están borrados y la rotación del celular ya está aplicada.

### Completar `loadPhotos` (`src/api/photos.ts`)

Es el `TODO` que hoy devuelve `[]`. Con el proxy del punto 2:

```ts
import type { PhotoData } from './contract'

export async function loadPhotos(signal: AbortSignal): Promise<PhotoData[]> {
  const res = await fetch('/api/photos', { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`) // fetch NO falla solo con un 404 o un 500
  const data: unknown = await res.json()
  if (!Array.isArray(data)) throw new Error('La respuesta de /api/photos no es un arreglo')
  return data as PhotoData[]
}
```

No hace falta tocar nada más para ver las fotos: `PhotosProvider` ya llama a `loadPhotos`, indexa por id con `indexPhotos`, y `Photo.tsx` arma el `<picture>`
con `buildSrcSet` / `pickSrc`. Si `loadPhotos` lanza, el provider deja los placeholders y la página sigue andando.

### Ids disponibles hoy

| Zona | Id | Fotos numeradas |
|---|---|---|
| Hero (portada del sitio) | `hero` | — (1 sola) |
| Conocenos | `about/01` | **no existe todavía** → placeholder |
| Habitaciones | `rooms/01-sonqoy/NN` | 10 |
| | `rooms/02-el-fuego/NN` | 9 |
| | `rooms/03-los-buhos/NN` | 14 |
| | `rooms/04-el-amanecer/NN` | 11 |
| | `rooms/05-los-teros/NN` | 9 |
| | `rooms/06-el-atardecer/NN` | 11 |
| | `rooms/07-huayra-huasi/NN` | 16 |
| Instalaciones | `facilities/anfitriones/NN` | 5 |
| | `facilities/desayunador/NN` | 8 |
| | `facilities/patios/NN` | 18 |
| | `facilities/pileta/NN` | 6 |

- `NN` va con 2 dígitos y sin huecos: `01`, `02`… hasta la cantidad de la tabla.
- Cada habitación e instalación tiene además una **`portada`** (`rooms/01-sonqoy/portada`, `facilities/patios/portada`…). El front todavía no la usa.
- Total: 129 ids (117 numeradas + 11 portadas + `hero`).

### Ojo: el front hoy pide menos fotos de las que hay

El backend devuelve **todas**, pero el front arma los ids a pedir con `PHOTOS_PER_ROOM = 6` (`src/data/rooms.ts`) y `PHOTOS_PER_FACILITY = 5` (`src/data/facilities.ts`),
y `data.test.ts` verifica esos largos. Resultado: aunque Los Búhos tenga 14 fotos, el sitio muestra solo `01`–`06`.

Para mostrarlas todas hay que cambiar eso del lado del front, por ejemplo con una cantidad por lugar (los números de la tabla de arriba) o armando la lista a partir de la respuesta:

```ts
// Ids de un lugar, tomados de lo que mandó el backend (sin la portada), en orden
const idsOf = (photos: Record<string, PhotoData>, folder: string) =>
  Object.keys(photos)
    .filter((id) => id.startsWith(`${folder}/`) && !id.endsWith('/portada'))
    .sort()
```

Es una decisión de diseño del front (y hay que ajustar el test).

### El hero

- Archivos: `/photos/hero-640.*`, `hero-960.*`, `hero-1200.*` (AVIF y WebP). Son **URLs estables, sin `?v=`**, y se cachean **un día** (no un año), justamente para poder hacerles `preload`.
- Ojo: el original mide 1200 px de ancho, así que en pantallas grandes se verá menos nítido que con una foto de 1920 px o más. Si se cambia `photos-originals/hero.jpg` por una más grande, `npm run photos` genera hasta 1920.

Preload en `index.html` (la foto del hero llega por la API, así que sin esto su descarga espera a JS → render → API → imagen y retrasa el LCP):

```html
<link rel="preload" as="image" type="image/avif" fetchpriority="high"
      href="/photos/hero-1200.avif"
      imagesrcset="/photos/hero-640.avif 640w, /photos/hero-960.avif 960w, /photos/hero-1200.avif 1200w"
      imagesizes="100vw" />
```

---

## 4. `POST /api/contact`

El cliente **ya está hecho**: `submitContact` en `src/lib/contactClient.ts` arma el POST, corta a los 15 s y entiende todas las respuestas. Lo único que falta es la variable:

```bash
# .env del front
VITE_CONTACT_ENDPOINT=/api/contact        # con el proxy del punto 2
# o, sin proxy: VITE_CONTACT_ENDPOINT=http://localhost:3001/api/contact
```

(Vite la escribe en el JS **al compilar**: si se cambia hay que reiniciar `npm run dev` o volver a compilar.)

### Qué recibe (`Content-Type: application/json`)

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

| Campo | Regla |
|---|---|
| `name` | Texto, 2 a 100 caracteres |
| `email` | Email válido, hasta 254 |
| `phone` | **Opcional**, hasta 30. Si está vacío, que **no** se mande el campo |
| `message` | Texto, 10 a 2000 caracteres |
| `language` | `"es"`, `"en"`, `"fr"` o `"pt-BR"` |
| `subject` | `"Consulta desde la web"` |
| `website` | **Honeypot**. El formulario real nunca lo manda. Si llega con algo, el backend responde `200 { "ok": true }` y descarta el mensaje (así un bot cree que funcionó) |

El servidor vuelve a validar todo con los mismos límites, saca espacios en los bordes y pasa el email a minúsculas.

### Qué responde

| Caso | HTTP | Cuerpo |
|---|---|---|
| Enviado | `200` | `{ "ok": true }` |
| Datos inválidos (o JSON roto, o cuerpo de más de 10 KB) | `400` | `{ "ok": false, "error": "invalid", "fields": ["email"] }` (`fields` puede faltar o venir vacío) |
| Demasiados envíos | `429` | `{ "ok": false, "error": "rate_limited" }` |
| No se pudo enviar el mail | `503` | `{ "ok": false, "error": "unavailable" }` |
| Origen no permitido (cabecera `Origin` ajena) | `403` | `{ "ok": false, "error": "unavailable" }` |

`fields` usa los nombres `name`, `email`, `phone`, `message`, `language`. El front solo confía en estos cuerpos; cualquier otra cosa la trata como `unavailable`.
`200` significa que **el proveedor de mail ya aceptó el mensaje** (en desarrollo con `MAIL_DRY_RUN=true`, que se imprimió en la consola del backend).

**Límites reales** (para no confundirse al probar): **5 envíos cada 15 minutos por IP** y **3 por hora por email**. Si en las pruebas aparece un `429`, es el límite funcionando.
Reiniciar el backend reinicia el de IP; el de email se cuenta en Mongo.

### Referencia: el `fetch` desnudo (por si se quiere probar sin `submitContact`)

```ts
const res = await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Ana Pérez',
    email: 'ana@correo.com',
    message: 'Quisiera consultar por una estadía en diciembre.',
    language: 'es',
    subject: 'Consulta desde la web',
  }),
})
const body = await res.json() // { ok: true } | { ok: false, error, fields? }
```

---

## 5. Cómo probarlo

Con el backend (`npm run dev`) y el front (`npm run dev` en su carpeta) levantados:

1. **Fotos:** abrir el sitio con DevTools → Network. `/api/photos` tiene que dar `200`, y los placeholders se reemplazan por fotos con un fundido.
2. **Resoluciones:** a 390 px de ancho, cada imagen baja el archivo de 480 o 800; a 1440 px, el de 1200. Recargar a otro ancho y comprobar que baja un archivo distinto.
3. **Carrusel:** un lugar con 2 o más fotos muestra flechas y contador (hoy cada lugar tiene 5 a 18; el front pide 6 o 5).
4. **Contacto:** enviar el formulario. Tiene que mostrar «enviado» y en la consola del backend aparece `[MAIL_DRY_RUN] mail no enviado: {...}`. Probar un email malformado (error de validación) y apagar el backend (debe mostrar el aviso de error con el enlace a WhatsApp).
5. **Sin el front:** Postman o curl.

```bash
curl -i http://localhost:3001/api/photos
curl -i -X POST http://localhost:3001/api/contact -H 'Content-Type: application/json' \
  -d '{"name":"Ana Pérez","email":"ana@correo.com","message":"Quisiera consultar por una estadía.","language":"es"}'
```

---

## 6. Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `/api/photos` da `[]` | Falta correr `npm run photos` en el backend |
| Fotos en placeholder y error de red / `404` en `/api/photos` | El backend no está levantado, o falta el `server.proxy` de Vite |
| Error de CORS en la consola | Front y back en orígenes distintos con `ALLOWED_ORIGIN` mal puesto (debe ser exactamente `http://localhost:5173`, sin barra final) |
| `/api/photos` anda pero las imágenes dan `404` | Orígenes distintos y falta `PUBLIC_BASE_URL` en el `.env` del backend (o falta `/photos` en el proxy) |
| El formulario no se ve (o el botón está deshabilitado) | Falta `VITE_CONTACT_ENDPOINT` en el `.env` del front; reiniciar `npm run dev` |
| El formulario da «no se pudo enviar» | `503`: SMTP mal configurado con `MAIL_DRY_RUN=false`. Mirar la consola del backend |
| `429` al probar | Límite por IP (5 / 15 min) o por email (3 / hora) |
| `EADDRINUSE` al levantar el backend | Ya hay otro proceso en el 3001. Cerrar el anterior (nodemon relanza al hijo: matar primero nodemon) |
| El backend no conecta a Mongo | La IP de la máquina no está en *Network Access* de Atlas |

---

## 7. Producción (resumen)

- **Mismo origen con Nginx:** `/api/` → `http://127.0.0.1:3001`, y `/photos/` apuntando directo a la carpeta de `PHOTOS_DIR` (los archivos ya son estáticos con nombres que no cambian, Nginx los sirve sin pasar por Node).
- En el `.env` del backend: `TRUST_PROXY=1` (para ver la IP real del visitante), `ALLOWED_ORIGIN=https://<dominio-del-sitio>` (exacto, sin `*`), `PHOTOS_DIR` fuera de la carpeta de la app (para que un deploy no la borre), `MAIL_DRY_RUN=false` y las `SMTP_*`.
- En el front: `VITE_CONTACT_ENDPOINT=/api/contact` **antes de compilar** (queda escrito en el JS).
