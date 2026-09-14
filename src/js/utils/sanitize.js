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

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
