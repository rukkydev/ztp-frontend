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
import { initModals, modalHTML, openModal, closeModal } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

const SEVERITY_TONE = { High: 'critical', Medium: 'warning', Low: 'neutral', Critical: 'critical' }
const STATUS_TONE = { Open: 'warning', Resolved: 'success' }
const OUTCOME_LABELS = {
  CONFIRMED_THREAT: 'Confirmed Threat',
  FALSE_POSITIVE: 'False Positive',
}

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

function mountAlertModals() {
  // 1. Alert Details Modal (with Risk Explainability)
  $('#page-content').append(
    modalHTML({
      id: 'alert-details-modal',
      title: 'Alert Details',
      bodyHTML: '<div class="js-alert-details-content"></div>',
      footerHTML: buttonHTML({ variant: 'secondary', label: 'Close', className: 'js-modal-close' }),
      size: 'lg',
    })
  )

  // 2. Alert Resolution Outcome Modal
  const resolveBodyHTML = `
    <div class="space-y-4">
      <p class="text-sm text-neutral-600">
        Choose a resolution outcome to classify this incident and feed back into the risk engine:
      </p>
      <div class="space-y-2.5">
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/40">
          <input type="radio" name="resolve-alert-outcome" value="CONFIRMED_THREAT" class="mt-0.5 accent-primary-600" checked />
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-neutral-900">Confirmed Threat</span>
            <span class="block text-xs text-neutral-500">True positive security threat or policy violation. Reinforces risk evaluation rules.</span>
          </div>
        </label>
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/40">
          <input type="radio" name="resolve-alert-outcome" value="FALSE_POSITIVE" class="mt-0.5 accent-primary-600" />
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-neutral-900">False Positive</span>
            <span class="block text-xs text-neutral-500">Legitimate user activity misclassified. Tunes anomaly detection sensitivity.</span>
          </div>
        </label>
      </div>
    </div>
  `

  const resolveFooterHTML = `
    ${buttonHTML({ variant: 'secondary', label: 'Cancel', className: 'js-modal-close' })}
    ${buttonHTML({ variant: 'primary', label: 'Confirm & Resolve', attrs: { id: 'btn-confirm-resolve-alert' } })}
  `

  $('#page-content').append(
    modalHTML({
      id: 'alert-resolve-modal',
      title: 'Resolve Security Alert',
      bodyHTML: resolveBodyHTML,
      footerHTML: resolveFooterHTML,
      size: 'md',
    })
  )
}

function renderAlertExplainabilityHTML(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return ''
  }

  return `
    <div class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5">
      <div class="mb-2.5 flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-600">Risk Evaluation Breakdown</span>
        <span class="text-xs text-neutral-400">${reasons.length} rule factor${reasons.length === 1 ? '' : 's'}</span>
      </div>
      <ul class="space-y-1.5">
        ${reasons
          .map((reason) => {
            const rawText = typeof reason === 'string' ? reason : reason.description || reason.rule || JSON.stringify(reason)
            const match = rawText.match(/^([+-]\d+)\s*(.*)$/)
            const delta = match ? match[1] : null
            const label = match ? match[2] : rawText

            return `
            <li class="flex items-center justify-between gap-3 rounded-md border border-neutral-100 bg-white px-3 py-2 text-xs text-neutral-800 shadow-[var(--shadow-subtle)]">
              <span class="font-medium">${escapeHTML(label)}</span>
              ${
                delta
                  ? `<span class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      delta.startsWith('-') ? 'bg-success-50 text-success-700' : 'bg-critical-50 text-critical-700'
                    }">${escapeHTML(delta)}</span>`
                  : ''
              }
            </li>`
          })
          .join('')}
      </ul>
    </div>
  `
}

