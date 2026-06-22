/** Same-origin base path; nginx (prod) and the dev proxy forward /api → backend. */
export const API_BASE = '/api';

/** Country dialing code — MIANG is Gabon-only for now. */
export const TELEPHONE_PREFIXE = '+241';

/**
 * The frontend currently runs on an in-memory mock layer (see core/mock/seed.ts)
 * so the PWA is fully demonstrable without the NestJS backend. Flip this to false
 * once the real API is wired, and the data services will call HttpClient instead.
 */
export const USE_MOCK = true;
