import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getAnomalyDetectionData } from '../../config/mock-anomaly-detection-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, openModal, modalHTML } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { statCardHTML } from '../../components/stat-card.js'
import { timelineChartHTML } from '../../components/timeline-chart.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { createDataTable } from '../../components/data-table.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { apiGet, apiPost, ApiError } from '../../core/api-client.js'

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'anomaly-detection', pageTitle: 'Anomaly Detection' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountAnomalyDetection() {
  let isLive = false
  let data = null

  try {
    const res = await apiGet('/admin/anomaly-detection')
    if (res && res.data && res.data.stats) {
      data = res.data
      isLive = true
    }
  } catch (err) {
    data = getAnomalyDetectionData()
  }

  if (!data) data = getAnomalyDetectionData()

  const { stats, timeline, anomalies } = data
  const checkIcon = await icon('check-circle', { className: 'w-4 h-4' })
  const xIcon = await icon('x-circle', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Anomaly Detection'],
    title: 'Anomaly Detection',
    description: 'Behavioral anomalies flagged by ZTP across users and devices.',
  })

  const statCards = await Promise.all([
    statCardHTML({ label: 'Detected Today', value: stats.detectedToday.value, iconName: 'magnifying-glass-circle', tone: 'critical', trend: stats.detectedToday.trend }),
    statCardHTML({ label: 'Detection Rate', value: stats.detectionRate.value, iconName: 'shield-check', tone: 'success', trend: stats.detectionRate.trend }),
    statCardHTML({ label: 'Avg. Risk Score', value: stats.avgRiskScore.value, iconName: 'exclamation-triangle', tone: 'warning', trend: stats.avgRiskScore.trend }),
    statCardHTML({ label: 'Auto-Resolved', value: stats.autoResolved.value, iconName: 'check-circle', tone: 'neutral', trend: stats.autoResolved.trend }),
  ])

  const timelineChart = timelineChartHTML({ title: 'Anomalies Detected (7-day)', data: timeline })

  const bannerHTML = isLive
    ? `<div class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-success-200 bg-success-50 p-3.5 text-xs text-success-800 shadow-sm" role="status">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full bg-success-600 animate-pulse"></span>
          <span class="font-semibold text-success-900">Isolation Forest ML Active:</span>
          <span>Risk evaluation engine scoring and classifying access behavior in real time.</span>
        </div>
        <span class="font-mono text-[11px] text-success-700">SLA: &lt;50ms</span>
      </div>`
    : `<div class="mb-4 flex items-center gap-3 rounded-lg border border-info-200 bg-info-50 p-3.5 text-xs text-info-800 shadow-sm" role="status">
        <span class="font-semibold text-info-900">Simulated Risk Mode:</span>
        <span>Showing baseline risk scores. Live model reconnecting...</span>
      </div>`

const STATUS_TONE = { Investigating: 'warning', Confirmed: 'critical', Dismissed: 'neutral' }

function riskTone(score) {
  if (score >= 70) return 'critical'
  if (score >= 50) return 'warning'
  return 'neutral'
}

const ACTION_TONE = {
  ALLOW: 'success',
  MFA_CHALLENGE: 'warning',
  RESTRICT: 'warning',
  BLOCK: 'critical',
  RESOLVED: 'neutral',
  MITIGATED: 'success',
}

const BAND_TONE = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'warning',
  CRITICAL: 'critical',
}

async function mountEvaluationModal() {
  $('#page-content').append(
    modalHTML({
      id: 'risk-evaluation-modal',
      title: 'Risk Evaluation Details',
      bodyHTML: '<div class="js-evaluation-content"></div>',
      footerHTML: buttonHTML({ variant: 'secondary', label: 'Close', className: 'js-modal-close' }),
      size: 'lg',
    })
  )
  const closeIcon = await icon('x-mark', { className: 'h-4 w-4' })
  $('#risk-evaluation-modal .js-modal-close-icon').html(closeIcon)
}

