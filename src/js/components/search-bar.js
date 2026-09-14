import { icon } from '../utils/icons.js'

/**
 * @param {object} opts
 * @param {string} [opts.id='table-search']
 * @param {string} [opts.placeholder='Search…']
 */
export async function searchBarHTML({ id = 'table-search', placeholder = 'Search…' } = {}) {
  const searchIcon = await icon('magnifying-glass', { className: 'w-4 h-4 text-neutral-400' })

  return `
  <div class="relative">
    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">${searchIcon}</span>
    <input id="${id}" type="search" placeholder="${placeholder}"
      class="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400
        focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-64" />
  </div>`
}
