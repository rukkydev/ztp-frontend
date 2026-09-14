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
import { initModals } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { statCardHTML } from '../../components/stat-card.js'
import { timelineChartHTML } from '../../components/timeline-chart.js'
import { badgeHTML } from '../../components/badge.js'
import { createDataTable } from '../../components/data-table.js'

const STATUS_TONE = { Investigating: 'warning', Confirmed: 'critical', Dismissed: 'neutral' }

function riskTone(score) {
  if (score >= 70) return 'critical'
  if (score >= 50) return 'warning'
  return 'neutral'
}

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'anomaly-detection', pageTitle: 'Anomaly Detection' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountAnomalyDetection() {
  const { stats, timeline, anomalies } = getAnomalyDetectionData()
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

  const demoBannerHTML = `
    <div class="mb-4 flex items-center gap-3 rounded-lg border border-info-200 bg-info-50 p-3.5 text-xs text-info-800 shadow-sm" role="status">
      <span class="font-semibold text-info-900">Demo Risk Engine Mode:</span>
      <span>Anomaly detection models are currently using simulated risk score data (ML service pending integration).</span>
    </div>`

  $('#page-content').html(`
    ${header}
    ${demoBannerHTML}
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${statCards.join('')}</div>
    <div class="mb-6">${timelineChart}</div>
    <h2 class="mb-3 text-sm font-semibold text-neutral-900">Flagged Anomalies</h2>
    <div id="anomalies-table"></div>
  `)

  const table = await createDataTable({
    container: '#anomalies-table',
    columns: [
      { key: 'detectedAt', label: 'Detected', sortable: false },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'entity', label: 'Entity', sortable: true },
      { key: 'riskScore', label: 'Risk Score', sortable: true, render: (row) => badgeHTML({ label: String(row.riskScore), tone: riskTone(row.riskScore) }) },
      { key: 'status', label: 'Status', sortable: true, render: (row) => badgeHTML({ label: row.status, tone: STATUS_TONE[row.status] }) },
    ],
    data: anomalies,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['type', 'entity'],
    filters: [{ key: 'status', label: 'Status', options: ['Investigating', 'Confirmed', 'Dismissed'] }],
    rowActionsHTML: (row) =>
      row.status === 'Investigating'
        ? `
        <button type="button" class="js-row-confirm flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-anomaly-id="${row.id}">${xIcon} Confirm threat</button>
        <button type="button" class="js-row-dismiss flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-anomaly-id="${row.id}">${checkIcon} Dismiss</button>
      `
        : `<span class="block px-3 py-2 text-sm text-neutral-400">${row.status}</span>`,
    emptyState: { title: 'No anomalies match your search' },
  })

  $('#anomalies-table').on('click', '.js-row-confirm', function () {
    const id = $(this).data('anomaly-id')
    anomalies.find((a) => a.id === id).status = 'Confirmed'
    table.setData(anomalies)
    showToast({ level: 'critical', title: 'Anomaly confirmed as a threat' })
  })
  $('#anomalies-table').on('click', '.js-row-dismiss', function () {
    const id = $(this).data('anomaly-id')
    anomalies.find((a) => a.id === id).status = 'Dismissed'
    table.setData(anomalies)
    showToast({ level: 'success', title: 'Anomaly dismissed' })
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountAnomalyDetection()
})
