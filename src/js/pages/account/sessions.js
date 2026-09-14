import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { resourceListItemHTML, resourceListCardHTML } from '../../components/resource-list-item.js'
import { apiGet, apiDelete, ApiError } from '../../core/api-client.js'
import { getMySessions } from '../../config/mock-account-security-data.js'
import { escapeHTML } from '../../utils/sanitize.js'

registerIconPlugin($)

let sessions = []

function formatRelativeTime(createdAt) {
  if (!createdAt) return 'Unknown'
  const diffMs = Date.now() - new Date(createdAt).getTime()
  if (isNaN(diffMs)) return String(createdAt)
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'sessions', pageTitle: 'My Sessions' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function renderSessions() {
  const isSingleSession = sessions.length === 1
  const otherSessionsCount = isSingleSession
    ? 0
    : sessions.filter((s) => !(s.isCurrent || s.current || s.active)).length

  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'My Sessions'],
    title: 'My Sessions',
    description: "Everywhere you're currently signed in to ZTP.",
    actionsHTML:
      otherSessionsCount > 0
        ? buttonHTML({ variant: 'danger', label: 'Sign out all other sessions', attrs: { id: 'sign-out-all-btn' } })
        : '',
  })

  const rows = await Promise.all(
    sessions.map((session, idx) => {
      const isCurrent = Boolean(
        session.isCurrent ||
        session.current ||
        session.active ||
        isSingleSession ||
        (sessions.length > 1 && !sessions.some((s) => s.isCurrent || s.current || s.active) && idx === 0)
      )
      const sid = String(session.sessionId || session.id || '')
      const masked = sid.length > 8 ? `${sid.slice(0, 8)}••••${sid.slice(-4)}` : sid

      const userAgent = session.userAgent || session.device || ''
      const title = userAgent ? userAgent : (masked ? `Session ${masked}` : 'Session')

      const parts = []
      if (session.username) parts.push(`User: ${session.username}`)
      if (session.ipAddress || session.ip) parts.push(session.ipAddress || session.ip)
      if (session.location) parts.push(session.location)
      if (session.startedAt || session.createdAt) parts.push(`Signed in ${formatRelativeTime(session.startedAt || session.createdAt)}`)
      if (session.lastRequest) parts.push(`Last active ${formatRelativeTime(session.lastRequest)}`)
      else if (session.lastActive) parts.push(session.lastActive)

      const meta = parts.join(' · ')
      const iconName = session.iconName || (userAgent.toLowerCase().includes('mobile') ? 'device-phone-mobile' : 'computer-desktop')

      return resourceListItemHTML({
        iconName,
        title,
        meta,
        badgeHTML: isCurrent ? badgeHTML({ label: 'Current session', tone: 'primary' }) : '',
        actionHTML: isCurrent
          ? ''
          : buttonHTML({ variant: 'ghost', size: 'sm', label: 'Sign out', className: 'js-sign-out-session', attrs: { 'data-session-id': sid } }),
      })
    })
  )

  $('#page-content').html(`
    ${header}
    ${resourceListCardHTML(rows, { title: 'No active sessions found', message: 'You have no active sessions listed.' })}
  `)

  $('.js-sign-out-session').off('click').on('click', async function () {
    const sessionId = $(this).data('session-id')
    const ok = await confirmDialog({
      title: 'Sign out this session?',
      message: 'That device will be signed out on its next request.',
      confirmLabel: 'Sign out',
      tone: 'danger',
    })
    if (ok) {
      try {
        await apiDelete(`/account/sessions/${sessionId}`)
        showToast({ level: 'success', title: 'Session signed out' })
        await refreshSessions()
      } catch (err) {
        const msg = err instanceof ApiError ? err.data?.message || err.message : 'Request could not be completed.'
        showToast({ level: 'critical', title: 'Failed to sign out session', message: msg })
      }
    }
  })

  $('#sign-out-all-btn').off('click').on('click', async function () {
    const ok = await confirmDialog({
      title: 'Sign out all other sessions?',
      message: `${otherSessionsCount} other session${otherSessionsCount === 1 ? '' : 's'} will be signed out. This device stays signed in.`,
      confirmLabel: 'Sign out all',
      tone: 'danger',
    })
    if (ok) {
      try {
        await apiDelete('/account/sessions')
        showToast({ level: 'success', title: 'All other sessions signed out' })
        await refreshSessions()
      } catch (err) {
        const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not sign out sessions.'
        showToast({ level: 'critical', title: 'Action failed', message: msg })
      }
    }
  })
}

async function refreshSessions() {
  try {
    const res = await apiGet('/account/sessions')
    const liveData = res && res.data ? res.data : Array.isArray(res) ? res : []
    sessions = liveData
  } catch (err) {
    sessions = []
  }
  await renderSessions()
}

$(async function () {
  await requireAuth()
  await mountShell()
  await refreshSessions()
})
