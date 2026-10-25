import mongoose from "mongoose";

// Un archivo de la foto en un ancho concreto. La url es relativa (/photos/...): PUBLIC_BASE_URL se antepone en el service.
const FILE_SCHEMA = new mongoose.Schema({
    url: { type: String, required: true },
    width: { type: Number, required: true },
}, { _id: false })

const PHOTO_SCHEMA = new mongoose.Schema({
    // Mismo id que usa el front, ej. "rooms/01-sonqoy/01"
    id: { type: String, required: true, unique: true },
    // Tamaño del original (ya rotado), para reservar el lugar de la imagen
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    // default: undefined -> si no hay archivos de un formato, el campo no existe (no queda un [] vacío)
    files: {
        avif: { type: [FILE_SCHEMA], default: undefined },
        webp: { type: [FILE_SCHEMA], default: undefined },
        jpeg: { type: [FILE_SCHEMA], default: undefined },
    },
}, { versionKey: false })

export default mongoose.model("Photo", PHOTO_SCHEMA)
