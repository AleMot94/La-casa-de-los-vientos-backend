import { photoService } from "../services/photoService.js"

export const getPhotos = async (req, res) => {
    try {
        const photos = await photoService.getPhotos()
        // El front espera el arreglo directo, sin envolver en { status, payload }
        res.set("Cache-Control", "public, max-age=300")
        return res.status(200).json(photos)
    } catch (error) {
        console.error("Error getting photos:", error)
        return res.status(500).json({ error: "internal" })
    }
}
