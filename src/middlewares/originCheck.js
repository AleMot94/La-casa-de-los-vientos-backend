import { getAllowedOrigins } from "../config/origins.js"

// Si la petición trae cabecera Origin (todo navegador la manda en un POST) y no es la del sitio, se rechaza.
// No frena a un script con curl (puede inventar la cabecera), es una barrera más junto al rate limit.
export const originCheck = (req, res, next) => {
    const origin = req.headers.origin
    if (origin && !getAllowedOrigins().includes(origin)) {
        return res.status(403).json({ ok: false, error: "unavailable" })
    }
    next()
}
