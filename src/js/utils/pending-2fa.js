const EMAIL_KEY = 'ztp_pending_2fa_email'

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

/**
 * Retrieves the stored email for two-factor authentication.
 * @returns {string|null}
 */
export function getPending2faEmail() {
  return sessionStorage.getItem(EMAIL_KEY)
}

/**
 * Clears the stored email once authentication is complete.
 */
export function clearPending2faEmail() {
  sessionStorage.removeItem(EMAIL_KEY)
}
