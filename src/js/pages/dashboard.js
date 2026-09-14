import $ from '../core/dom.js'
import { apiGet } from '../core/api-client.js'
import { getCachedUser } from '../core/auth-guard.js'
import { statCardHTML } from '../components/stat-card.js'
import { pageHeaderHTML } from '../components/page.js'
import { buttonHTML } from '../components/button.js'
import { icon } from '../utils/icons.js'
import { escapeHTML } from '../utils/sanitize.js'

async function quickLinkCardHTML({ iconName, title, description, href }) {
  const iconSvg = await icon(iconName, { className: 'w-5 h-5 text-primary-600' })
  const chevron = await icon('chevron-right', { className: 'w-4 h-4 text-neutral-300' })

  return `
  <a href="${href}" class="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-[var(--shadow-subtle)] transition-colors hover:border-primary-300 hover:bg-neutral-50/70">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">${iconSvg}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-semibold text-neutral-900">${title}</span>
      <span class="block text-xs text-neutral-500">${description}</span>
    </span>
    ${chevron}
  </a>`
}

/**
 * Renders the user account dashboard into #page-content.
 * Powered by live GET /account/overview endpoint.
 */
export async function mountDashboardPage() {
  let overview = null
  let isOffline = false

  try {
    const res = await apiGet('/account/overview')
    overview = res && res.data ? res.data : res
  } catch (err) {
    isOffline = true
    overview = {
      profile: getCachedUser() || {},
      deviceCount: 0,
      sessionCount: 0,
      unreadNotifications: 0,
      hasRecoveryPhrase: false,
    }
  }

  const profile = overview?.profile || getCachedUser() || {}
  const displayName = profile.fullName || profile.username || profile.name || profile.email || 'User'
  const firstName = displayName.split(' ')[0]

  const is2FAEnabled = Boolean(
    profile.twoFactorEnabled === true ||
    profile.twoFactorRequired === true ||
    profile.isTwoFactorEnabled === true ||
    profile.twoFactor === true ||
    profile.twoFactorAuth === true ||
    String(profile.twoFactorStatus || '').toLowerCase() === 'enabled' ||
    String(profile.twoFactor || '').toLowerCase() === 'enabled' ||
    String(profile.twoFactorEnabled || '').toLowerCase() === 'true'
  )

  const header = pageHeaderHTML({
    breadcrumbs: ['ZTP', 'Dashboard'],
    title: `Welcome back, ${escapeHTML(firstName)}`,
    description: 'Real-time overview of your account, devices, and security posture.',
    actionsHTML: buttonHTML({ variant: 'secondary', label: 'Refresh', attrs: { id: 'dashboard-refresh' } }),
  })

  const topRow = await Promise.all([
    statCardHTML({
      label: 'My Devices',
      value: String(overview.deviceCount ?? 0),
      iconName: 'device-tablet',
      tone: 'primary',
    }),
    statCardHTML({
      label: 'Active Sessions',
      value: String(overview.sessionCount ?? 0),
      iconName: 'clock',
      tone: 'neutral',
    }),
    statCardHTML({
      label: 'Two-Factor Auth',
      value: is2FAEnabled ? 'Enabled' : 'Disabled',
      iconName: 'shield-check',
      tone: is2FAEnabled ? 'success' : 'critical',
    }),
    statCardHTML({
      label: 'Unread Notifications',
      value: String(overview.unreadNotifications ?? 0),
      iconName: 'bell',
      tone: (overview.unreadNotifications ?? 0) > 0 ? 'warning' : 'neutral',
    }),
  ])

  const quickLinks = await Promise.all([
    quickLinkCardHTML({
      iconName: 'user-circle',
      title: 'Profile & Security',
      description: 'Update personal details, avatar photo, and 2FA credentials',
      href: '/account/profile.html',
    }),
    quickLinkCardHTML({
      iconName: 'device-tablet',
      title: 'Trusted Devices',
      description: 'Inspect enrolled hardware and revoke unrecognized devices',
      href: '/account/devices.html',
    }),
    quickLinkCardHTML({
      iconName: 'clock',
      title: 'Active Sessions',
      description: 'Review where your account is signed in and sign out remotely',
      href: '/account/sessions.html',
    }),
    quickLinkCardHTML({
      iconName: 'bell',
      title: 'Notification Preferences',
      description: 'Configure real-time alerts and security event notifications',
      href: '/account/notification-settings.html',
    }),
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
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${topRow.join('')}</div>
    <div class="mb-6">
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Quick Access</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">${quickLinks.join('')}</div>
    </div>
  `)

  $('#page-content').off('click', '#dashboard-refresh').on('click', '#dashboard-refresh', () => mountDashboardPage())
}
