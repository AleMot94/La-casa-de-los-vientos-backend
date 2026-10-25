import mongoose from "mongoose";

const CONTACT_SCHEMA = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    language: { type: String, enum: ["es", "en", "fr", "pt-BR"], required: true },
    subject: { type: String, required: true },
    // pending: guardado, todavía sin mandar · sent: el proveedor aceptó el mail · failed: no se pudo mandar
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
}, { timestamps: true, versionKey: false })

// Para contar rápido los envíos recientes de un mismo email
CONTACT_SCHEMA.index({ email: 1, createdAt: -1 })

export default mongoose.model("Contact", CONTACT_SCHEMA)
