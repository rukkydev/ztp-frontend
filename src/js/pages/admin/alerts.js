import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getAlerts } from '../../config/mock-alerts-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

const SEVERITY_TONE = { High: 'critical', Medium: 'warning', Low: 'neutral', Critical: 'critical' }
const STATUS_TONE = { Open: 'warning', Resolved: 'success' }

registerIconPlugin($)

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
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'alerts', pageTitle: 'Alerts' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountAlertsTable() {
  const resolveIcon = await icon('check-circle', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Alerts'],
    title: 'Alerts',
    description: 'Auto-generated security alerts raised across the organization.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample security alerts.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="alerts-table"></div>`)

  let alerts = []

  const refreshAlerts = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/alerts')
      const liveData = res && res.data ? res.data : Array.isArray(res) ? res : null
      if (Array.isArray(liveData)) {
        alerts = liveData
        $('#offline-banner').addClass('hidden')
      } else {
        alerts = getAlerts()
        $('#offline-banner').removeClass('hidden')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast({ level: 'critical', title: 'Access denied', message: 'You need THREAT_MANAGE permissions to view alerts.' })
      }
      alerts = getAlerts()
      $('#offline-banner').removeClass('hidden')
    } finally {
      table.setLoading(false)
      table.setData(alerts)
    }
  }

  const table = await createDataTable({
    container: '#alerts-table',
    columns: [
      {
        key: 'severity',
        label: 'Severity',
        sortable: true,
        render: (row) => badgeHTML({ label: row.severity || 'Medium', tone: SEVERITY_TONE[row.severity] || 'warning' }),
      },
      {
        key: 'title',
        label: 'Alert',
        sortable: true,
        render: (row) => {
          const titleText = escapeHTML(row.title || 'Security Alert')
          const descText = row.description ? `<span class="block text-xs text-neutral-400 font-normal">${escapeHTML(row.description)}</span>` : ''
          return `<div><span class="font-medium text-neutral-900">${titleText}</span>${descText}</div>`
        },
      },
      {
        key: 'username',
        label: 'User / Source',
        sortable: true,
        render: (row) => escapeHTML(row.username || (row.userId ? `User #${row.userId}` : row.source || 'System')),
      },
      {
        key: 'createdAt',
        label: 'Triggered',
        sortable: true,
        render: (row) => formatRelativeTime(row.createdAt || row.triggeredAt),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (row) => badgeHTML({ label: row.status || 'Open', tone: STATUS_TONE[row.status] || 'warning' }),
      },
    ],
    data: alerts,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['title', 'username', 'description', 'source'],
    filters: [
      { key: 'severity', label: 'Severity', options: ['High', 'Medium', 'Low'] },
      { key: 'status', label: 'Status', options: ['Open', 'Resolved'] },
    ],
    bulkActions: [
      {
        label: 'Resolve selected',
        tone: 'success',
        onClick: async (rows) => {
          const openRows = rows.filter((r) => r.status !== 'Resolved')
          if (openRows.length === 0) {
            showToast({ level: 'info', title: 'Selected alerts are already resolved' })
            return
          }
          const ok = await confirmDialog({
            title: `Resolve ${openRows.length} alert${openRows.length === 1 ? '' : 's'}?`,
            message: 'These security alerts will be marked as resolved.',
            confirmLabel: 'Resolve all',
            tone: 'success',
          })
          if (ok) {
            try {
              table.setLoading(true)
              const ids = openRows.map((r) => r.id)
              await apiPatch('/admin/alerts/bulk-resolve', { ids })
              showToast({ level: 'success', title: `${openRows.length} alert${openRows.length === 1 ? '' : 's'} resolved` })
              await refreshAlerts()
            } catch (err) {
              const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not resolve alerts.'
              showToast({ level: 'critical', title: 'Action failed', message: msg })
            } finally {
              table.setLoading(false)
            }
          }
        },
      },
    ],
    rowActionsHTML: (row) =>
      row.status === 'Open'
        ? `<button type="button" class="js-row-resolve flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-alert-id="${row.id}">${resolveIcon} Resolve</button>`
        : `<span class="block px-3 py-2 text-sm text-neutral-400">Resolved</span>`,
    emptyState: { title: 'No alerts match your search', message: 'Try a different search term or clear your filters.' },
  })

  $('#alerts-table').on('click', '.js-row-resolve', async function () {
    const alertId = $(this).data('alert-id')
    try {
      await apiPatch(`/admin/alerts/${alertId}`, { status: 'Resolved' })
      showToast({ level: 'success', title: 'Alert resolved' })
      await refreshAlerts()
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not resolve alert.'
      showToast({ level: 'critical', title: 'Action failed', message: msg })
    }
  })

  // Initial fetch
  await refreshAlerts()
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountAlertsTable()
})
