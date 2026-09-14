import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'
import { badgeHTML } from './badge.js'
import { escapeHTML } from '../utils/sanitize.js'
import { apiGet, apiPost, apiPatch } from '../core/api-client.js'
import { getCachedUser } from '../core/auth-guard.js'
import { getAvatarSrc, initials } from '../utils/avatar.js'

function formatRole(role) {
  if (!role) return 'User'
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'SECURITY_NETWORK_ADMIN') return 'Security Admin'
  if (role === 'USER') return 'Standard User'
  return role
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDays = Math.floor(diffHour / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const EVENT_ICON_CONFIG = {
  login_alerts: { icon: 'arrow-right-on-rectangle', color: 'text-info-500 bg-info-50' },
  critical_alerts: { icon: 'shield-exclamation', color: 'text-critical-500 bg-critical-50' },
  account_changes: { icon: 'user-circle', color: 'text-warning-500 bg-warning-50' },
  security_updates: { icon: 'shield-check', color: 'text-success-500 bg-success-50' },
}

/**
 * @param {object} [opts]
 * @param {string} [opts.pageTitle]  shown next to the mobile menu button only
 * @param {{name?: string, username?: string, email?: string, fullName?: string, role?: string, avatarUrl?: string, avatar?: string}} [opts.user]
 */
export async function topbarHTML({ pageTitle = '', user } = {}) {
  const cachedUser = getCachedUser()
  const activeUser = user || cachedUser || {}
  const displayName = activeUser.fullName || activeUser.username || activeUser.name || activeUser.email || 'User'
  const displayRole = formatRole(activeUser.role || activeUser.title)

  const hamburger = await icon('bars-3', { className: 'w-5 h-5' })
  const bell = await icon('bell', { className: 'w-5 h-5' })
  const chevronDown = await icon('chevron-down', { className: 'w-4 h-4 text-neutral-400' })
  const userCircle = await icon('user-circle', { className: 'w-7 h-7 text-neutral-400' })
  const profileIcon = await icon('user-circle', { className: 'w-4 h-4' })
  const settingsIcon = await icon('cog-6-tooth', { className: 'w-4 h-4' })
  const logoutIcon = await icon('arrow-right-on-rectangle', { className: 'w-4 h-4' })

  const rawAvatar = activeUser.avatarUrl || activeUser.avatar_url || activeUser.avatar
  const avatarSrc = getAvatarSrc(rawAvatar)
  const userAvatarHTML = avatarSrc
    ? `<img src="${escapeHTML(avatarSrc)}" alt="Avatar" class="w-7 h-7 rounded-full object-cover border border-neutral-200" onerror="this.onerror=null; this.outerHTML='<span class=\\'flex w-7 h-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700\\'>${escapeHTML(initials(displayName))}</span>';" />`
    : `<span class="flex w-7 h-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">${escapeHTML(initials(displayName))}</span>`

  return `
  <header class="sticky top-0 z-20 flex h-[var(--spacing-topbar)] shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4">
    <div class="flex min-w-0 items-center gap-3">
      <button type="button" class="js-sidebar-mobile-toggle rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden">
        ${hamburger}
      </button>
      <span class="truncate text-sm font-medium text-neutral-700 lg:hidden">${escapeHTML(pageTitle)}</span>
    </div>

    <div class="flex items-center gap-2">
      <div class="js-dropdown relative">
        <button type="button" class="js-dropdown-trigger js-notification-bell-btn relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Notifications">
          ${bell}
          <span class="js-notification-badge hidden absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critical-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"></span>
        </button>
        <div class="js-dropdown-panel hidden absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 bg-white p-2 shadow-[var(--shadow-overlay)]">
          <div class="flex items-center justify-between border-b border-neutral-100 px-2 py-2 mb-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-neutral-900">Notifications</p>
              <span class="js-notification-count-label text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">0 unread</span>
            </div>
            <button type="button" class="js-notification-mark-all-btn text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">Mark all as read</button>
          </div>
          <div class="js-notification-list max-h-80 overflow-y-auto flex flex-col gap-1 p-1">
            <div class="py-6 text-center text-xs text-neutral-400">Loading notifications…</div>
          </div>
          <div class="border-t border-neutral-100 mt-1 pt-2 pb-1 text-center">
            <a href="/account/notifications.html" class="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">View all notifications →</a>
          </div>
        </div>
      </div>

      <div class="js-dropdown relative">
        <button type="button" class="js-dropdown-trigger flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100">
          <div class="js-topbar-avatar-container flex items-center justify-center">${userAvatarHTML}</div>
          <span class="hidden text-left sm:block">
            <span class="block text-sm font-medium leading-tight text-neutral-800">${escapeHTML(displayName)}</span>
            <span class="block text-xs leading-tight text-neutral-400">${escapeHTML(displayRole)}</span>
          </span>
          ${chevronDown}
        </button>
        <div class="js-dropdown-panel hidden absolute right-0 mt-2 w-52 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-[var(--shadow-overlay)]">
          <a href="/account/profile.html" data-page="profile" class="js-sidebar-link flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            ${profileIcon} Profile
          </a>
          <a href="/account/index.html" data-page="account-overview" class="js-sidebar-link flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            ${userCircle} My Account
          </a>
          <a href="${activeUser.role === 'USER' ? '/account/notification-settings.html' : '/admin/settings.html'}" data-page="settings" class="js-sidebar-link flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            ${settingsIcon} Settings
          </a>
          <div class="my-1 border-t border-neutral-200"></div>
          <button type="button" class="js-logout-btn flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-critical-600 hover:bg-critical-50">
            ${logoutIcon} Log out
          </button>
        </div>
      </div>
    </div>
  </header>`
}

async function refreshTopbarUserAvatar() {
  try {
    const res = await apiGet('/account/profile')
    const userProfile = res && res.data ? res.data : res
    if (userProfile) {
      const raw = userProfile.avatarUrl || userProfile.avatar_url || userProfile.avatar
      const src = getAvatarSrc(raw)
      const name = userProfile.fullName || userProfile.username || userProfile.email
      const $avatarSlot = $('.js-topbar-avatar-container')
      if ($avatarSlot.length) {
        const updatedHtml = src
          ? `<img src="${escapeHTML(src)}" alt="Avatar" class="w-7 h-7 rounded-full object-cover border border-neutral-200" onerror="this.onerror=null; this.outerHTML='<span class=\\'flex w-7 h-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700\\'>${escapeHTML(initials(name))}</span>';" />`
          : `<span class="flex w-7 h-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">${escapeHTML(initials(name))}</span>`
        $avatarSlot.html(updatedHtml)
      }
    }
  } catch {
    // Fail silently on avatar refresh
  }
}

async function fetchUnreadCount() {
  try {
    const res = await apiGet('/account/notifications/unread-count')
    const count = (res && res.data && typeof res.data.count === 'number') ? res.data.count : (typeof res?.count === 'number' ? res.count : 0)
    const $badge = $('.js-notification-badge')
    const $countLabel = $('.js-notification-count-label')

    if (count > 0) {
      $badge.text(count > 99 ? '99+' : count).removeClass('hidden')
      $countLabel.text(`${count} unread`).addClass('bg-critical-50 text-critical-700').removeClass('bg-neutral-100 text-neutral-600')
    } else {
      $badge.addClass('hidden').text('')
      $countLabel.text('0 unread').removeClass('bg-critical-50 text-critical-700').addClass('bg-neutral-100 text-neutral-600')
    }
  } catch (err) {
    // Fail silently on unread count poll
  }
}

async function fetchNotificationsList() {
  const $list = $('.js-notification-list')
  if (!$list.length) return

  try {
    const res = await apiGet('/account/notifications')
    const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])

    if (!items.length) {
      $list.html(`
        <div class="py-8 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-1.5">
          <span class="text-neutral-300 font-medium">No notifications yet</span>
          <span class="text-[11px] text-neutral-400">Events will appear here as they occur.</span>
        </div>`)
      return
    }

    const htmls = await Promise.all(
      items.map(async (item) => {
        const conf = EVENT_ICON_CONFIG[item.eventKey] || { icon: 'bell', color: 'text-primary-500 bg-primary-50' }
        const itemIcon = await icon(conf.icon, { className: `w-4 h-4 shrink-0 ${conf.color.split(' ')[0]}` })
        const isUnread = item.read === false
        const timeStr = formatRelativeTime(item.createdAt)

        return `
        <div data-id="${item.id}" data-unread="${isUnread}" class="js-notification-item flex items-start gap-2.5 p-2.5 transition-colors rounded-lg ${
          isUnread ? 'bg-primary-50/50 hover:bg-primary-50 border-l-2 border-primary-500 cursor-pointer' : 'hover:bg-neutral-50 opacity-80'
        }">
          <div class="p-1.5 rounded-full ${conf.color.split(' ')[1] || 'bg-neutral-100'} shrink-0 mt-0.5">
            ${itemIcon}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-semibold text-neutral-900 truncate">${escapeHTML(item.title || 'Notification')}</span>
              <span class="text-[10px] text-neutral-400 shrink-0">${escapeHTML(timeStr)}</span>
            </div>
            <p class="text-xs text-neutral-600 mt-0.5 line-clamp-2">${escapeHTML(item.message || '')}</p>
          </div>
          ${isUnread ? '<span class="w-1.5 h-1.5 rounded-full bg-primary-600 mt-1.5 shrink-0"></span>' : ''}
        </div>`
      })
    )

    $list.html(htmls.join(''))
  } catch (err) {
    $list.html(`
      <div class="py-6 text-center text-xs text-critical-500">
        Could not load notifications.
      </div>`)
  }
}

