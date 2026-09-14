import { icon } from '../utils/icons.js'
import { escapeHTML } from '../utils/sanitize.js'

/**
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} opts.value       already-formatted, e.g. "1,204" or "98/100"
 * @param {string} opts.iconName
 * @param {'neutral'|'primary'|'success'|'warning'|'critical'} [opts.tone='neutral']  icon tint
 * @param {object} [opts.trend]
 * @param {'up'|'down'|'flat'} opts.trend.direction
 * @param {string} opts.trend.label   e.g. "4% vs last week"
 * @param {boolean} [opts.trend.isGood=true]  whether this direction is a good thing (colors it success/critical accordingly)
 */
export async function statCardHTML({ label, value, iconName, tone = 'neutral', trend }) {
  const toneClasses = {
    neutral: 'bg-neutral-100 text-neutral-500',
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    critical: 'bg-critical-50 text-critical-600',
  }

  const iconSvg = await icon(iconName, { className: 'w-5 h-5' })

  let trendHTML = ''
  if (trend) {
    const trendIconName = trend.direction === 'up' ? 'arrow-trending-up' : trend.direction === 'down' ? 'arrow-trending-down' : 'minus-small'
    const isGood = trend.isGood ?? true
    const colorClass = trend.direction === 'flat' ? 'text-neutral-400' : isGood ? 'text-success-600' : 'text-critical-600'
    const trendIcon = await icon(trendIconName, { className: `w-3.5 h-3.5 ${colorClass}` })
    trendHTML = `<p class="mt-2 flex items-center gap-1 text-xs ${colorClass}">${trendIcon}<span>${escapeHTML(trend.label)}</span></p>`
  }

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">${escapeHTML(label)}</p>
      <span class="flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}">${iconSvg}</span>
    </div>
    <p class="mt-3 text-2xl font-semibold text-neutral-900">${escapeHTML(value)}</p>
    ${trendHTML}
  </div>`
}
