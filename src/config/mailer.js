import nodemailer from "nodemailer"

const DRY_RUN = process.env.MAIL_DRY_RUN === "true"
const PORT = Number(process.env.SMTP_PORT) || 587
// Debajo de los 15 s que espera el front: si el SMTP no responde, mejor un 503 a tiempo.
const TIMEOUT_MS = 10000

const transporter = DRY_RUN
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: PORT,
        secure: PORT === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS,
    })

// Resuelve solo si el proveedor aceptó el mensaje; si no, lanza (el service responde 503).
export const sendMail = async (options) => {
    const info = await transporter.sendMail(options)
    if (DRY_RUN) {
        console.log("[MAIL_DRY_RUN] mail no enviado:", info.message)
        return info
    }
    if (!info.accepted?.length || info.rejected?.length) {
        throw new Error("Mail not accepted by the provider")
    }
    return info
}