function showEvaluationDetails(anomaly) {
  const score = Number(anomaly.riskScore ?? 0)
  const band = anomaly.riskBand || (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW')
  const action = anomaly.recommendedAction || (score >= 80 ? 'BLOCK' : score >= 60 ? 'RESTRICT' : score >= 40 ? 'MFA_CHALLENGE' : 'ALLOW')
  const corrId = anomaly.correlationId || 'N/A'
  const reasons = Array.isArray(anomaly.reasons) ? anomaly.reasons : [String(anomaly.reasons || 'Isolation Forest baseline score')]

  const reasonsListHTML = reasons.map((r) => {
    const text = typeof r === 'string' ? r : r.description || JSON.stringify(r)
    return `<li class="flex items-start gap-2 text-sm text-neutral-700">
      <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600"></span>
      <span>${escapeHTML(text)}</span>
    </li>`
  }).join('')

  const scoreBarWidth = Math.min(100, Math.max(0, score))
  const scoreColor = score >= 70 ? 'bg-critical-500' : score >= 40 ? 'bg-warning-500' : 'bg-success-500'

  $('#risk-evaluation-modal .js-evaluation-content').html(`
    <div class="space-y-5">
      <!-- Correlation ID Header Banner -->
      <div class="flex items-center justify-between rounded-lg border border-primary-100 bg-primary-50/60 p-3.5">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-primary-700">Evaluation Correlation ID</span>
          <p class="font-mono text-xs font-bold text-neutral-900 mt-0.5">${escapeHTML(corrId)}</p>
        </div>
        <span class="text-xs text-neutral-500">ML Isolation Forest v1.1.0</span>
      </div>

      <!-- Key Telemetry Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-lg border border-neutral-200 bg-white p-3">
          <dt class="text-xs text-neutral-500 font-medium">Risk Score</dt>
          <dd class="mt-1 text-xl font-bold font-mono text-neutral-900">${score}<span class="text-xs text-neutral-400 font-normal"> / 100</span></dd>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-white p-3">
          <dt class="text-xs text-neutral-500 font-medium">Risk Band / Level</dt>
          <dd class="mt-1">${badgeHTML({ label: band, tone: BAND_TONE[band] || 'neutral' })}</dd>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-white p-3">
          <dt class="text-xs text-neutral-500 font-medium">Recommended Action</dt>
          <dd class="mt-1">${badgeHTML({ label: action, tone: ACTION_TONE[action] || 'neutral' })}</dd>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-white p-3">
          <dt class="text-xs text-neutral-500 font-medium">Investigation Status</dt>
          <dd class="mt-1">${badgeHTML({ label: anomaly.status || 'Investigating', tone: STATUS_TONE[anomaly.status] || 'neutral' })}</dd>
        </div>
      </div>

      <!-- Score Bar Indicator -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs text-neutral-500 font-medium">
          <span>Anomaly Score Meter</span>
          <span>${score}%</span>
        </div>
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div class="h-full rounded-full ${scoreColor} transition-all duration-500" style="width: ${scoreBarWidth}%"></div>
        </div>
      </div>

      <!-- Evaluation Reasons & Factors -->
      <div class="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2.5">Evaluation Reasons & Feature Contributions</h4>
        <ul class="space-y-2">
          ${reasonsListHTML}
        </ul>
      </div>

      <!-- Contextual Metadata -->
      <dl class="grid grid-cols-2 gap-3 text-xs border-t border-neutral-200 pt-3">
        <div><dt class="text-neutral-400">Target Entity</dt><dd class="font-medium text-neutral-800">${escapeHTML(anomaly.entity || '—')}</dd></div>
        <div><dt class="text-neutral-400">Anomaly Type</dt><dd class="font-medium text-neutral-800">${escapeHTML(anomaly.type || '—')}</dd></div>
        <div><dt class="text-neutral-400">Detection Timestamp</dt><dd class="text-neutral-800">${escapeHTML(anomaly.detectedAt || '—')}</dd></div>
        <div><dt class="text-neutral-400">Zero-Trust SLA</dt><dd class="font-mono text-neutral-800">&lt;50ms</dd></div>
      </dl>
    </div>
  `)

  openModal('risk-evaluation-modal')
}

  $('#page-content').html(`
    ${header}
    ${bannerHTML}
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${statCards.join('')}</div>
    <div class="mb-6">${timelineChart}</div>
    <h2 class="mb-3 text-sm font-semibold text-neutral-900">Flagged Anomalies & Risk Evaluations</h2>
    <div id="anomalies-table"></div>
  `)
  await mountEvaluationModal()

  const eyeIcon = await icon('magnifying-glass-circle', { className: 'w-4 h-4' })

  const table = await createDataTable({
    container: '#anomalies-table',
    columns: [
      { key: 'detectedAt', label: 'Detected', sortable: false },
      { key: 'type', label: 'Anomaly / Event', sortable: true },
      { key: 'entity', label: 'Entity', sortable: true },
      {
        key: 'riskScore',
        label: 'Risk Score',
        sortable: true,
        render: (row) => badgeHTML({ label: `${row.riskScore}/100`, tone: riskTone(row.riskScore) }),
      },
      {
        key: 'riskBand',
        label: 'Risk Band',
        sortable: true,
        render: (row) => {
          const score = Number(row.riskScore ?? 0)
          const band = row.riskBand || (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW')
          return badgeHTML({ label: band, tone: BAND_TONE[band] || 'neutral' })
        },
      },
      {
        key: 'recommendedAction',
        label: 'Recommended Action',
        sortable: true,
        render: (row) => {
          const score = Number(row.riskScore ?? 0)
          const action = row.recommendedAction || (score >= 80 ? 'BLOCK' : score >= 60 ? 'RESTRICT' : score >= 40 ? 'MFA_CHALLENGE' : 'ALLOW')
          return badgeHTML({ label: action, tone: ACTION_TONE[action] || 'neutral' })
        },
      },
      { key: 'status', label: 'Status', sortable: true, render: (row) => badgeHTML({ label: row.status, tone: STATUS_TONE[row.status] || 'neutral' }) },
    ],
    data: anomalies,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['type', 'entity', 'recommendedAction', 'riskBand'],
    filters: [{ key: 'status', label: 'Status', options: ['Investigating', 'Confirmed', 'Dismissed'] }],
    rowActionsHTML: (row) => `
      <button type="button" class="js-row-view-eval flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 font-medium" data-anomaly-id="${row.id}">${eyeIcon} View Evaluation</button>
      ${
        row.status === 'Investigating'
          ? `
          <button type="button" class="js-row-confirm flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-anomaly-id="${row.id}">${xIcon} Confirm threat</button>
          <button type="button" class="js-row-dismiss flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-anomaly-id="${row.id}">${checkIcon} Dismiss</button>
        `
          : `<span class="block px-3 py-2 text-xs text-neutral-400 font-medium">${row.status}</span>`
      }
    `,
    emptyState: { title: 'No anomalies match your search' },
  })

  $('#anomalies-table').on('click', '.js-row-view-eval', function () {
    const id = $(this).data('anomaly-id')
    const item = anomalies.find((a) => String(a.id) === String(id))
    if (item) {
      showEvaluationDetails(item)
    }
  })

  $('#anomalies-table').on('click', '.js-row-confirm', async function () {
    const id = $(this).data('anomaly-id')
    const item = anomalies.find((a) => a.id === id)
    if (item) item.status = 'Confirmed'
    table.setData(anomalies)

    try {
      await apiPost(`/analyst/threats/risk-logs/${id}/acknowledge`, { enforced_action: 'CONFIRMED' })
    } catch {
      // quiet fallback
    }
    showToast({ level: 'critical', title: 'Anomaly confirmed as a threat' })
  })

  $('#anomalies-table').on('click', '.js-row-dismiss', async function () {
    const id = $(this).data('anomaly-id')
    const item = anomalies.find((a) => a.id === id)
    if (item) item.status = 'Dismissed'
    table.setData(anomalies)

    try {
      await apiPost(`/analyst/threats/risk-logs/${id}/acknowledge`, { enforced_action: 'DISMISSED' })
    } catch {
      // quiet fallback
    }
    showToast({ level: 'success', title: 'Anomaly dismissed' })
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountAnomalyDetection()
})
