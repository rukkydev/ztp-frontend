import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'

const COLLAPSE_STORAGE_KEY = 'ztp-sidebar-collapsed'

/**
 * @param {object} opts
 * @param {Array} opts.navGroups   see js/config/navigation.js for shape
 * @param {string} opts.currentPage  id of the active nav item
 */
export async function sidebarHTML({ navGroups, currentPage }) {
  const collapsed = localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  const brandIcon = await icon('shield-check', { className: 'w-6 h-6 text-primary-600 shrink-0' })
  const collapseIcon = await icon(collapsed ? 'chevron-right' : 'chevron-left', {
    className: 'w-4 h-4 js-sidebar-collapse-icon',
  })

  const groupsHTML = await Promise.all(
    navGroups.map(async (group) => {
      const itemsHTML = await Promise.all(
        group.items.map(async (item) => {
          const isActive = item.id === currentPage
          const itemIcon = await icon(item.icon, { className: 'w-5 h-5 shrink-0' })
          return `
          <a href="${item.href}" data-page="${item.id}"
             class="js-sidebar-link group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-primary-50 text-primary-700'
                 : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}">
            ${itemIcon}
            <span class="js-sidebar-label truncate">${item.label}</span>
          </a>`
        })
      )

      return `
        <div class="mb-4">
          <p class="js-sidebar-label mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">${group.label}</p>
          <nav class="flex flex-col gap-0.5">${itemsHTML.join('')}</nav>
        </div>`
    })
  )

  return `
  <aside id="ztp-sidebar"
    class="${collapsed ? 'is-collapsed w-[var(--spacing-sidebar-collapsed)]' : 'w-[var(--spacing-sidebar)]'}
      fixed inset-y-0 left-0 z-40 flex -translate-x-full flex-col border-r border-neutral-200 bg-white
      transition-[width,transform] duration-150 lg:static lg:translate-x-0">

    <div class="flex h-[var(--spacing-topbar)] shrink-0 items-center gap-2 border-b border-neutral-200 px-4">
      ${brandIcon}
      <span class="js-sidebar-label text-sm font-semibold text-neutral-900">ZTP</span>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-4">
      ${groupsHTML.join('')}
    </div>

    <div class="shrink-0 border-t border-neutral-200 p-3">
      <button type="button"
        class="js-sidebar-collapse-toggle hidden w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 py-2 text-neutral-500 hover:bg-neutral-50 lg:flex">
        ${collapseIcon}
      </button>
    </div>
  </aside>

  <div class="js-sidebar-backdrop fixed inset-0 z-30 hidden bg-neutral-900/40 lg:hidden"></div>`
}

export function initSidebar() {
  const $sidebar = $('#ztp-sidebar')
  const $backdrop = $('.js-sidebar-backdrop')

  // Desktop collapse (persisted)
  $('.js-sidebar-collapse-toggle')
    .removeClass('hidden')
    .off('click.ztp-sidebar-collapse')
    .on('click.ztp-sidebar-collapse', async function () {
      const collapsed = $sidebar.hasClass('is-collapsed')
      const next = !collapsed

      $sidebar
        .toggleClass('is-collapsed', next)
        .toggleClass('w-[var(--spacing-sidebar)]', !next)
        .toggleClass('w-[var(--spacing-sidebar-collapsed)]', next)

      $('.js-sidebar-label').toggleClass('hidden', next)
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0')

      const newIcon = await icon(next ? 'chevron-right' : 'chevron-left', { className: 'w-4 h-4' })
      $('.js-sidebar-collapse-icon').replaceWith(newIcon)
    })

  if ($sidebar.hasClass('is-collapsed')) {
    $('.js-sidebar-label').addClass('hidden')
  }

  // Mobile drawer
  const openMobile = () => {
    $sidebar.removeClass('-translate-x-full')
    $backdrop.removeClass('hidden')
  }
  const closeMobile = () => {
    $sidebar.addClass('-translate-x-full')
    $backdrop.addClass('hidden')
  }

  $('.js-sidebar-mobile-toggle').off('click.ztp-sidebar-mobile').on('click.ztp-sidebar-mobile', openMobile)
  $backdrop.off('click.ztp-sidebar-mobile').on('click.ztp-sidebar-mobile', closeMobile)
  $('.js-sidebar-link').off('click.ztp-sidebar-mobile').on('click.ztp-sidebar-mobile', closeMobile)
}
