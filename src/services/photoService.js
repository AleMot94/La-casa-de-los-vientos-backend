import { PHOTO_DAO } from "../DAO/photoDAO.js"

const FORMATS = ["avif", "webp", "jpeg"]

class PhotoService {
    constructor() {
        this.PD = PHOTO_DAO
    }
    // Devuelve la lista de PhotoData que espera el front (ver src/api/contract.ts del front)
    async getPhotos() {
        // Vacío = rutas relativas (mismo origen). Con CDN se pone acá su dominio, sin tocar la base.
        const baseUrl = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")
        const photos = await this.PD.getAll()
        return photos.map((photo) => {
            const files = {}
            for (const format of FORMATS) {
                const list = photo.files?.[format]
                // Un formato sin archivos no se incluye (el contrato pide al menos uno, pero no listas vacías)
                if (list?.length) {
                    files[format] = list.map((file) => ({ url: baseUrl + file.url, width: file.width }))
                }
            }
            return { id: photo.id, width: photo.width, height: photo.height, files }
        })
    }
}

export const photoService = new PhotoService()
