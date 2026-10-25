// Las fotos que pide el front (ver BACKEND.md y src/data/photoIds.ts del front). Siempre con 2 dígitos.
export const HERO_ID = "hero"

const ROOM_FOLDERS = ["01-sonqoy", "02-el-fuego", "03-los-buhos", "04-el-amanecer", "05-los-teros", "06-el-atardecer", "07-huayra-huasi"]
const FACILITY_FOLDERS = ["patios", "desayunador", "pileta", "anfitriones"]

const photoIds = (folder, count) =>
    Array.from({ length: count }, (_, i) => `${folder}/${String(i + 1).padStart(2, "0")}`)

// Lo MÍNIMO que pide el front hoy (PHOTOS_PER_ROOM = 6, PHOTOS_PER_FACILITY = 5): 1 + 1 + 42 + 20 = 64.
// Se usa solo para avisar qué falta. Puede haber más fotos por lugar (ver isKnownId).
export const EXPECTED_IDS = [
    HERO_ID,
    "about/01",
    ...ROOM_FOLDERS.flatMap((folder) => photoIds(`rooms/${folder}`, 6)),
    ...FACILITY_FOLDERS.flatMap((folder) => photoIds(`facilities/${folder}`, 5)),
]

// ¿Es un id válido? Acepta cualquier cantidad de fotos por lugar (`01`, `02`… sin tope) y la `portada` de cada
// habitación o instalación. Lo que no coincide con una carpeta conocida se rechaza (casi siempre es un typo).
const PHOTO_NAME = /^(\d{2,}|portada)$/
export const isKnownId = (id) => {
    if (id === HERO_ID) return true
    const [group, folder, name, ...rest] = id.split("/")
    if (rest.length > 0) return false
    if (group === "about") return folder !== undefined && name === undefined && /^\d{2,}$/.test(folder)
    const folders = group === "rooms" ? ROOM_FOLDERS : group === "facilities" ? FACILITY_FOLDERS : null
    return !!folders && folders.includes(folder) && PHOTO_NAME.test(name ?? "")
}

// Anchos a generar (el navegador elige según ancho en pantalla × densidad)
export const WIDTHS = [480, 800, 1200]
export const HERO_WIDTHS = [640, 960, 1280, 1600, 1920]
