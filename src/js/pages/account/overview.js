import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { getCurrentUserProfile } from '../../config/mock-profile-data.js'
import { getNotificationPreferences } from '../../config/mock-notification-preferences.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { statCardHTML } from '../../components/stat-card.js'
import { apiGet } from '../../core/api-client.js'

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'overview', pageTitle: 'Overview' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function quickLinkHTML({ iconName, title, description, href }) {
  const iconSvg = await icon(iconName, { className: 'w-5 h-5 text-primary-600' })
  const chevron = await icon('chevron-right', { className: 'w-4 h-4 text-neutral-300' })

  return `
  <a href="${href}" class="flex items-center gap-4 py-4 hover:bg-neutral-50">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">${iconSvg}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-medium text-neutral-800">${title}</span>
      <span class="block text-xs text-neutral-400">${description}</span>
    </span>
    ${chevron}
  </a>`
}

async function renderOverview() {
  let overviewData = null
  let isOffline = false

  try {
    const res = await apiGet('/account/overview')
    overviewData = res && res.data ? res.data : res
  } catch (err) {
    isOffline = true
    const profile = getCachedUser() || getCurrentUserProfile()
    overviewData = {
      profile,
      deviceCount: 0,
      sessionCount: 0,
      unreadNotifications: 0,
      hasRecoveryPhrase: false,
    }
  }

  const profile = overviewData.profile || getCachedUser() || {}
  const displayName = profile.fullName || profile.username || profile.name || profile.email || 'User'
  const firstName = displayName.split(' ')[0]

  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Overview'],
    title: `Welcome back, ${firstName}`,
    description: "Here's a quick look at your account.",
  })

  const is2FAEnabled = Boolean(
    profile.twoFactorEnabled === true ||
    profile.twoFactorRequired === true ||
    profile.isTwoFactorEnabled === true ||
    profile.twoFactor === true ||
    profile.twoFactorAuth === true ||
    profile.hasTwoFactor === true ||
    profile.has2FA === true ||
    String(profile.twoFactorStatus || '').toLowerCase() === 'enabled' ||
    String(profile.twoFactor || '').toLowerCase() === 'enabled' ||
    String(profile.twoFactorEnabled || '').toLowerCase() === 'true'
  )

  const stats = await Promise.all([
    statCardHTML({ label: 'My Devices', value: String(overviewData.deviceCount ?? 0), iconName: 'device-tablet', tone: 'primary' }),
    statCardHTML({ label: 'Active Sessions', value: String(overviewData.sessionCount ?? 0), iconName: 'clock', tone: 'primary' }),
    statCardHTML({
      label: 'Two-Factor Auth',
      value: is2FAEnabled ? 'Enabled' : 'Disabled',
      iconName: 'shield-check',
      tone: is2FAEnabled ? 'success' : 'critical',
    }),
    statCardHTML({
      label: 'Unread Notifications',
      value: String(overviewData.unreadNotifications ?? 0),
      iconName: 'bell',
      tone: (overviewData.unreadNotifications ?? 0) > 0 ? 'warning' : 'neutral',
    }),
  ])

  const links = await Promise.all([
    quickLinkHTML({ iconName: 'user-circle', title: 'Profile', description: 'View and edit your personal information', href: '/account/profile.html' }),
    quickLinkHTML({ iconName: 'device-tablet', title: 'My Devices', description: 'Manage devices trusted to sign in', href: '/account/devices.html' }),
    quickLinkHTML({ iconName: 'clock', title: 'My Sessions', description: 'See where you\'re currently signed in', href: '/account/sessions.html' }),
    quickLinkHTML({ iconName: 'bell', title: 'Notification Settings', description: 'Choose what you hear about, and how', href: '/account/notification-settings.html' }),
  ])

  const offlineBannerHTML = isOffline
    ? `<div class="mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
        <span class="font-semibold text-warning-900">Offline Mode:</span>
        <span>Could not connect to live account overview service.</span>
      </div>`
    : ''

  $('#page-content').html(`
    ${header}
    ${offlineBannerHTML}
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${stats.join('')}</div>
    <div class="max-w-2xl rounded-lg border border-neutral-200 bg-white px-6 shadow-[var(--shadow-subtle)]">
      <div class="divide-y divide-neutral-100">${links.join('')}</div>
    </div>
  `)
}

$(async function () {
  await requireAuth()
  await mountShell()
  await renderOverview()
})
