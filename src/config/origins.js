// ALLOWED_ORIGIN puede ser un dominio o varios separados por coma (ej. con y sin www).
export const getAllowedOrigins = () =>
    (process.env.ALLOWED_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean)
