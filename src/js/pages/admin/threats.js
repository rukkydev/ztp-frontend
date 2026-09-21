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
import { initModals, modalHTML, openModal, closeModal } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

const SEVERITY_TONE = { Critical: 'critical', High: 'critical', Medium: 'warning', Low: 'neutral' }
const STATUS_TONE = { Active: 'critical', Mitigated: 'success' }
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
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'threats', pageTitle: 'Threats' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

function mountThreatModals() {
  // 1. Threat Details Modal (with Risk Explainability)
  $('#page-content').append(
    modalHTML({
      id: 'threat-details-modal',
      title: 'Threat Details',
      bodyHTML: '<div class="js-threat-details-content"></div>',
      footerHTML: buttonHTML({ variant: 'secondary', label: 'Close', className: 'js-modal-close' }),
      size: 'lg',
    })
  )

  // 2. Threat Mitigation Outcome Modal
  const mitigateBodyHTML = `
    <div class="space-y-4">
      <p class="text-sm text-neutral-600">
        Choose a mitigation disposition outcome to classify this threat and link back to the risk engine:
      </p>
      <div class="space-y-2.5">
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/40">
          <input type="radio" name="mitigate-threat-outcome" value="CONFIRMED_THREAT" class="mt-0.5 accent-primary-600" checked />
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-neutral-900">Confirmed Threat</span>
            <span class="block text-xs text-neutral-500">Confirmed malicious attack or compromise. Reinforces detection rules.</span>
          </div>
        </label>
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/40">
          <input type="radio" name="mitigate-threat-outcome" value="FALSE_POSITIVE" class="mt-0.5 accent-primary-600" />
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-neutral-900">False Positive</span>
            <span class="block text-xs text-neutral-500">Authorized administrative behavior misidentified. Calibrates behavioral baselines.</span>
          </div>
        </label>
      </div>
    </div>
  `

  const mitigateFooterHTML = `
    ${buttonHTML({ variant: 'secondary', label: 'Cancel', className: 'js-modal-close' })}
    ${buttonHTML({ variant: 'primary', label: 'Confirm & Mitigate', attrs: { id: 'btn-confirm-mitigate-threat' } })}
  `

  $('#page-content').append(
    modalHTML({
      id: 'threat-mitigate-modal',
      title: 'Mitigate Security Threat',
      bodyHTML: mitigateBodyHTML,
      footerHTML: mitigateFooterHTML,
      size: 'md',
    })
  )
}

