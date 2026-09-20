const EMAIL_KEY = 'ztp_pending_2fa_email'
const USER_ID_KEY = 'ztp_pending_2fa_user_id'

/**
 * Stores the email temporarily during the two-factor authentication flow.
 * @param {string|null} email 
 */
export function setPending2faEmail(email) {
  if (email) {
    sessionStorage.setItem(EMAIL_KEY, email)
  } else {
    sessionStorage.removeItem(EMAIL_KEY)
  }
}

export function setPending2faUserId(userId) {
  if (userId !== undefined && userId !== null) {
    sessionStorage.setItem(USER_ID_KEY, String(userId))
  } else {
    sessionStorage.removeItem(USER_ID_KEY)
  }
}

export function setPending2faContext({ email, userId } = {}) {
  setPending2faEmail(email)
  setPending2faUserId(userId)
}

/**
 * Retrieves the stored email for two-factor authentication.
 * @returns {string|null}
 */
export function getPending2faEmail() {
  return sessionStorage.getItem(EMAIL_KEY)
}

export function getPending2faUserId() {
  const val = sessionStorage.getItem(USER_ID_KEY)
  return val ? parseInt(val, 10) : null
}

/**
 * Clears the stored authentication context once complete.
 */
export function clearPending2faEmail() {
  sessionStorage.removeItem(EMAIL_KEY)
  sessionStorage.removeItem(USER_ID_KEY)
}
