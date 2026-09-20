/**
 * API configuration, read from Vite environment variables (the
 * VITE_ prefix is required for Vite to expose a variable to client
 * code — see https://vite.dev/guide/env-and-mode).
 *
 * Set these in a local `.env` file (copy `.env.example` — `.env`
 * itself is gitignored and should never be committed). Falls back to
 * the confirmed local backend URL so `npm run dev` works against the
 * real API out of the box — update `.env` instead of this file if
 * that ever changes.
 *
 * CONFIRMED with backend: base URL includes the `/api` prefix — every
 * path passed to apiRequest() should be relative to that (e.g.
 * `/auth/login`, not `/api/auth/login`).
 */
function getDynamicApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    const trimmed = envUrl.replace(/\/$/, '')
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }
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
  return 'http://localhost:8000'
}

export const BACKEND_ORIGIN = getBackendOrigin()

/**
 * CONFIRMED with backend (Laravel Sanctum-style SPA auth): the
 * backend sets a readable `XSRF-TOKEN` cookie, and expects it echoed
 * back as the `X-XSRF-TOKEN` header on every mutating request. The
 * cookie is only set once something has called the bootstrap endpoint
 * below — apiRequest() does this automatically before the first
 * mutating request of a session, so callers don't need to think
 * about it.
 */
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'

/** GET endpoint that sets the CSRF cookie. Called automatically by apiRequest() — see api-client.js. */
export const CSRF_BOOTSTRAP_PATH = '/csrf-token'

/** Default request timeout, in milliseconds, before a request is aborted. 60s to tolerate Render cold start. */
export const DEFAULT_TIMEOUT_MS = 60000

