import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { registerIconPlugin, icon } from '../../utils/icons.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { apiGet, apiPatch } from '../../core/api-client.js'
import { escapeHTML } from '../../utils/sanitize.js'

registerIconPlugin($)

let allNotifications = []
let currentTab = 'all'
let searchQuery = ''

const EVENT_ICON_CONFIG = {
  login_alerts: { icon: 'arrow-right-on-rectangle', color: 'text-primary-600 bg-primary-100', tone: 'primary', label: 'Login Alert' },
  critical_alerts: { icon: 'shield-exclamation', color: 'text-critical-600 bg-critical-100', tone: 'danger', label: 'Critical' },
  account_changes: { icon: 'user-circle', color: 'text-amber-600 bg-amber-100', tone: 'warning', label: 'Account' },
  security_updates: { icon: 'shield-check', color: 'text-success-600 bg-success-100', tone: 'success', label: 'Security' },
}

function formatTime(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (isNaN(date.getTime())) return String(createdAt)
  
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  let relTime = 'Just now'
  if (minutes >= 1 && minutes < 60) relTime = `${minutes}m ago`
  else if (minutes >= 60 && minutes < 1440) relTime = `${Math.round(minutes / 60)}h ago`
  else if (minutes >= 1440) relTime = `${Math.round(minutes / 1440)}d ago`

  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  
  return `${relTime} (${dateStr} at ${timeStr})`
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'notifications', pageTitle: 'Notifications' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

function filterNotifications() {
  return allNotifications.filter((item) => {
    // Tab filter
    if (currentTab === 'unread' && item.read !== false) return false
    if (currentTab === 'login_alerts' && item.eventKey !== 'login_alerts') return false
    if (currentTab === 'critical_alerts' && item.eventKey !== 'critical_alerts') return false
    if (currentTab === 'security' && item.eventKey !== 'security_updates') return false
    if (currentTab === 'account' && item.eventKey !== 'account_changes') return false

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = (item.title || '').toLowerCase().includes(q)
      const msgMatch = (item.message || '').toLowerCase().includes(q)
      const eventMatch = (item.eventKey || '').toLowerCase().includes(q)
      if (!titleMatch && !msgMatch && !eventMatch) return false
    }

    return true
  })
}

async function renderPage() {
  const unreadCount = allNotifications.filter((n) => n.read === false).length

  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Notifications'],
    title: 'Notifications',
    description: 'System alerts, security activity, and account status notifications.',
    actionsHTML: unreadCount > 0
      ? buttonHTML({
          variant: 'secondary',
          size: 'sm',
          label: 'Mark all as read',
          className: 'js-mark-all-read',
        })
      : '',
  })

  const filtered = filterNotifications()

  const listItemsHTML = await Promise.all(
    filtered.map(async (item) => {
      const conf = EVENT_ICON_CONFIG[item.eventKey] || { icon: 'bell', color: 'text-primary-600 bg-primary-100', tone: 'neutral', label: 'Alert' }
      const itemIcon = await icon(conf.icon, { className: `w-5 h-5 ${conf.color.split(' ')[0]}` })
      const isUnread = item.read === false
      const timeFormatted = formatTime(item.createdAt)

      return `
        <div data-id="${item.id}" class="group relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
          isUnread
            ? 'bg-primary-50/40 border-primary-200 hover:bg-primary-50/80 shadow-xs'
            : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
        }">
          <div class="p-2.5 rounded-xl ${conf.color.split(' ')[1] || 'bg-neutral-100'} shrink-0 mt-0.5">
            ${itemIcon}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-neutral-900">${escapeHTML(item.title || 'Notification')}</span>
                ${badgeHTML({ label: conf.label, tone: conf.tone })}
                ${isUnread ? '<span class="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-primary-700 bg-primary-100 rounded-full">New</span>' : ''}
              </div>
              <span class="text-xs text-neutral-400 shrink-0 font-medium">${escapeHTML(timeFormatted)}</span>
            </div>

            <p class="text-xs text-neutral-600 leading-relaxed max-w-3xl">${escapeHTML(item.message || '')}</p>
          </div>

          ${
            isUnread
              ? `<div class="shrink-0 pt-1">
                  ${buttonHTML({
                    variant: 'ghost',
                    size: 'xs',
                    label: 'Mark read',
                    className: 'js-mark-single-read opacity-80 hover:opacity-100',
                    attrs: { 'data-id': item.id },
                  })}
                </div>`
              : ''
          }
        </div>
      `
    })
  )

  const contentHTML = `
    ${header}

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <!-- Tabs -->
      <div class="flex items-center gap-1 overflow-x-auto p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/80 shrink-0">
        <button type="button" data-tab="all" class="js-nav-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          currentTab === 'all' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
        }">All (${allNotifications.length})</button>
        
        <button type="button" data-tab="unread" class="js-nav-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          currentTab === 'unread' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
        }">Unread (${unreadCount})</button>
        
        <button type="button" data-tab="login_alerts" class="js-nav-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          currentTab === 'login_alerts' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
        }">Logins</button>
        
        <button type="button" data-tab="critical_alerts" class="js-nav-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          currentTab === 'critical_alerts' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
        }">Critical</button>
        
        <button type="button" data-tab="security" class="js-nav-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          currentTab === 'security' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
        }">Security</button>
      </div>

      <!-- Search -->
      <div class="relative max-w-xs w-full">
        <input type="text" id="notification-search" value="${escapeHTML(searchQuery)}" placeholder="Search notifications…" class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">🔍</span>
      </div>
    </div>

    <!-- Notification List Container -->
    <div class="space-y-3">
      ${
        filtered.length > 0
          ? listItemsHTML.join('')
          : `<div class="py-16 text-center rounded-2xl bg-white border border-neutral-200 p-8">
              <div class="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3 text-lg">🔔</div>
              <h3 class="text-sm font-semibold text-neutral-800 mb-1">No notifications found</h3>
              <p class="text-xs text-neutral-500 max-w-sm mx-auto">There are no notifications matching your current tab or search criteria.</p>
            </div>`
      }
    </div>
  `

  $('#page-content').html(contentHTML)

  // Wire Tab Clicks
  $('.js-nav-tab').off('click').on('click', function () {
    currentTab = $(this).data('tab')
    renderPage()
  })

  // Wire Search Input
  $('#notification-search').off('input').on('input', function () {
    searchQuery = $(this).val()
    renderPage()
  })

  // Wire Mark Single Read
  $('.js-mark-single-read').off('click').on('click', async function (e) {
    e.stopPropagation()
    const id = $(this).data('id')
    try {
      await apiPatch(`/account/notifications/${id}/read`)
    } catch {
      // Ignore API failure
    }
    const item = allNotifications.find((n) => String(n.id) === String(id))
    if (item) item.read = true
    showToast({ level: 'success', title: 'Notification marked as read' })
    renderPage()
  })

  // Wire Mark All Read
  $('.js-mark-all-read').off('click').on('click', async function () {
    try {
      await apiPatch('/account/notifications/read-all')
    } catch {
      // Ignore API failure
    }
    allNotifications.forEach((n) => {
      n.read = true
    })
    showToast({ level: 'success', title: 'All notifications marked as read' })
    renderPage()
  })
}

async function refreshNotifications() {
  try {
    const res = await apiGet('/account/notifications')
    allNotifications = res && Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []
  } catch (err) {
    allNotifications = []
  }
  await renderPage()
}

$(async function () {
  await requireAuth()
  await mountShell()
  await refreshNotifications()
})
