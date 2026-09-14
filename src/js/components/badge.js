import { escapeHTML } from '../utils/sanitize.js'

/**
 * Badge markup — used for status, roles, risk level, connection state.
 * @param {object} opts
 * @param {string} opts.label
 * @param {'neutral'|'primary'|'success'|'warning'|'critical'} [opts.tone='neutral']
 */
export function badgeHTML({ label, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-600 border-success-500/20',
    warning: 'bg-warning-50 text-warning-600 border-warning-500/20',
    critical: 'bg-critical-50 text-critical-600 border-critical-500/20',
  }

  return `<span class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${tones[tone]}">${escapeHTML(label)}</span>`
}
