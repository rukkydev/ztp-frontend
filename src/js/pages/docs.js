import '../../styles/main.css'

import $ from '../core/dom.js'
import { icon, registerIconPlugin } from '../utils/icons.js'
import { publicNavHTML } from '../components/public-nav.js'

registerIconPlugin($)

const TECH_STACK = [
  { label: 'Vite', description: 'Build tool and dev server' },
  { label: 'Tailwind CSS v4', description: 'Design tokens + utility classes (see tokens.css)' },
  { label: 'jQuery', description: 'DOM manipulation and event wiring' },
  { label: 'Heroicons', description: 'Icons, inlined from the npm package — no CDN' },
]

const AREAS = [
  { iconName: 'building-office', title: 'Admin', description: 'Full sidebar nav for staff managing the platform — every user, device, session, and setting across the organization.' },
  { iconName: 'user-circle', title: 'Account', description: "A lighter area for a signed-in person managing their own access — profile, devices, sessions, notifications." },
  { iconName: 'lock-closed', title: 'Auth', description: 'Shared by both — login, verification, and the error/status screens for when something blocks access.' },
]

const PAGE_DIRECTORY = [
  {
    group: 'Admin',
    basePath: '/admin/',
    pages: [
      ['dashboard.html', 'Dashboard'],
      ['users.html', 'Users'],
      ['devices.html', 'Devices'],
      ['sessions.html', 'Sessions'],
      ['alerts.html', 'Alerts'],
      ['threats.html', 'Threats'],
      ['activity-logs.html', 'Activity Logs'],
      ['network-monitoring.html', 'Network Monitoring'],
      ['anomaly-detection.html', 'Anomaly Detection'],
      ['reports.html', 'Reports'],
      ['roles-permissions.html', 'Roles & Permissions'],
      ['settings.html', 'Settings'],
    ],
  },
  {
    group: 'Account',
    basePath: '/account/',
    pages: [
      ['index.html', 'Overview'],
      ['profile.html', 'Profile'],
      ['devices.html', 'My Devices'],
      ['sessions.html', 'My Sessions'],
      ['notification-settings.html', 'Notification Settings'],
    ],
  },
  {
    group: 'Auth',
    basePath: '/auth/',
    pages: [
      ['login.html', 'Login'],
      ['forgot-password.html', 'Forgot Password'],
      ['reset-password.html', 'Reset Password'],
      ['verify-device.html', 'Verify Device'],
      ['two-factor.html', 'Two-Factor Authentication'],
      ['session-expired.html', 'Session Expired'],
      ['unauthorized.html', 'Unauthorized'],
      ['access-denied.html', 'Access Denied'],
    ],
  },
]

function sectionHeaderHTML(title) {
  return `<h2 class="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">${title}</h2>`
}

async function areaCardHTML({ iconName, title, description }) {
  const iconSvg = await icon(iconName, { className: 'w-5 h-5 text-primary-600' })
  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <span class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">${iconSvg}</span>
    <h3 class="mb-1 text-sm font-semibold text-neutral-900">${title}</h3>
    <p class="text-sm text-neutral-500">${description}</p>
  </div>`
}

function directoryCardHTML({ group, basePath, pages }) {
  const links = pages
    .map(([file, label]) => `<a href="${basePath}${file}" class="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">${label}</a>`)
    .join('')

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-2 shadow-[var(--shadow-subtle)]">
    <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">${group}</p>
    <div class="flex flex-col">${links}</div>
  </div>`
}

async function render() {
  const nav = await publicNavHTML()
  const areaCards = await Promise.all(AREAS.map(areaCardHTML))
  const directoryCards = PAGE_DIRECTORY.map(directoryCardHTML)

  const techStackRows = TECH_STACK.map(
    (t) => `
    <div class="flex items-baseline justify-between gap-4 py-2.5">
      <span class="text-sm font-medium text-neutral-800">${t.label}</span>
      <span class="text-right text-sm text-neutral-500">${t.description}</span>
    </div>`
  ).join('')

  $('#app').html(`
    ${nav}
    <main class="mx-auto max-w-3xl px-6 py-16">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-primary-600">Documentation</p>
      <h1 class="mb-4 text-3xl font-semibold tracking-tight text-neutral-900">Project overview</h1>
      <p class="max-w-2xl text-base leading-relaxed text-neutral-500">
        ZTP (Zero Trust Platform) is an enterprise security dashboard: continuous monitoring, access
        management, and audit-ready logging for every user, device, and session in an organization.
        This overview is for anyone browsing the frontend — what exists, how it's organized, and what's
        real versus placeholder.
      </p>

      <section class="mt-12">
        ${sectionHeaderHTML('Tech stack')}
        <div class="rounded-lg border border-neutral-200 bg-white px-5 shadow-[var(--shadow-subtle)]">
          <div class="divide-y divide-neutral-100">${techStackRows}</div>
        </div>
      </section>

      <section class="mt-12">
        ${sectionHeaderHTML('Areas')}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">${areaCards.join('')}</div>
      </section>

      <section class="mt-12">
        ${sectionHeaderHTML('Page directory')}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">${directoryCards.join('')}</div>
      </section>

      <section class="mt-12 rounded-lg border border-warning-500/20 bg-warning-50 p-5">
        <h2 class="mb-1 text-sm font-semibold text-neutral-900">Data &amp; backend status</h2>
        <p class="text-sm text-neutral-600">
          Every page runs on placeholder data — there's no real backend yet. Each page's data comes from a
          <code class="rounded bg-white px-1 py-0.5 text-xs">mock-*.js</code> file under
          <code class="rounded bg-white px-1 py-0.5 text-xs">src/js/config/</code>, and every action that
          would write somewhere real (save, delete, sign out, generate) is a clearly commented placeholder
          instead of an actual request. See the project README for the full breakdown of what's built and
          what each piece is waiting on.
        </p>
      </section>
    </main>

    <footer class="border-t border-neutral-200">
      <div class="mx-auto max-w-3xl px-6 py-8 text-xs text-neutral-400">
        ZTP — Zero Trust Platform. Internal security dashboard.
      </div>
    </footer>
  `)
}

$(render)
