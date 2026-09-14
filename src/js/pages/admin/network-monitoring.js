import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getNetworkMonitoringData } from '../../config/mock-network-monitoring-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { statCardHTML } from '../../components/stat-card.js'
import { timelineChartHTML } from '../../components/timeline-chart.js'
import { badgeHTML } from '../../components/badge.js'
import { resourceListItemHTML, resourceListCardHTML } from '../../components/resource-list-item.js'

const ENDPOINT_STATUS_TONE = { Up: 'success', Degraded: 'warning', Down: 'critical' }

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'network-monitoring', pageTitle: 'Network Monitoring' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountNetworkMonitoring() {
  const { stats, trafficTimeline, endpoints } = getNetworkMonitoringData()

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Network Monitoring'],
    title: 'Network Monitoring',
    description: 'Traffic, latency, and endpoint health across the network.',
  })

  const statCards = await Promise.all([
    statCardHTML({ label: 'Uptime', value: stats.uptime.value, iconName: 'signal', tone: 'success', trend: stats.uptime.trend }),
    statCardHTML({ label: 'Throughput In', value: stats.throughputIn.value, iconName: 'globe-alt', tone: 'primary', trend: stats.throughputIn.trend }),
    statCardHTML({ label: 'Throughput Out', value: stats.throughputOut.value, iconName: 'globe-alt', tone: 'primary', trend: stats.throughputOut.trend }),
    statCardHTML({ label: 'Latency', value: stats.latency.value, iconName: 'clock', tone: 'neutral', trend: stats.latency.trend }),
  ])

  const timeline = timelineChartHTML({ title: 'Network Traffic (Mbps, 7-day)', data: trafficTimeline })

  const endpointRows = await Promise.all(
    endpoints.map((endpoint) =>
      resourceListItemHTML({
        iconName: endpoint.iconName,
        title: endpoint.name,
        meta: `${endpoint.location} · ${endpoint.latency} · Checked ${endpoint.lastChecked}`,
        badgeHTML: badgeHTML({ label: endpoint.status, tone: ENDPOINT_STATUS_TONE[endpoint.status] }),
      })
    )
  )

  const demoBannerHTML = `
    <div class="mb-4 flex items-center gap-3 rounded-lg border border-info-200 bg-info-50 p-3.5 text-xs text-info-800 shadow-sm" role="status">
      <span class="font-semibold text-info-900">Demo Telemetry Mode:</span>
      <span>Network monitoring metrics are currently using simulated telemetry data (ML service pending integration).</span>
    </div>`

  $('#page-content').html(`
    ${header}
    ${demoBannerHTML}
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">${statCards.join('')}</div>
    <div class="mb-6">${timeline}</div>
    <h2 class="mb-3 text-sm font-semibold text-neutral-900">Monitored Endpoints</h2>
    ${resourceListCardHTML(endpointRows)}
  `)
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountNetworkMonitoring()
})
