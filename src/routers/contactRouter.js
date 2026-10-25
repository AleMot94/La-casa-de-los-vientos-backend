import express from "express";
import { submitContact } from "../controllers/contactController.js";
import { honeypot } from "../middlewares/honeypot.js";
import { originCheck } from "../middlewares/originCheck.js";
import { contactRateLimit } from "../middlewares/contactRateLimit.js";
import { contactErrorHandler } from "../middlewares/contactErrorHandler.js";

const CONTACT_ROUTER = express.Router();

// El orden importa: tamaño del cuerpo -> honeypot -> origen -> límite por IP -> controller
CONTACT_ROUTER.post(
    "/",
    express.json({ limit: "10kb" }),
    honeypot,
    originCheck,
    contactRateLimit,
    submitContact
);

CONTACT_ROUTER.use(contactErrorHandler);

export default CONTACT_ROUTER
