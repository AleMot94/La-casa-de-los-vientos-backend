import { CONTACT_DAO } from "../DAO/contactDAO.js"
import { sendMail } from "../config/mailer.js"
import { validateContact } from "../utils/validations.js"

// Límite por email, además del límite por IP que ya aplica el middleware del router
const EMAIL_LIMIT = 3
const EMAIL_WINDOW_MS = 60 * 60 * 1000

const buildMailText = ({ name, email, phone, language, message }) =>
    [
        `Nombre: ${name}`,
        `Email: ${email}`,
        `Teléfono: ${phone || "-"}`,
        `Idioma de la página: ${language}`,
        "",
        "Mensaje:",
        message,
    ].join("\n")

class ContactService {
    constructor() {
        this.CD = CONTACT_DAO
    }
    // Devuelve { status: "sent" | "invalid" | "rate_limited" | "unavailable", fields? }.
    // El controller lo traduce a HTTP; acá no se conoce req ni res.
    async submit(body) {
        const validation = validateContact(body)
        if (!validation.ok) {
            return { status: "invalid", fields: validation.fields }
        }
        const data = validation.data

        const since = new Date(Date.now() - EMAIL_WINDOW_MS)
        const recent = await this.CD.countByEmailSince(data.email, since)
        if (recent >= EMAIL_LIMIT) {
            return { status: "rate_limited" }
        }

        // Se guarda antes de mandar: si el mail falla, la consulta queda registrada como "failed"
        const contact = await this.CD.create(data)
        try {
            await sendMail({
                from: process.env.MAIL_FROM,
                to: process.env.MAIL_TO,
                replyTo: data.email,
                subject: data.subject,
                text: buildMailText(data),
            })
        } catch (error) {
            console.error("Error sending contact mail:", error.code || error.message)
            await this.CD.setStatus(contact._id, "failed").catch((err) => console.error("Error saving status:", err.message))
            return { status: "unavailable" }
        }
        await this.CD.setStatus(contact._id, "sent")
        return { status: "sent" }
    }
}

export const contactService = new ContactService()
