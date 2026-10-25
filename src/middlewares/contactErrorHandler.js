// Errores que pasan antes del controller (JSON roto, cuerpo demasiado grande, etc.).
// El front solo entiende los cuerpos de ContactResponse; cualquier otra cosa la trata como "unavailable".
export const contactErrorHandler = (err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
        return res.status(400).json({ ok: false, error: "invalid" })
    }
    console.error("Unexpected error in contact:", err)
    return res.status(503).json({ ok: false, error: "unavailable" })
}
