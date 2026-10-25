import path from "path"

const ROOT = path.resolve(import.meta.dirname, "..", "..")

// Fotos originales: nunca se sirven. Fuente para regenerar las variantes.
export const ORIGINALS_DIR = path.join(ROOT, "photos-originals")

// Variantes procesadas (las que sirve Express en /photos). Si PHOTOS_DIR es absoluta, path.resolve la respeta.
export const PHOTOS_DIR = path.resolve(ROOT, process.env.PHOTOS_DIR || "storage/photos")
