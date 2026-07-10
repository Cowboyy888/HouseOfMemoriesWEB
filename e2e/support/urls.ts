// Fixed, distinct ports for E2E purposes only — apps/web and apps/admin
// both run plain `next dev` with no port pinned for normal local dev (first
// one up grabs 3000, the other auto-increments), which is fine for a human
// running one at a time but flaky for Playwright's webServer orchestration.
// playwright.config.ts is the only thing that passes these to the dev
// servers it spawns; `npm run dev` elsewhere is untouched.
export const API_PORT = 4000;
export const WEB_PORT = 3010;
export const ADMIN_PORT = 3011;

export const API_URL = `http://localhost:${API_PORT}/api`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;
