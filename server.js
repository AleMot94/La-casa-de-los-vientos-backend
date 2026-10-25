import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import PHOTOS_ROUTER from "./src/routers/photosRouter.js"
import CONTACT_ROUTER from "./src/routers/contactRouter.js"
import { connectDB } from "./src/config/db.js"
import { getAllowedOrigins } from "./src/config/origins.js"
import { PHOTOS_DIR } from "./src/config/paths.js"


const APP = express()
const PORT = process.env.PORT || 3001

// Cuántos proxies (ej. Nginx) hay delante: 0 en desarrollo, 1 en producción. Sirve para ver la IP real del visitante.
APP.set("trust proxy", Number(process.env.TRUST_PROXY) || 0)

// CORS con el dominio exacto del sitio (nunca "*"); responde solo el OPTIONS del preflight
APP.use(cors({ origin: getAllowedOrigins(), methods: ["GET", "POST"] }))

// Fotos procesadas: archivos estáticos. Los nombres cambian con el ?v=hash de la URL, así que se cachean 1 año.
// El hero va sin hash (URL estable para el preload del front), por eso solo se cachea un día.
APP.use("/photos", express.static(PHOTOS_DIR, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
        if (path.basename(filePath).startsWith("hero-")) {
            res.set("Cache-Control", "public, max-age=86400")
        }
    },
}))

APP.use("/api/photos", PHOTOS_ROUTER)
APP.use("/api/contact", CONTACT_ROUTER)

APP.use((req, res) => res.status(404).json({ error: "not_found" }))

const startServer = async () => {
    await connectDB()
    APP.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
}

startServer()
