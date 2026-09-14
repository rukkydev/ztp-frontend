/**
 * Escapes HTML-significant characters so a value can be safely
 * interpolated into an HTML template string. Every component in this
 * app builds markup as strings and injects it via jQuery's .html(),
 * so anything that could contain backend or user-supplied text (a
 * name, an email, a log message, an alert title) needs to go through
 * this before it lands in a template — otherwise a malicious value
 * from the API is a stored XSS vector the moment mock data is
 * replaced with real data.
 *
 * Values the app itself authors (labels, static copy, column headers)
 * don't need this. Values that came from a mock-*.js file standing in
 * for a real API response do, since that's exactly the data a real
 * backend would eventually control.
 */
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}

export const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Sanitizes backend error messages to prevent raw Java/Spring framework exceptions,
 * type conversion errors (e.g. "Conversion = ':'"), stack traces, or internal errors
 * from leaking to user-facing UI.
 */
export function sanitizeErrorMessage(rawMsg, fallback = 'An unexpected error occurred. Please try again.') {
  if (!rawMsg || typeof rawMsg !== 'string') return fallback
  const trimmed = rawMsg.trim()
  if (!trimmed) return fallback

  const isTechnical =
    /^Conversion\s*=/i.test(trimmed) ||
    /Conversion\s*=\s*['":]/i.test(trimmed) ||
    /Exception\b/i.test(trimmed) ||
    /\b(java|javax|jakarta|org\.spring|org\.hibernate)\b/i.test(trimmed) ||
    /JSON parse error/i.test(trimmed) ||
    /Cannot deserialize/i.test(trimmed) ||
    /could not execute/i.test(trimmed) ||
    /Internal Server Error/i.test(trimmed) ||
    /at [a-z0-9_.]+\([a-z0-9_.]+\.java:\d+\)/i.test(trimmed)

  if (isTechnical) {
    return fallback
  }

  return trimmed
}

