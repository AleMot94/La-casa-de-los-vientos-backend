import { contactService } from "../services/contactService.js"

// Los cuerpos son los de ContactResponse (src/api/contract.ts del front): el front solo confía en estos.
export const submitContact = async (req, res) => {
    try {
        const result = await contactService.submit(req.body)
        switch (result.status) {
            case "sent":
                return res.status(200).json({ ok: true })
            case "invalid":
                return res.status(400).json({ ok: false, error: "invalid", fields: result.fields })
            case "rate_limited":
                return res.status(429).json({ ok: false, error: "rate_limited" })
            default:
                return res.status(503).json({ ok: false, error: "unavailable" })
        }
    } catch (error) {
        // Sin detalles internos hacia afuera
        console.error("Error in contact:", error)
        return res.status(503).json({ ok: false, error: "unavailable" })
    }
}
