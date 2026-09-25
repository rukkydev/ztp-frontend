import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getActivityLogs } from '../../config/mock-activity-logs-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, openModal, modalHTML } from '../../components/modal.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, ApiError } from '../../core/api-client.js'

const EVENT_TYPE_TONE = {
  LOGIN_SUCCESS: 'success',
  USER_CREATED: 'success',
  ACCOUNT_UNLOCKED: 'success',
  LOGIN_FAILED: 'critical',
  ACCOUNT_LOCKED: 'warning',
  USER_STATUS_CHANGED: 'warning',
  USER_UPDATED: 'primary',
  ROLE_PERMISSIONS_UPDATED: 'primary',
}

const EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_STATUS_CHANGED',
  'ROLE_PERMISSIONS_UPDATED',
]

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'activity-logs', pageTitle: 'Activity Logs' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountDetailsModal() {
  $('#page-content').append(
    modalHTML({ id: 'log-details-modal', title: 'Log details', bodyHTML: '', footerHTML: buttonHTML({ variant: 'secondary', label: 'Close', className: 'js-modal-close' }) })
  )
  const closeIcon = await icon('x-mark', { className: 'h-4 w-4' })
  $('#log-details-modal .js-modal-close-icon').html(closeIcon)
}

function showLogDetails(log) {
  const eventType = log.eventType || log.status || log.action || 'EVENT'
  const tone = EVENT_TYPE_TONE[eventType] || 'neutral'
  const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : log.timestampDisplay || log.timestamp || '—'
  const actor = log.actorUsername || log.user || '—'
  const desc = log.description || log.action || '—'
  const ip = log.ipAddress || log.ip || '—'
  const res = log.resource || '—'

  const targetUserHTML = log.targetUserId
    ? `<div class="flex justify-between gap-4"><dt class="text-neutral-400">Target User ID</dt><dd class="font-mono text-neutral-800">${escapeHTML(String(log.targetUserId))}</dd></div>`
    : ''

  const corrId = log.correlationId || log.correlation_id || log.metadata_json?.correlation_id || null

  $('#log-details-modal .js-modal-body').html(`
    <dl class="flex flex-col gap-3 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Log ID</dt><dd class="font-mono text-neutral-800">${escapeHTML(String(log.id))}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Correlation ID</dt><dd class="font-mono text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200 font-semibold">${escapeHTML(corrId || 'None (Direct)')}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Event Type</dt><dd>${badgeHTML({ label: eventType, tone })}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Timestamp</dt><dd class="text-neutral-800">${escapeHTML(timeStr)}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Actor / Admin</dt><dd class="text-neutral-800">${escapeHTML(actor)}</dd></div>
      ${targetUserHTML}
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Description</dt><dd class="text-neutral-800">${escapeHTML(desc)}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Resource</dt><dd class="text-neutral-800">${escapeHTML(res)}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">IP Address</dt><dd class="font-mono text-neutral-800">${escapeHTML(ip)}</dd></div>
    </dl>
  `)
  openModal('log-details-modal')
}

async function fetchLogDetail(logId, localList) {
  try {
    const res = await apiGet(`/admin/activity-logs/${logId}`)
    const log = res && res.data ? res.data : res
    showLogDetails(log)
  } catch (err) {
    const fallback = localList.find((l) => String(l.id) === String(logId))
    if (fallback) {
      showLogDetails(fallback)
    }
  }
}

async function mountActivityLogsTable() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Activity Logs'],
    title: 'Activity Logs',
    description: 'Every account and administrative action across the organization.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample activity log entries.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="activity-logs-table"></div>`)
  await mountDetailsModal()

  let logs = []

  try {
    const res = await apiGet('/admin/activity-logs')
    const liveLogs = Array.isArray(res?.data?.content)
      ? res.data.content
      : Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : null

    if (Array.isArray(liveLogs)) {
      logs = liveLogs
      $('#offline-banner').addClass('hidden')
    } else {
      logs = getActivityLogs()
      $('#offline-banner').removeClass('hidden')
    }
  } catch (err) {
    logs = getActivityLogs()
    $('#offline-banner').removeClass('hidden')
  }

  const table = await createDataTable({
    container: '#activity-logs-table',
    columns: [
      {
        key: 'createdAt',
        label: 'Timestamp',
        sortable: true,
        render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : row.timestampDisplay || row.timestamp || '—'),
      },
      {
        key: 'actorUsername',
        label: 'User / Actor',
        sortable: true,
        render: (row) => escapeHTML(row.actorUsername || row.user || '—'),
      },
      {
        key: 'eventType',
        label: 'Event Type',
        sortable: true,
        render: (row) => {
          const type = row.eventType || row.status || 'EVENT'
          const tone = EVENT_TYPE_TONE[type] || (row.status === 'Success' ? 'success' : row.status === 'Failed' ? 'critical' : 'neutral')
          return badgeHTML({ label: type, tone })
        },
      },
      {
        key: 'correlationId',
        label: 'Correlation ID',
        sortable: true,
        render: (row) => {
          const cid = row.correlationId || row.correlation_id || row.metadata_json?.correlation_id || null
          return cid
            ? `<span class="font-mono text-xs text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">${escapeHTML(cid.substring(0, 8))}…</span>`
            : '<span class="text-neutral-400">—</span>'
        },
      },
      {
        key: 'description',
        label: 'Description',
        sortable: true,
        render: (row) => escapeHTML(row.description || row.action || '—'),
      },
      {
        key: 'ipAddress',
        label: 'IP Address',
        sortable: false,
        render: (row) => escapeHTML(row.ipAddress || row.ip || '—'),
      },
    ],
    data: logs,
    rowKey: 'id',
    pageSize: 10,
    searchableKeys: ['actorUsername', 'user', 'eventType', 'description', 'action', 'ipAddress', 'ip'],
    filters: [
      { key: 'eventType', label: 'Event Type', options: EVENT_TYPES },
      { key: 'createdAt', label: 'Date', type: 'dateRange' },
    ],
    rowActionsHTML: () => `
      <button type="button" class="js-row-view-log flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">View details</button>
    `,
    emptyState: { title: 'No activity matches your search', message: 'Try a different search term, date range, or event type.' },
  })

  $('#activity-logs-table').on('click', '.js-row-view-log', function () {
    const logId = $(this).closest('.js-table-row').data('row-key')
    fetchLogDetail(logId, logs)
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountActivityLogsTable()
})
