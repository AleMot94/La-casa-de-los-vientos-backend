import { rateLimit } from "express-rate-limit"

// 5 envíos cada 15 minutos por IP. Detrás de un proxy hay que configurar TRUST_PROXY para ver la IP real.
export const contactRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ ok: false, error: "rate_limited" }),
})
