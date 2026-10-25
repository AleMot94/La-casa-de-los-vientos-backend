// Cambia los saltos de línea por un espacio. Se usa en los datos que van a cabeceras del mail
// (nombre, email, asunto) para que nadie pueda inyectar cabeceras extra con \r\n.
export const stripNewlines = (text) => text.replace(/[\r\n]+/g, " ").trim()
