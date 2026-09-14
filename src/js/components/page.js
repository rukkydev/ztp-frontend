import { sidebarHTML } from './sidebar.js'
import { topbarHTML } from './topbar.js'

/**
 * Page header: breadcrumb + title + description + right-aligned actions slot.
 * Every dashboard page should open with this for a consistent top region.
 *
 * @param {object} opts
 * @param {string[]} [opts.breadcrumbs]  e.g. ['ZTP', 'Dashboard']
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {string} [opts.actionsHTML]  pre-rendered buttons, e.g. buttonHTML(...)
 */
export function pageHeaderHTML({ breadcrumbs = [], title, description = '', actionsHTML = '' }) {
  const crumbHTML = breadcrumbs.length
    ? `<nav class="mb-2 flex items-center gap-1.5 text-xs text-neutral-400">
        ${breadcrumbs
          .map((c, i) => `<span class="${i === breadcrumbs.length - 1 ? 'text-neutral-600 font-medium' : ''}">${c}</span>`)
          .join('<span>/</span>')}
      </nav>`
    : ''

  return `
  <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      ${crumbHTML}
      <h1 class="text-xl font-semibold text-neutral-900">${title}</h1>
      ${description ? `<p class="mt-1 text-sm text-neutral-500">${description}</p>` : ''}
    </div>
    ${actionsHTML ? `<div class="flex shrink-0 items-center gap-2">${actionsHTML}</div>` : ''}
  </div>`
}

/**
 * Full app shell: sidebar + topbar + a `#page-content` container ready
 * for a page header and page-specific content to be injected into.
 *
 * @param {object} opts
 * @param {Array} opts.navGroups
 * @param {string} opts.currentPage
 * @param {string} [opts.pageTitle]  used in the mobile topbar label
 */
export async function appShellHTML({ navGroups, currentPage, pageTitle = '', user } = {}) {
  const sidebar = await sidebarHTML({ navGroups, currentPage })
  const topbar = await topbarHTML({ pageTitle, user })

  return `
  <div class="flex min-h-screen bg-neutral-50">
    ${sidebar}
    <div class="flex min-w-0 flex-1 flex-col">
      ${topbar}
      <main id="page-content" class="flex-1 p-6 lg:p-8"></main>
    </div>
  </div>`
}
