import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { registerIconPlugin, icon } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiDelete } from '../../core/api-client.js'
import { getAdminSessions } from '../../config/mock-admin-sessions-data.js'

registerIconPlugin($)

function formatRelativeTime(createdAt) {
  if (!createdAt) return 'Unknown'
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'sessions', pageTitle: 'Sessions' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountSessionsTable() {
  const signOutIcon = await icon('arrow-right-on-rectangle', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Sessions'],
    title: 'Sessions',
    description: 'Every active session across the organization.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample session records.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="sessions-table"></div>`)

  let sessions = []

  const refreshSessions = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/sessions')
      const liveData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res)
        ? res
        : null

      if (Array.isArray(liveData)) {
        sessions = liveData.map((s) => ({
          ...s,
          sessionId: s.sessionId || s.id || s.token || 'session',
        }))
        $('#offline-banner').addClass('hidden')
      } else {
        sessions = getAdminSessions()
        $('#offline-banner').removeClass('hidden')
      }
    } catch (err) {
      sessions = getAdminSessions()
      $('#offline-banner').removeClass('hidden')
    } finally {
      table.setLoading(false)
      table.setData(sessions)
    }
  }

  const table = await createDataTable({
    container: '#sessions-table',
    columns: [
      {
        key: 'sessionId',
        label: 'Session ID',
        sortable: true,
        render: (row) => {
          const sid = String(row.sessionId || row.id || '')
          if (sid.length <= 8) return `<code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">${escapeHTML(sid)}</code>`
          const masked = `${sid.slice(0, 8)}••••${sid.slice(-4)}`
          return `<code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded" title="${escapeHTML(sid.slice(0, 12))}...">${escapeHTML(masked)}</code>`
        },
      },
      { key: 'username', label: 'User', sortable: true, render: (row) => escapeHTML(row.username || row.user || (row.userId ? `User #${row.userId}` : 'Unknown')) },
      {
        key: 'lastRequest',
        label: 'Last Active',
        sortable: true,
        render: (row) => {
          const ts = row.lastRequest || row.lastActive || row.updatedAt || row.createdAt
          return ts ? formatRelativeTime(ts) : 'Active now'
        },
      },
    ],
    data: sessions,
    rowKey: 'sessionId',
    pageSize: 8,
    searchableKeys: ['username', 'sessionId'],
    filters: [],
    bulkActions: [
      {
        label: 'Sign out selected',
        tone: 'danger',
        onClick: async (rows) => {
          const ok = await confirmDialog({
            title: `Sign out ${rows.length} session${rows.length === 1 ? '' : 's'}?`,
            message: 'Affected users will be signed out on their next request. Revocation takes effect on subsequent API calls.',
            confirmLabel: 'Sign out',
            tone: 'danger',
          })
          if (ok) {
            try {
              table.setLoading(true)
              const ids = rows.map((r) => r.sessionId)
              await apiDelete('/admin/sessions/bulk', { ids })
              await refreshSessions()
              showToast({ level: 'critical', title: `${rows.length} session${rows.length === 1 ? '' : 's'} signed out` })
            } catch (err) {
              showToast({ level: 'critical', title: 'Action failed', message: 'Could not sign out sessions.' })
            } finally {
              table.setLoading(false)
            }
          }
        },
      },
    ],
    rowActionsHTML: (row) => `
      <button type="button" class="js-row-signout flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-session-id="${row.sessionId}">${signOutIcon} Sign out</button>
    `,
    emptyState: { title: 'No sessions match your search', message: 'Try a different search term or clear your filters.' },
  })

  $('#sessions-table').on('click', '.js-row-signout', async function () {
    const sessionId = $(this).data('session-id')
    const ok = await confirmDialog({
      title: 'Sign out this session?',
      message: 'This user will be signed out on their next request. Revocation takes effect on subsequent API calls.',
      confirmLabel: 'Sign out',
      tone: 'danger',
    })
    if (ok) {
      try {
        await apiDelete(`/admin/sessions/${sessionId}`)
        await refreshSessions()
        showToast({ level: 'critical', title: 'Session signed out' })
      } catch (err) {
        showToast({ level: 'critical', title: 'Action failed', message: 'Could not sign out session.' })
      }
    }
  })

  // Initial fetch
  await refreshSessions()
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountSessionsTable()
})