function renderThreatExplainabilityHTML(reasons) {
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

async function showThreatDetails(threat) {
  const timeStr = threat.createdAt ? new Date(threat.createdAt).toLocaleString() : threat.detectedAt || 'Unknown'
  const user = threat.username || (threat.userId ? `User #${threat.userId}` : '—')
  const tone = SEVERITY_TONE[threat.severity] || 'critical'
  const statusTone = STATUS_TONE[threat.status] || 'neutral'
  const explainabilityHTML = renderThreatExplainabilityHTML(threat.reasons)

  const outcomeHTML = threat.outcome
    ? `<div class="flex justify-between gap-4"><dt class="text-neutral-400">Outcome</dt><dd>${badgeHTML({
        label: OUTCOME_LABELS[threat.outcome] || threat.outcome,
        tone: threat.outcome === 'CONFIRMED_THREAT' ? 'critical' : 'success',
      })}</dd></div>`
    : ''

  $('#threat-details-modal-title').text(threat.title || 'Security Threat')
  $('#threat-details-modal .js-threat-details-content').html(`
    <dl class="flex flex-col gap-3 text-sm">
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Severity</dt><dd>${badgeHTML({ label: threat.severity || 'High', tone })}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Status</dt><dd>${badgeHTML({ label: threat.status || 'Active', tone: statusTone })}</dd></div>
      ${outcomeHTML}
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Threat Type</dt><dd class="text-neutral-800 font-medium">${escapeHTML(threat.threatType || 'Anomaly')}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Target / User</dt><dd class="text-neutral-800">${escapeHTML(user)}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Affected Asset</dt><dd class="text-neutral-800">${escapeHTML(threat.affected || 'System')}</dd></div>
      <div class="flex justify-between gap-4"><dt class="text-neutral-400">Detected</dt><dd class="text-neutral-800">${escapeHTML(timeStr)}</dd></div>
      <div class="flex flex-col gap-1"><dt class="text-neutral-400">Description</dt><dd class="rounded-lg bg-neutral-50 p-2.5 text-xs leading-relaxed text-neutral-700">${escapeHTML(threat.description || 'No description provided.')}</dd></div>
    </dl>
    ${explainabilityHTML}
  `)

  openModal('threat-details-modal')
}

async function mountThreatsTable() {
  const shieldIcon = await icon('shield-check', { className: 'w-4 h-4' })
  const viewIcon = await icon('document-magnifying-glass', { className: 'w-4 h-4' })

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
  mountThreatModals()

  let threats = []
  let pendingMitigateIds = []

  const refreshThreats = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/threats')
      const liveData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : Array.isArray(res)
        ? res
        : null

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
          const titleText = escapeHTML(row.title || 'Security Threat')
          const descText = row.description ? `<span class="block text-xs text-neutral-400 font-normal">${escapeHTML(row.description)}</span>` : ''
          return `<div><span class="font-medium text-neutral-900">${titleText}</span>${descText}</div>`
        },
      },
      {
        key: 'threatType',
        label: 'Type',
        sortable: true,
        render: (row) => escapeHTML(row.threatType || 'Anomaly'),
      },
      {
        key: 'affected',
        label: 'Target / User',
        sortable: true,
        render: (row) => escapeHTML(row.username || row.affected || '—'),
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
        render: (row) => {
          const baseBadge = badgeHTML({ label: row.status || 'Active', tone: STATUS_TONE[row.status] || 'critical' })
          if (row.status === 'Mitigated' && row.outcome) {
            const outcomeLabel = row.outcome === 'CONFIRMED_THREAT' ? 'Threat' : 'FP'
            const outcomeTone = row.outcome === 'CONFIRMED_THREAT' ? 'critical' : 'success'
            return `<div class="flex items-center gap-1.5">${baseBadge}${badgeHTML({ label: outcomeLabel, tone: outcomeTone })}</div>`
          }
          return baseBadge
        },
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
        onClick: (rows) => {
          const activeRows = rows.filter((r) => r.status !== 'Mitigated')
          if (activeRows.length === 0) {
            showToast({ level: 'info', title: 'Selected threats are already mitigated' })
            return
          }
          pendingMitigateIds = activeRows.map((r) => r.id)
          $('#threat-mitigate-modal-title').text(`Mitigate ${pendingMitigateIds.length} Threats`)
          openModal('threat-mitigate-modal')
        },
      },
    ],
    rowActionsHTML: (row) => `
      <button type="button" class="js-row-view-details flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-threat-id="${row.id}">
        ${viewIcon} View details
      </button>
      ${
        row.status === 'Active'
          ? `<button type="button" class="js-row-mitigate flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-threat-id="${row.id}">
              ${shieldIcon} Mark mitigated
            </button>`
          : ''
      }
    `,
    emptyState: { title: 'No threats match your search', message: 'Try a different search term or clear your filters.' },
  })

  // Open Details Modal
  $('#threats-table').on('click', '.js-row-view-details', async function () {
    const threatId = $(this).data('threat-id')
    let threat = threats.find((t) => String(t.id) === String(threatId))
    try {
      const res = await apiGet(`/admin/threats/${threatId}`)
      if (res && res.data) threat = res.data
    } catch {
      // Fallback to in-memory row
    }
    if (threat) showThreatDetails(threat)
  })

  // Open Mitigate Modal for single threat
  $('#threats-table').on('click', '.js-row-mitigate', function () {
    const threatId = $(this).data('threat-id')
    pendingMitigateIds = [threatId]
    $('#threat-mitigate-modal-title').text('Mitigate Security Threat')
    openModal('threat-mitigate-modal')
  })

  // Handle Mitigation Submission
  $('#page-content').on('click', '#btn-confirm-mitigate-threat', async function () {
    if (!pendingMitigateIds.length) return
    const $btn = $(this)
    const outcome = $('input[name="mitigate-threat-outcome"]:checked').val() || 'CONFIRMED_THREAT'

    $btn.prop('disabled', true).text('Mitigating…')

    try {
      if (pendingMitigateIds.length === 1) {
        await apiPatch(`/admin/threats/${pendingMitigateIds[0]}`, { status: 'Mitigated', outcome })
        showToast({ level: 'success', title: 'Threat marked mitigated' })
      } else {
        await apiPatch('/admin/threats/bulk-mitigate', { ids: pendingMitigateIds, outcome })
        showToast({ level: 'success', title: `${pendingMitigateIds.length} threats marked mitigated` })
      }
      closeModal('threat-mitigate-modal')
      await refreshThreats()
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not mitigate threat.'
      showToast({ level: 'critical', title: 'Action failed', message: msg })
    } finally {
      $btn.prop('disabled', false).text('Confirm & Mitigate')
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
