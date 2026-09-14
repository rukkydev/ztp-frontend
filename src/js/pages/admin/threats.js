import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getThreats } from '../../config/mock-threats-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

const SEVERITY_TONE = { Critical: 'critical', High: 'critical', Medium: 'warning', Low: 'neutral' }
const STATUS_TONE = { Active: 'critical', Mitigated: 'success' }

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
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'threats', pageTitle: 'Threats' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountThreatsTable() {
  const shieldIcon = await icon('shield-check', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Threats'],
    title: 'Threats',
    description: 'Auto-generated threats detected across the organization.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample threat records.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="threats-table"></div>`)

  let threats = []

  const refreshThreats = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/threats')
      const liveData = res && res.data ? res.data : Array.isArray(res) ? res : null
      if (Array.isArray(liveData)) {
        threats = liveData
        $('#offline-banner').addClass('hidden')
      } else {
        threats = getThreats()
        $('#offline-banner').removeClass('hidden')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast({ level: 'critical', title: 'Access denied', message: 'You need THREAT_MANAGE permissions to view threats.' })
      }
      threats = getThreats()
      $('#offline-banner').removeClass('hidden')
    } finally {
      table.setLoading(false)
      table.setData(threats)
    }
  }

  const table = await createDataTable({
    container: '#threats-table',
    columns: [
      {
        key: 'severity',
        label: 'Severity',
        sortable: true,
        render: (row) => badgeHTML({ label: row.severity || 'High', tone: SEVERITY_TONE[row.severity] || 'critical' }),
      },
      {
        key: 'title',
        label: 'Threat',
        sortable: true,
        render: (row) => {
          const titleText = escapeHTML(row.title || row.threatType || 'Security Threat')
          const descText = row.description ? `<span class="block text-xs text-neutral-400 font-normal">${escapeHTML(row.description)}</span>` : ''
          return `<div><span class="font-medium text-neutral-900">${titleText}</span>${descText}</div>`
        },
      },
      {
        key: 'username',
        label: 'Affected Target',
        sortable: true,
        render: (row) => escapeHTML(row.username || (row.userId ? `User #${row.userId}` : row.affected || 'System')),
      },
      {
        key: 'createdAt',
        label: 'Detected',
        sortable: true,
        render: (row) => formatRelativeTime(row.createdAt || row.detectedAt),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (row) => badgeHTML({ label: row.status || 'Active', tone: STATUS_TONE[row.status] || 'critical' }),
      },
    ],
    data: threats,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['title', 'threatType', 'username', 'affected', 'description'],
    filters: [
      { key: 'severity', label: 'Severity', options: ['Critical', 'High'] },
      { key: 'status', label: 'Status', options: ['Active', 'Mitigated'] },
    ],
    bulkActions: [
      {
        label: 'Mitigate selected',
        tone: 'success',
        onClick: async (rows) => {
          const activeRows = rows.filter((r) => r.status !== 'Mitigated')
          if (activeRows.length === 0) {
            showToast({ level: 'info', title: 'Selected threats are already mitigated' })
            return
          }
          const ok = await confirmDialog({
            title: `Mitigate ${activeRows.length} threat${activeRows.length === 1 ? '' : 's'}?`,
            message: 'These threats will be marked as mitigated in tracking logs.',
            confirmLabel: 'Mitigate all',
            tone: 'success',
          })
          if (ok) {
            try {
              table.setLoading(true)
              const ids = activeRows.map((r) => r.id)
              await apiPatch('/admin/threats/bulk-mitigate', { ids })
              showToast({ level: 'success', title: `${activeRows.length} threat${activeRows.length === 1 ? '' : 's'} marked as mitigated` })
              await refreshThreats()
            } catch (err) {
              const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not mitigate threats.'
              showToast({ level: 'critical', title: 'Action failed', message: msg })
            } finally {
              table.setLoading(false)
            }
          }
        },
      },
    ],
    rowActionsHTML: (row) =>
      row.status === 'Active'
        ? `<button type="button" class="js-row-mitigate flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-threat-id="${row.id}">${shieldIcon} Mark mitigated</button>`
        : `<span class="block px-3 py-2 text-sm text-neutral-400">Mitigated</span>`,
    emptyState: { title: 'No threats match your search', message: 'Try a different search term or clear your filters.' },
  })

  $('#threats-table').on('click', '.js-row-mitigate', async function () {
    const threatId = $(this).data('threat-id')
    const ok = await confirmDialog({
      title: 'Mark this threat as mitigated?',
      message: 'This updates tracking status. Ensure any actual remediation is complete first.',
      confirmLabel: 'Mark mitigated',
    })
    if (ok) {
      try {
        await apiPatch(`/admin/threats/${threatId}`, { status: 'Mitigated' })
        showToast({ level: 'success', title: 'Threat marked mitigated' })
        await refreshThreats()
      } catch (err) {
        const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not mitigate threat.'
        showToast({ level: 'critical', title: 'Action failed', message: msg })
      }
    }
  })

  // Initial fetch
  await refreshThreats()
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountThreatsTable()
})
