import { stripNewlines } from "./sanitize.js"

// Mismos límites que CONTACT_LIMITS y CONTACT_SUBJECT del front (src/api/contract.ts).
// Lo que valida el navegador se puede saltear: acá se vuelve a validar todo.
export const CONTACT_LIMITS = {
    name: { min: 2, max: 100 },
    email: { max: 254 },
    phone: { max: 30 },
    message: { min: 10, max: 2000 },
}
export const CONTACT_SUBJECT = "Consulta desde la web"
export const LANGUAGES = ["es", "en", "fr", "pt-BR"]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isString = (value) => typeof value === "string"
const isEmpty = (value) => value === undefined || value === null || value === ""

// Devuelve { ok, fields, data }. Si no es ok, `fields` lista los campos inválidos.
// Si es ok, `data` trae los valores ya limpios (sin espacios en los bordes, sin saltos de línea en cabeceras).
export const validateContact = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { ok: false, fields: [] }
    }
    const fields = []

    const name = isString(body.name) ? stripNewlines(body.name) : ""
    if (name.length < CONTACT_LIMITS.name.min || name.length > CONTACT_LIMITS.name.max) fields.push("name")

    const email = isString(body.email) ? stripNewlines(body.email).toLowerCase() : ""
    if (!EMAIL_REGEX.test(email) || email.length > CONTACT_LIMITS.email.max) fields.push("email")

    // phone es opcional: si viene, tiene que ser texto de hasta 30 caracteres
    let phone
    if (!isEmpty(body.phone)) {
        phone = isString(body.phone) ? stripNewlines(body.phone) : ""
        if (!phone || phone.length > CONTACT_LIMITS.phone.max) fields.push("phone")
    }

    const message = isString(body.message) ? body.message.trim() : ""
    if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max) fields.push("message")

    if (!LANGUAGES.includes(body.language)) fields.push("language")

    // El asunto es siempre el mismo; si llega otro texto válido se respeta, sin saltos de línea y acotado
    const subject = isString(body.subject) && body.subject.trim() ? stripNewlines(body.subject).slice(0, 200) : CONTACT_SUBJECT

    if (fields.length > 0) return { ok: false, fields }
    return { ok: true, fields, data: { name, email, phone, message, language: body.language, subject } }
}
