import { icon } from '../utils/icons.js'
import { escapeHTML } from '../utils/sanitize.js'

/**
 * One row in a devices/sessions list: icon, title (+ optional badge
 * like "This device"), a meta line, and a trailing action.
 *
 * @param {object} opts
 * @param {string} opts.iconName
 * @param {string} opts.title
 * @param {string} opts.meta
 * @param {string} [opts.badgeHTML]     pre-rendered badge, e.g. badgeHTML({label:'This device', tone:'primary'})
 * @param {string} [opts.actionHTML]    pre-rendered trailing button
 */
export async function resourceListItemHTML({ iconName, title, meta, badgeHTML = '', actionHTML = '' }) {
  const iconSvg = await icon(iconName, { className: 'w-5 h-5' })

  return `
  <div class="flex items-center justify-between gap-4 py-4">
    <div class="flex min-w-0 items-center gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">${iconSvg}</span>
      <div class="min-w-0">
        <p class="flex items-center gap-2 text-sm font-medium text-neutral-800">
          <span class="truncate">${escapeHTML(title)}</span>${badgeHTML}
        </p>
        <p class="truncate text-xs text-neutral-400">${escapeHTML(meta)}</p>
      </div>
    </div>
    ${actionHTML ? `<div class="shrink-0">${actionHTML}</div>` : ''}
  </div>`
}

/**
 * Card wrapper with dividers between rows, with optional empty state.
 * @param {string[]} rowsHTML
 * @param {object} [emptyState]
 * @param {string} emptyState.title
 * @param {string} [emptyState.message]
 */
export function resourceListCardHTML(rowsHTML, emptyState = { title: 'No items found', message: '' }) {
  if (!rowsHTML || rowsHTML.length === 0) {
    return `
    <div class="rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-[var(--shadow-subtle)]">
      <p class="text-sm font-medium text-neutral-800">${escapeHTML(emptyState.title)}</p>
      ${emptyState.message ? `<p class="mt-1 text-xs text-neutral-400">${escapeHTML(emptyState.message)}</p>` : ''}
    </div>`
  }
  return `
  <div class="rounded-lg border border-neutral-200 bg-white px-6 shadow-[var(--shadow-subtle)]">
    <div class="divide-y divide-neutral-100">${rowsHTML.join('')}</div>
  </div>`
}
