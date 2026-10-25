import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"
import mongoose from "mongoose"
import { connectDB } from "../src/config/db.js"
import { ORIGINALS_DIR, PHOTOS_DIR } from "../src/config/paths.js"
import { PHOTO_DAO } from "../src/DAO/photoDAO.js"
import { EXPECTED_IDS, HERO_ID, WIDTHS, HERO_WIDTHS, isKnownId } from "./photoCatalog.js"

// Uso: npm run photos
// Lee photos-originals/, genera las variantes (AVIF + WebP en varios anchos) en PHOTOS_DIR
// y guarda/actualiza los datos de cada foto en Mongo. Se puede correr las veces que haga falta.

const SUPPORTED = [".jpg", ".jpeg", ".png", ".webp"]
const CONVERT_FIRST = [".heic", ".heif"]
const FORMATS = {
    avif: (image) => image.avif({ quality: 50 }),
    webp: (image) => image.webp({ quality: 78 }),
}

// Recorre la carpeta de originales y devuelve las rutas de todos los archivos
const listFiles = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? listFiles(full) : [full]
    }))
    return files.flat()
}

const processPhoto = async (id, file) => {
    const buffer = await fs.readFile(file)
    // Hash corto del original: cambia si cambia la foto, así el navegador no usa una versión vieja en caché
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 8)

    // El tamaño que reserva el front es el de la foto ya rotada (EXIF orientation 5 a 8 = girada 90°)
    const meta = await sharp(buffer).metadata()
    const rotated = meta.orientation >= 5
    const originalWidth = rotated ? meta.height : meta.width
    const originalHeight = rotated ? meta.width : meta.height

    // Sin agrandar: los anchos mayores al original se descartan (y se repite a lo sumo uno)
    const targets = id === HERO_ID ? HERO_WIDTHS : WIDTHS
    const widths = [...new Set(targets.map((width) => Math.min(width, originalWidth)))]

    const files = {}
    for (const [format, encode] of Object.entries(FORMATS)) {
        files[format] = await Promise.all(widths.map(async (width) => {
            const output = path.join(PHOTOS_DIR, `${id}-${width}.${format}`)
            await fs.mkdir(path.dirname(output), { recursive: true })
            // .rotate() aplica la rotación EXIF; como no se llama withMetadata(), sharp borra EXIF y GPS
            const image = sharp(buffer).rotate().resize({ width, withoutEnlargement: true })
            const info = await encode(image).toFile(output)
            // El hero va sin ?v= para tener URL estable (el front puede hacerle preload)
            const version = id === HERO_ID ? "" : `?v=${hash}`
            return { url: `/photos/${id}-${info.width}.${format}${version}`, width: info.width }
        }))
    }
    await PHOTO_DAO.upsert({ id, width: originalWidth, height: originalHeight, files })
}

const run = async () => {
    const found = new Map() // id -> archivo
    for (const file of await listFiles(ORIGINALS_DIR)) {
        const ext = path.extname(file).toLowerCase()
        const name = path.basename(file)
        if (name.startsWith(".")) continue // .gitkeep y similares
        const id = path.relative(ORIGINALS_DIR, file).slice(0, -ext.length || undefined).split(path.sep).join("/")

        if (CONVERT_FIRST.includes(ext)) {
            console.warn(`HEIC: ${id}${ext} se saltea, pasalo a JPG antes`)
        } else if (!SUPPORTED.includes(ext)) {
            console.warn(`Formato no soportado, se ignora: ${id}${ext}`)
        } else if (!isKnownId(id)) {
            console.warn(`Id desconocido, se ignora: ${id}${ext} (revisá el nombre de la carpeta o del archivo)`)
        } else if (found.has(id)) {
            console.warn(`Hay dos archivos para ${id}, se usa ${path.basename(found.get(id))} y se ignora ${name}`)
        } else {
            found.set(id, file)
        }
    }

    await connectDB()
    let failed = 0
    for (const [id, file] of found) {
        try {
            await processPhoto(id, file)
            console.log(`OK  ${id}`)
        } catch (error) {
            failed++
            console.error(`ERROR ${id}: ${error.message}`)
        }
    }

    // Fotos por lugar (carpeta), sin contar la portada
    const perPlace = {}
    for (const id of found.keys()) {
        if (id.endsWith("/portada")) continue
        const place = id.split("/").slice(0, -1).join("/") || id
        perPlace[place] = (perPlace[place] || 0) + 1
    }
    console.log("\nFotos por lugar:")
    for (const [place, count] of Object.entries(perPlace)) console.log(`  ${place}: ${count}`)

    // El front pide como mínimo EXPECTED_IDS; las que sobran se procesan igual
    const missing = EXPECTED_IDS.filter((id) => !found.has(id))
    console.log(`\nProcesadas: ${found.size - failed} de ${found.size} · con error: ${failed} · faltan de las que pide el front: ${missing.length}`)
    if (missing.length > 0) console.log("Faltan:\n  " + missing.join("\n  "))
    await mongoose.disconnect()
}

run().catch((error) => {
    console.error(error)
    process.exit(1)
})
