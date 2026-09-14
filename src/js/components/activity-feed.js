import { icon } from '../utils/icons.js'
import { escapeHTML } from '../utils/sanitize.js'

const TONE_CLASSES = {
  neutral: 'text-neutral-400',
  primary: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  critical: 'text-critical-600',
}

/**
 * @param {object} opts
 * @param {Array<{iconName: string, tone?: string, text: string, time: string}>} opts.items
 * @param {string} [opts.title='Recent Activity']
 */
export async function activityFeedHTML({ items, title = 'Recent Activity' }) {
  const rows = await Promise.all(
    items.map(async (item) => {
      const iconSvg = await icon(item.iconName, { className: `w-4 h-4 mt-0.5 shrink-0 ${TONE_CLASSES[item.tone || 'neutral']}` })
      return `
      <div class="flex items-start gap-3 py-2.5">
        ${iconSvg}
        <div class="min-w-0 flex-1">
          <p class="text-sm text-neutral-700">${escapeHTML(item.text)}</p>
          <p class="text-xs text-neutral-400">${escapeHTML(item.time)}</p>
        </div>
      </div>`
    })
  )

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <h3 class="mb-1 text-sm font-semibold text-neutral-900">${title}</h3>
    <div class="divide-y divide-neutral-100">${rows.join('')}</div>
  </div>`
}
