import { apiGet, ApiError } from './api-client.js'

/**
 * CONFIRMED with backend: GET /auth/me returns 200 + the current
 * user — { id, username, email, role, createdAt } — on a valid
 * session, or 401 + { success: false, message: "Authentication
 * required" } otherwise. `role` is a plain string: "SUPER_ADMIN",
 * "SECURITY_NETWORK_ADMIN", or "USER".
 */
const SESSION_CHECK_PATH = '/auth/me'

let cachedUser = null

/**
 * Verifies there's a valid authenticated session before a protected
 * page renders anything, and optionally that the session's role is
 * allowed on this page. Call this as the very first line of a
 * protected page's entry point, before mounting the shell:
 *
 *   $(async function () {
 *     await requireAuth({ allowedRoles: ADMIN_ROLES })
 *     await mountShell()
 *     ...
 *   })
 *
 * On failure — no session, an expired one, the wrong role, or the
 * check itself erroring — this redirects (to /auth/login.html, or to
 * /auth/access-denied.html for a wrong-role authenticated session) and
 * returns a promise that never resolves, so nothing written after the
 * `await` runs. Failing closed on *any* uncertainty (not just a clean
 * 401) matches the product's own "never trust, always verify"
 * principle rather than assuming a network hiccup means "let them in."
 *
 * @param {object} [opts]
 * @param {string[]} [opts.allowedRoles]  see src/js/config/roles.js for the role constants — omit to allow any authenticated role (e.g. every /account/* page)
 * @returns {Promise<object>} the current user — only resolves once authenticated (and authorized, if allowedRoles was passed)
 */
export function requireAuth({ allowedRoles } = {}) {
  return apiGet(SESSION_CHECK_PATH)
    .then((res) => {
      // Handle both wrapped { data: user } and flat user shapes
      const user = res && res.data ? res.data : res
      cachedUser = user

      if (user && (user.status === 'Suspended' || user.enabled === false)) {
        window.location.href = '/auth/account-suspended.html'
        return new Promise(() => {})
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        sessionStorage.setItem('ztp_access_denied', '1')
        window.location.href = '/auth/access-denied.html'
        return new Promise(() => {}) // redirecting — never resolve
      }

      return user
    })
    .catch((err) => {
      const msg = (err && (err.data?.message || err.message)) || ''
      const lower = msg.toLowerCase()
      if (lower.includes('suspend') || lower.includes('disabled') || lower.includes('inactive') || err?.data?.status === 'Suspended') {
        window.location.href = '/auth/account-suspended.html'
        return new Promise(() => {})
      }

      // If the user was previously logged in, send them to the session expired page.
      // Otherwise, redirect to the standard login screen.
      if (sessionStorage.getItem('ztp_logged_in') === 'true') {
        sessionStorage.removeItem('ztp_logged_in')
        sessionStorage.setItem('ztp_session_expired', '1')
        window.location.href = '/auth/session-expired.html'
      } else {
        window.location.href = '/auth/login.html'
      }
      return new Promise(() => {}) // redirecting — never resolve
    })
}

/** The user requireAuth() last confirmed, or null if it hasn't run (or failed) yet. */
export function getCachedUser() {
  return cachedUser
}
