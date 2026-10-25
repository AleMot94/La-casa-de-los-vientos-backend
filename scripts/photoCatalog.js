// Las fotos que pide el front (ver BACKEND.md y src/data/photoIds.ts del front). Siempre con 2 dígitos.
export const HERO_ID = "hero"

const ROOM_FOLDERS = ["01-sonqoy", "02-el-fuego", "03-los-buhos", "04-el-amanecer", "05-los-teros", "06-el-atardecer", "07-huayra-huasi"]
const FACILITY_FOLDERS = ["patios", "desayunador", "pileta", "anfitriones"]

const photoIds = (folder, count) =>
    Array.from({ length: count }, (_, i) => `${folder}/${String(i + 1).padStart(2, "0")}`)

// 1 + 1 + 42 + 20 = 64
export const EXPECTED_IDS = [
    HERO_ID,
    "about/01",
    ...ROOM_FOLDERS.flatMap((folder) => photoIds(`rooms/${folder}`, 6)),
    ...FACILITY_FOLDERS.flatMap((folder) => photoIds(`facilities/${folder}`, 5)),
]

// Anchos a generar (el navegador elige según ancho en pantalla × densidad)
export const WIDTHS = [480, 800, 1200]
export const HERO_WIDTHS = [640, 960, 1280, 1600, 1920]
