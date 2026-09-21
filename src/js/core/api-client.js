import { API_BASE_URL, CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CSRF_BOOTSTRAP_PATH, DEFAULT_TIMEOUT_MS } from './api-config.js'

export { API_BASE_URL }

/**
 * Thrown by apiRequest() for any non-2xx response, or when the
 * request times out / the network fails. `status` is 0 for network
 * errors and timeouts (there was no HTTP response to have a status).
 */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    )
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getDeviceId() {
  const DEVICE_ID_KEY = 'ztp_device_id'
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `dev_${generateUUID()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  } else if (!deviceId.startsWith('dev_')) {
    deviceId = `dev_${deviceId}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export const getOrCreateDeviceId = getDeviceId

let cachedCsrfToken = null
let csrfPromise = null

/**
 * Hits the backend's CSRF bootstrap endpoint so it sets the
 * XSRF-TOKEN cookie (and provides the token in header/body for cross-origin setups).
 * apiRequest() calls this automatically before any mutating request.
 */
function buildFullUrl(path) {
  const cleanPath = path.replace(/^\//, '')
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/'
    return new URL(cleanPath, base)
  }
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost'
  const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/'
  const base = new URL(basePath.replace(/^\//, ''), origin + '/')
  return new URL(cleanPath, base)
}

export async function ensureCsrfCookie(force = false) {
  const cookieVal = getCookie(CSRF_COOKIE_NAME)
  if (!force && (cachedCsrfToken || cookieVal)) {
    return cachedCsrfToken || cookieVal
  }

  if (csrfPromise && !force) {
    return csrfPromise
  }

  csrfPromise = (async () => {
    try {
      const url = buildFullUrl(CSRF_BOOTSTRAP_PATH)
      const res = await fetch(url, { credentials: 'include' })
      const headerToken = res.headers.get('X-XSRF-TOKEN') || res.headers.get('XSRF-TOKEN')
      if (headerToken) {
        cachedCsrfToken = headerToken
      }
      const json = await res.json().catch(() => null)
      if (json?.csrf_token) {
        cachedCsrfToken = json.csrf_token
      } else if (json?.data?.token) {
        cachedCsrfToken = json.data.token
      }
    } catch (err) {
      console.warn('Could not bootstrap CSRF token:', err)
    } finally {
      csrfPromise = null
    }
    return cachedCsrfToken || getCookie(CSRF_COOKIE_NAME)
  })()

  return csrfPromise
}

export async function initializeSecurityContext() {
  try {
    await ensureCsrfCookie(true)
  } catch (err) {
    console.error('Failed to initialize CSRF security context', err)
  }
}

export async function apiRequest(path, { method = 'GET', body, params, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, refreshCsrf = false, optional = false } = {}) {
  const url = buildFullUrl(path)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value)
    })
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const requestHeaders = { Accept: 'application/json', ...headers }
  requestHeaders['X-Device-Id'] = getOrCreateDeviceId()
  if (body !== undefined && !isFormData) requestHeaders['Content-Type'] = 'application/json'

  // CSRF: ensure token is primed and sent for mutating requests
  if (MUTATING_METHODS.has(method.toUpperCase())) {
    const cleanPath = '/' + path.replace(/^\//, '').split('?')[0]
    const isAuthStep = ['/auth/login', '/auth/register', '/auth/verify-device', '/auth/verify-device/resend', '/auth/2fa/verify', '/auth/2fa/resend', '/auth/reset-password', '/auth/recover-with-phrase'].includes(cleanPath)
    await ensureCsrfCookie(isAuthStep || refreshCsrf || !cachedCsrfToken)
    const csrfToken = cachedCsrfToken || getCookie(CSRF_COOKIE_NAME)
    if (csrfToken) requestHeaders[CSRF_HEADER_NAME] = csrfToken
  }


  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: 'include', // send the session cookie; never store auth tokens in JS-readable storage
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out after ${timeoutMs}ms`, { status: 0 })
    }
    throw new ApiError(`Network error requesting ${path}: ${err.message}`, { status: 0 })
  } finally {
    clearTimeout(timeout)
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const data = response.status === 204 ? null : isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    const errorCode = data?.error_code
    const message = data?.message || `Request to ${path} failed with status ${response.status}`

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ztp:unauthenticated'))
      }
      const cleanPath = '/' + path.replace(/^\//, '').split('?')[0]
      const isAuthBootstrapPath = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/resend-otp', '/auth/2fa/verify', '/auth/2fa/resend', '/auth/me', '/auth/verify-device', '/auth/verify-device/resend'].includes(cleanPath)
      // Only hard-redirect if this is NOT a caller-optional request (i.e. one that has its own fallback)
      if (!isAuthBootstrapPath && !optional) {
        sessionStorage.removeItem('ztp_logged_in')
        window.location.href = '/auth/session-expired.html'
        return new Promise(() => {}) // halt further execution
      }
    }

    if (response.status === 403) {
      cachedCsrfToken = null
      if (typeof window !== 'undefined') {
        if (errorCode === 'DEVICE_BLOCKED') {
          window.dispatchEvent(new CustomEvent('ztp:device_blocked', { detail: message }))
        } else if (errorCode === 'ACCOUNT_LOCKED') {
          window.dispatchEvent(new CustomEvent('ztp:account_locked', { detail: message }))
        } else if (errorCode === 'FORBIDDEN_INSUFFICIENT_ROLE') {
          window.dispatchEvent(new CustomEvent('ztp:forbidden', { detail: message }))
        }
      }
    }

    throw new ApiError(message, {
      status: response.status,
      data,
    })
  }

  return data
}

export const apiGet = (path, opts = {}) => apiRequest(path, { ...opts, method: 'GET' })
export const apiPost = (path, body, opts = {}) => apiRequest(path, { ...opts, method: 'POST', body })
export const apiPatch = (path, body, opts = {}) => apiRequest(path, { ...opts, method: 'PATCH', body })
export const apiPut = (path, body, opts = {}) => apiRequest(path, { ...opts, method: 'PUT', body })
export const apiDelete = (path, bodyOrOpts, opts = {}) => {
  if (bodyOrOpts && (bodyOrOpts.headers || bodyOrOpts.signal || bodyOrOpts.timeoutMs)) {
    return apiRequest(path, { ...bodyOrOpts, method: 'DELETE' })
  }
  return apiRequest(path, { ...opts, method: 'DELETE', body: bodyOrOpts })
}
