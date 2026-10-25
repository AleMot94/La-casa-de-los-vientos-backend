// `website` es un campo oculto que el formulario real nunca manda: si llega con algo, es un bot.
// Se le responde 200 como si hubiera funcionado y se descarta sin guardar ni mandar nada.
export const honeypot = (req, res, next) => {
    const website = req.body?.website
    if (website !== undefined && website !== null && website !== "") {
        return res.status(200).json({ ok: true })
    }
    next()
}
