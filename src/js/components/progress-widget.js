import { icon } from '../utils/icons.js'

/**
 * A single labeled progress row: icon, label, percentage, and a bar.
 * Bar color shifts neutral → warning → critical as it fills, since
 * these are resource/health gauges, not decoration.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} opts.iconName
 * @param {number} opts.percent   0–100
 * @param {string} [opts.detail]  e.g. "3.2 / 8 GB"
 */
export async function progressRowHTML({ label, iconName, percent, detail = '' }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const barColor = clamped >= 90 ? 'bg-critical-500' : clamped >= 70 ? 'bg-warning-500' : 'bg-primary-600'
  const iconSvg = await icon(iconName, { className: 'w-4 h-4 text-neutral-400' })

  return `
  <div>
    <div class="mb-1.5 flex items-center justify-between text-sm">
      <span class="flex items-center gap-2 font-medium text-neutral-700">${iconSvg}${label}</span>
      <span class="text-neutral-400">${detail || `${clamped}%`}</span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-lg bg-neutral-100">
      <div class="h-full rounded-lg ${barColor}" style="width: ${clamped}%"></div>
    </div>
  </div>`
}

/**
 * Card wrapper for a set of progress rows (e.g. CPU + Memory together).
 * @param {object} opts
 * @param {string} opts.title
 * @param {string[]} opts.rowsHTML  pre-rendered progressRowHTML() output
 */
export function progressCardHTML({ title, rowsHTML }) {
  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <h3 class="mb-4 text-sm font-semibold text-neutral-900">${title}</h3>
    <div class="flex flex-col gap-4">${rowsHTML.join('')}</div>
  </div>`
}
