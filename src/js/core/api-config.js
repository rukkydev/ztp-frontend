/**
 * API configuration, read from Vite environment variables (the
 * VITE_ prefix is required for Vite to expose a variable to client
 * code — see https://vite.dev/guide/env-and-mode).
 *
 * Set these in a local `.env` file (copy `.env.example` — `.env`
 * itself is gitignored and should never be committed).
 *
 * ── Backends ────────────────────────────────────────────────────────────────
 * Production (cPanel / Laravel):
 *   VITE_API_URL=https://fordcapital.live/public/api
 *
 * Local dev (Laravel, port 8000):
 *   VITE_API_URL=http://localhost:8000
 *
 * Local dev (Java Spring Boot, port 8080):
 *   VITE_API_URL=http://localhost:8080
 * ────────────────────────────────────────────────────────────────────────────
 *
 * CONFIRMED with backend: base URL includes the `/api` prefix — every
 * path passed to apiRequest() should be relative to that (e.g.
 * `/auth/login`, not `/api/auth/login`).
 */

// Production cPanel Laravel backend
const CPANEL_BACKEND = 'https://fordcapital.live/public'

function getDynamicApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    const trimmed = envUrl.replace(/\/$/, '')
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }
  // In production (Vercel), /api is proxied to the cPanel backend via vercel.json rewrites.
  // In local dev, fall back to localhost:8000 (Laravel) via the Vite dev server proxy.
  return '/api'
}

export const API_BASE_URL = getDynamicApiBaseUrl()

function getBackendOrigin() {
  if (import.meta.env.VITE_BACKEND_ORIGIN) {
    return import.meta.env.VITE_BACKEND_ORIGIN.replace(/\/$/, '')
  }
  const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '')
  }
  // Default: live production backend if in browser on non-localhost, else local dev
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://fordcapital.live/public'
  }
  return 'http://localhost:8000'
}

export const BACKEND_ORIGIN = getBackendOrigin()

/**
 * CONFIRMED with backend (Laravel SPA auth): the backend sets a
 * readable `XSRF-TOKEN` cookie, and expects it echoed back as the
 * `X-XSRF-TOKEN` header on every mutating request.
 */
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'

/** GET endpoint that sets the CSRF cookie. Called automatically by apiRequest() — see api-client.js. */
export const CSRF_BOOTSTRAP_PATH = '/csrf-token'

/** Default request timeout in ms. 60s to handle shared-hosting cold starts. */
export const DEFAULT_TIMEOUT_MS = 60000

/** Exported for reference — the live cPanel backend base URL. */
export const PRODUCTION_BACKEND_URL = CPANEL_BACKEND