async function showAlertDetails(alert) {
  const timeStr = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : alert.triggeredAt || 'Unknown'
  const user = alert.username || (alert.userId ? `User #${alert.userId}` : alert.source || 'System')
  const tone = SEVERITY_TONE[alert.severity] || 'warning'
  const statusTone = STATUS_TONE[alert.status] || 'neutral'
  const explainabilityHTML = renderAlertExplainabilityHTML(alert.reasons)

  const outcomeHTML = alert.outcome
    ? `<div class="flex justify-between gap-4"><dt class="text-neutral-400">Outcome</dt><dd>${badgeHTML({
        label: OUTCOME_LABELS[alert.outcome] || alert.outcome,
        tone: alert.outcome === 'CONFIRMED_THREAT' ? 'critical' : 'success',
      })}</dd></div>`
    : ''

  $('#alert-details-modal-title').text(alert.title || 'Security Alert')
  $('#alert-details-modal .js-alert-details-content').html(`
    <dl class="flex flex-col gap-3 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Severity</dt><dd>${badgeHTML({ label: alert.severity || 'Medium', tone })}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Status</dt><dd>${badgeHTML({ label: alert.status || 'Open', tone: statusTone })}</dd></div>
      ${outcomeHTML}
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">User / Source</dt><dd class="text-neutral-800 font-medium">${escapeHTML(user)}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Timestamp</dt><dd class="text-neutral-800">${escapeHTML(timeStr)}</dd></div>
      <div class="flex flex-col gap-1"><dt class="text-neutral-400">Description</dt><dd class="rounded-lg bg-neutral-50 p-2.5 text-xs leading-relaxed text-neutral-700">${escapeHTML(alert.description || 'No additional description provided.')}</dd></div>
    </dl>
    ${explainabilityHTML}
  `)

  openModal('alert-details-modal')
}

async function mountAlertsTable() {
  const resolveIcon = await icon('check-circle', { className: 'w-4 h-4' })
  const viewIcon = await icon('document-magnifying-glass', { className: 'w-4 h-4' })

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
  mountAlertModals()

  let alerts = []
  let pendingResolveIds = []

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
        render: (row) => {
          const baseBadge = badgeHTML({ label: row.status || 'Open', tone: STATUS_TONE[row.status] || 'warning' })
          if (row.status === 'Resolved' && row.outcome) {
            const outcomeLabel = row.outcome === 'CONFIRMED_THREAT' ? 'Threat' : 'FP'
            const outcomeTone = row.outcome === 'CONFIRMED_THREAT' ? 'critical' : 'success'
            return `<div class="flex items-center gap-1.5">${baseBadge}${badgeHTML({ label: outcomeLabel, tone: outcomeTone })}</div>`
          }
          return baseBadge
        },
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
        onClick: (rows) => {
          const openRows = rows.filter((r) => r.status !== 'Resolved')
          if (openRows.length === 0) {
            showToast({ level: 'info', title: 'Selected alerts are already resolved' })
            return
          }
          pendingResolveIds = openRows.map((r) => r.id)
          $('#alert-resolve-modal-title').text(`Resolve ${pendingResolveIds.length} Alerts`)
          openModal('alert-resolve-modal')
        },
      },
    ],
    rowActionsHTML: (row) => `
      <button type="button" class="js-row-view-details flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-alert-id="${row.id}">
        ${viewIcon} View details
      </button>
      ${
        row.status === 'Open'
          ? `<button type="button" class="js-row-resolve flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-alert-id="${row.id}">
              ${resolveIcon} Resolve
            </button>`
          : ''
      }
    `,
    emptyState: { title: 'No alerts match your search', message: 'Try a different search term or clear your filters.' },
  })

  // Open Details Modal
  $('#alerts-table').on('click', '.js-row-view-details', async function () {
    const alertId = $(this).data('alert-id')
    let alert = alerts.find((a) => String(a.id) === String(alertId))
    try {
      const res = await apiGet(`/admin/alerts/${alertId}`)
      if (res && res.data) alert = res.data
    } catch {
      // Fallback to in-memory row
    }
    if (alert) showAlertDetails(alert)
  })

  // Open Resolve Modal for single alert
  $('#alerts-table').on('click', '.js-row-resolve', function () {
    const alertId = $(this).data('alert-id')
    pendingResolveIds = [alertId]
    $('#alert-resolve-modal-title').text('Resolve Security Alert')
    openModal('alert-resolve-modal')
  })

  // Handle Resolution Submission
  $('#page-content').on('click', '#btn-confirm-resolve-alert', async function () {
    if (!pendingResolveIds.length) return
    const $btn = $(this)
    const outcome = $('input[name="resolve-alert-outcome"]:checked').val() || 'CONFIRMED_THREAT'

    $btn.prop('disabled', true).text('Resolving…')

    try {
      if (pendingResolveIds.length === 1) {
        await apiPatch(`/admin/alerts/${pendingResolveIds[0]}`, { status: 'Resolved', outcome })
        showToast({ level: 'success', title: 'Alert resolved' })
      } else {
        await apiPatch('/admin/alerts/bulk-resolve', { ids: pendingResolveIds, outcome })
        showToast({ level: 'success', title: `${pendingResolveIds.length} alerts resolved` })
      }
      closeModal('alert-resolve-modal')
      await refreshAlerts()
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not resolve alert.'
      showToast({ level: 'critical', title: 'Action failed', message: msg })
    } finally {
      $btn.prop('disabled', false).text('Confirm & Resolve')
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
