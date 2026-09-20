import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { statCardHTML } from '../../components/stat-card.js'
import { activityFeedHTML } from '../../components/activity-feed.js'
import { buttonHTML } from '../../components/button.js'
import { showToast } from '../../components/toast.js'
import { apiGet } from '../../core/api-client.js'

registerIconPlugin($)

// eventType -> how it renders in the Recent Activity feed. Fallback
// (document-text/neutral) covers any eventType the backend adds later
// that the frontend doesn't know about yet, rather than crashing on it.
const EVENT_STYLE = {
  LOGIN_SUCCESS: { iconName: 'check-circle', tone: 'success' },
  LOGIN_FAILED: { iconName: 'exclamation-triangle', tone: 'warning' },
  ACCOUNT_LOCKED: { iconName: 'lock-closed', tone: 'critical' },
  ACCOUNT_UNLOCKED: { iconName: 'lock-open', tone: 'success' },
}
const DEFAULT_EVENT_STYLE = { iconName: 'document-text', tone: 'neutral' }

/**
 * `createdAt` comes back as a timezone-less ISO string (e.g.
 * "2026-08-13T22:45:56"), which `new Date()` parses as local time.
 * That's only correct if the server's clock and the browser's are in
 * the same timezone — fine for local dev, worth confirming with the
 * backend (a `Z`/offset suffix would remove the ambiguity) before
 * trusting this across real timezones.
 */
function formatRelativeTime(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function placeholderCardHTML(title, message) {
  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <h3 class="mb-1 text-sm font-semibold text-neutral-900">${title}</h3>
    <p class="text-sm text-neutral-400">${message}</p>
  </div>`
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'dashboard', pageTitle: 'Dashboard' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountDashboardPage() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Dashboard'],
    title: 'Dashboard',
    description: 'Real-time overview of users and account activity.',
    actionsHTML: buttonHTML({ variant: 'secondary', label: 'Refresh', attrs: { id: 'dashboard-refresh' } }),
  })

  $('#page-content').html(`${header}<div id="dashboard-body"></div>`)

  let payload
  try {
    // Envelope-wrapped, unlike /auth/login and /auth/me — this
    // endpoint's real shape is { data: {...}, message, success,
    // timestamp }. Confirm whether that's true of every endpoint or
    // just this one before assuming the pattern for anything else.
    const response = await apiGet('/admin/dashboard')
    payload = response.data
  } catch (err) {
    $('#dashboard-body').html(`
      <div class="rounded-lg border border-critical-500/20 bg-critical-50 p-5 text-sm text-critical-600">
        Could not load dashboard data. Please refresh to try again.
      </div>`)
    return
  }

  const { stats, resources, detectionTimeline, recentActivity } = payload

  const statCards = await Promise.all([
    statCardHTML({ label: 'Total Users', value: String(stats.totalUsers), iconName: 'users', tone: 'primary' }),
    statCardHTML({ label: 'Active Users', value: String(stats.activeUsers), iconName: 'check-circle', tone: 'success' }),
    statCardHTML({ label: 'Suspended Users', value: String(stats.suspendedUsers), iconName: 'no-symbol', tone: stats.suspendedUsers > 0 ? 'warning' : 'neutral' }),
    statCardHTML({ label: 'Locked Accounts', value: String(stats.lockedAccounts), iconName: 'lock-closed', tone: stats.lockedAccounts > 0 ? 'critical' : 'neutral' }),
  ])

  // Both of these are genuinely not implemented backend-side yet
  // (confirmed: the real response returns null for both) — a
  // placeholder card is more honest than either hiding the section
  // entirely or showing invented numbers.
  const resourcesSection = resources
    ? placeholderCardHTML('System Resources', 'Resource data received — rendering not yet implemented for the real shape.')
    : placeholderCardHTML('System Resources', 'Not available yet — the backend doesn\'t report this.')
  const timelineSection = detectionTimeline
    ? placeholderCardHTML('Detection Timeline', 'Timeline data received — rendering not yet implemented for the real shape.')
    : placeholderCardHTML('Detection Timeline', 'Not available yet — the backend doesn\'t report this.')

// Friendly fallback labels when the backend sends a null description
const EVENT_LABEL = {
  LOGIN_SUCCESS: 'Signed in successfully',
  LOGIN_FAILED: 'Failed login attempt',
  ACCOUNT_LOCKED: 'Account locked',
  ACCOUNT_UNLOCKED: 'Account unlocked',
  USER_CREATED: 'New user created',
  USER_UPDATED: 'User profile updated',
  USER_DELETED: 'User account deleted',
  USER_SUSPENDED: 'User suspended',
  USER_REGISTERED: 'Self-registered account',
  PASSWORD_CHANGED: 'Password changed',
  PASSWORD_RESET: 'Password reset',
  TWO_FACTOR_ENABLED: '2FA enabled',
  TWO_FACTOR_DISABLED: '2FA disabled',
  DEVICE_REGISTERED: 'New device registered',
  DEVICE_TRUSTED: 'Device marked as trusted',
  DEVICE_REVOKED: 'Device revoked',
  DEVICE_BLOCKED: 'Device blocked',
  SESSION_TERMINATED: 'Session terminated',
  OTP_SENT: 'OTP code sent',
  OTP_VERIFIED: 'OTP verified',
  LOGOUT: 'Signed out',
}

  const activityItems = (recentActivity || []).map((event) => {
    const style = EVENT_STYLE[event.eventType] || DEFAULT_EVENT_STYLE
    const description = event.description || EVENT_LABEL[event.eventType] || event.eventType || 'System event'
    return {
      iconName: style.iconName,
      tone: style.tone,
      text: `${event.actorUsername || 'System'} — ${description}`,
      time: formatRelativeTime(event.createdAt),
    }
  })
  const activity = await activityFeedHTML({ items: activityItems, title: 'Recent Activity' })

  $('#dashboard-body').html(`
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${statCards.join('')}</div>
    <div class="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      ${timelineSection}
      ${resourcesSection}
    </div>
    <div>${activity}</div>
  `)
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountDashboardPage()

  // Delegated on #page-content (which persists across re-renders,
  // even though its contents — including this button — get replaced
  // by every mountDashboardPage() call) rather than bound directly to
  // the button, which would only survive the first refresh.
  $('#page-content').on('click', '#dashboard-refresh', () => mountDashboardPage())
})