// Global Event Delegations & Polling Setup
$(document)
  .off('click.ztp-notification-bell')
  .on('click.ztp-notification-bell', '.js-notification-bell-btn', function () {
    fetchNotificationsList()
    fetchUnreadCount()
  })

$(document)
  .off('click.ztp-notification-item')
  .on('click.ztp-notification-item', '.js-notification-item[data-unread="true"]', async function (e) {
    e.stopPropagation()
    const $item = $(this)
    const id = $item.data('id')
    if (!id) return

    $item.attr('data-unread', 'false').removeClass('bg-primary-50/50 hover:bg-primary-50 border-l-2 border-primary-500 cursor-pointer').addClass('hover:bg-neutral-50 opacity-80')
    $item.find('.bg-primary-600').remove()

    try {
      await apiPatch(`/account/notifications/${id}/read`)
    } catch {
      // Ignore failure
    }
    fetchUnreadCount()
  })

$(document)
  .off('click.ztp-notification-mark-all')
  .on('click.ztp-notification-mark-all', '.js-notification-mark-all-btn', async function (e) {
    e.stopPropagation()
    const $items = $('.js-notification-item[data-unread="true"]')
    $items.attr('data-unread', 'false').removeClass('bg-primary-50/50 hover:bg-primary-50 border-l-2 border-primary-500 cursor-pointer').addClass('hover:bg-neutral-50 opacity-80')
    $('.js-notification-item .bg-primary-600').remove()

    try {
      await apiPatch('/account/notifications/read-all')
    } catch {
      // Ignore failure
    }
    fetchUnreadCount()
  })

$(document)
  .off('click.ztp-logout')
  .on('click.ztp-logout', '.js-logout-btn', async function () {
    const $btn = $(this)
    $btn.prop('disabled', true)

    try {
      await apiPost('/auth/logout')
    } catch {
      // Fail open on logout
    }
    sessionStorage.removeItem('ztp_logged_in')
    window.location.href = '/auth/login.html'
  })

// Auto-start polling for unread count and refresh user avatar
let notificationPollInterval = null
if (typeof window !== 'undefined') {
  window.addEventListener('ztp:avatar-updated', () => {
    refreshTopbarUserAvatar()
  })
  setTimeout(() => {
    fetchUnreadCount()
    refreshTopbarUserAvatar()
  }, 150)
  if (!notificationPollInterval) {
    notificationPollInterval = setInterval(() => fetchUnreadCount(), 20000)
  }
}
