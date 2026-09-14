import '../../styles/main.css'

import $ from '../core/dom.js'
import { icon, registerIconPlugin } from '../utils/icons.js'
import { publicNavHTML } from '../components/public-nav.js'
import { buttonHTML } from '../components/button.js'
import { getNetworkMonitoringData } from '../config/mock-network-monitoring-data.js'

registerIconPlugin($)

const FEATURES = [
  { iconName: 'chart-bar', title: 'Continuous Monitoring', description: 'Live visibility into users, devices, and sessions across the organization, all in one dashboard.' },
  { iconName: 'shield-exclamation', title: 'Threat Detection', description: 'Threats and behavioral anomalies are flagged automatically, with risk scoring to prioritize what matters.' },
  { iconName: 'users', title: 'Access Management', description: 'Role-based permissions decide exactly what each person can see and do — nothing is granted by default.' },
  { iconName: 'device-tablet', title: 'Device & Session Control', description: 'Every enrolled device and active session can be reviewed, and revoked, from a single place.' },
  { iconName: 'document-text', title: 'Audit-Ready Logging', description: 'Every account and administrative action is recorded, searchable, and filterable by date range.' },
  { iconName: 'document-arrow-down', title: 'Compliance Reporting', description: 'Generate compliance, security, and usage reports on demand for review or audit.' },
]

async function statusItemHTML({ label, tone }) {
  const dotClass = { success: 'bg-success-500', primary: 'bg-primary-500', neutral: 'bg-neutral-400' }[tone]
  return `<span class="flex items-center gap-2 text-sm text-neutral-600"><span class="h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}"></span>${label}</span>`
}

async function featureCardHTML({ iconName, title, description }) {
  const iconSvg = await icon(iconName, { className: 'w-5 h-5 text-primary-600' })
  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
    <span class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">${iconSvg}</span>
    <h3 class="mb-1.5 text-sm font-semibold text-neutral-900">${title}</h3>
    <p class="text-sm text-neutral-500">${description}</p>
  </div>`
}

async function render() {
  const network = getNetworkMonitoringData()

  const nav = await publicNavHTML()

  const statusItems = await Promise.all([
    statusItemHTML({ label: `${network.stats.uptime.value} uptime`, tone: 'success' }),
    statusItemHTML({ label: '24 active users', tone: 'primary' }),
    statusItemHTML({ label: '32 total users', tone: 'neutral' }),
  ])

  const featureCards = await Promise.all(FEATURES.map(featureCardHTML))

  $('#app').html(`
    ${nav}
    <main>
      <section class="mx-auto max-w-5xl px-6 pb-16 pt-20">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-primary-600">Zero Trust Platform</p>
        <h1 class="max-w-2xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">Never trust. Always verify.</h1>
        <p class="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
          ZTP continuously verifies every user, device, and session before granting access —
          so trust is never assumed across your organization, only proven, one verification at a time.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          ${buttonHTML({ variant: 'primary', label: 'Sign in', href: '/auth/login.html' })}
          ${buttonHTML({ variant: 'secondary', label: 'View documentation', href: '/docs.html' })}
        </div>
        <div class="mt-12 inline-flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-neutral-200 bg-white px-6 py-4 shadow-[var(--shadow-subtle)]">
          ${statusItems.join('')}
        </div>
      </section>

      <section class="border-t border-neutral-200 bg-neutral-50 py-16">
        <div class="mx-auto max-w-5xl px-6">
          <h2 class="mb-8 text-xs font-semibold uppercase tracking-wide text-neutral-400">What ZTP monitors</h2>
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">${featureCards.join('')}</div>
        </div>
      </section>
    </main>

    <footer class="border-t border-neutral-200">
      <div class="mx-auto max-w-5xl px-6 py-8 text-xs text-neutral-400">
        ZTP — Zero Trust Platform. Internal security dashboard.
      </div>
    </footer>
  `)
}

$(render)
