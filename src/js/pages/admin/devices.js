import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPatch } from '../../core/api-client.js'
import { getAdminDevices } from '../../config/mock-admin-devices-data.js'

const STATUS_TONE = { Trusted: 'success', Blocked: 'critical', Pending: 'warning' }

registerIconPlugin($)

function formatRelativeTime(createdAt) {
  if (!createdAt) return 'Unknown'
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function parseUserAgent(ua) {
  if (!ua) return { name: 'Unknown Device', os: 'Unknown OS', iconName: 'computer-desktop' }
  const uaLower = ua.toLowerCase()
  let name = 'Device'
  let os = 'Unknown OS'
  let iconName = 'computer-desktop'

  if (uaLower.includes('iphone')) {
    name = 'iPhone'
    os = 'iOS'
    iconName = 'device-phone-mobile'
  } else if (uaLower.includes('ipad')) {
    name = 'iPad'
    os = 'iPadOS'
    iconName = 'device-tablet'
  } else if (uaLower.includes('android')) {
    name = 'Android Device'
    os = 'Android'
    iconName = 'device-phone-mobile'
    if (uaLower.includes('tablet')) {
      iconName = 'device-tablet'
    }
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    name = 'Mac'
    os = 'macOS'
    iconName = 'computer-desktop'
  } else if (uaLower.includes('windows')) {
    name = 'Windows PC'
    os = 'Windows'
    iconName = 'computer-desktop'
  } else if (uaLower.includes('linux')) {
    name = 'Linux PC'
    os = 'Linux'
    iconName = 'computer-desktop'
  }

  return { name, os, iconName }
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'devices', pageTitle: 'Devices' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountDevicesTable() {
  const deviceIcons = {
    'computer-desktop': await icon('computer-desktop', { className: 'w-4 h-4 text-neutral-400' }),
    'device-phone-mobile': await icon('device-phone-mobile', { className: 'w-4 h-4 text-neutral-400' }),
    'device-tablet': await icon('device-tablet', { className: 'w-4 h-4 text-neutral-400' }),
  }
  const noSymbolIcon = await icon('no-symbol', { className: 'w-4 h-4' })
  const checkIcon = await icon('check-circle', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Devices'],
    title: 'Devices',
    description: 'Every device enrolled across the organization.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample device records.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="devices-table"></div>`)

  let devices = []

  const refreshDevices = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/devices')
      const liveData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res)
        ? res
        : null

      if (Array.isArray(liveData)) {
        devices = liveData
        $('#offline-banner').addClass('hidden')
      } else {
        devices = getAdminDevices()
        $('#offline-banner').removeClass('hidden')
      }
    } catch (err) {
      devices = getAdminDevices()
      $('#offline-banner').removeClass('hidden')
    } finally {
      table.setLoading(false)
      table.setData(devices)
    }
  }

  const table = await createDataTable({
    container: '#devices-table',
    columns: [
      {
        key: 'userAgent',
        label: 'Device',
        sortable: true,
        render: (row) => {
          const { name, iconName } = row.userAgent ? parseUserAgent(row.userAgent) : { name: row.name || 'Device', iconName: row.iconName || 'computer-desktop' }
          return `<span class="flex items-center gap-2">${deviceIcons[iconName] || ''}${escapeHTML(name)}</span>`
        },
      },
      { key: 'userId', label: 'Owner', sortable: true, render: (row) => row.userId ? `User #${row.userId}` : escapeHTML(row.owner || 'Unknown') },
      {
        key: 'os',
        label: 'OS',
        sortable: true,
        render: (row) => {
          const { os } = row.userAgent ? parseUserAgent(row.userAgent) : { os: row.os || '' }
          return escapeHTML(os)
        },
      },
      { key: 'status', label: 'Status', sortable: true, render: (row) => badgeHTML({ label: row.status, tone: STATUS_TONE[row.status] }) },
      { key: 'ipAddress', label: 'IP / Location', sortable: true, render: (row) => escapeHTML(row.ipAddress || row.location || 'Unknown') },
      { key: 'lastSeenAt', label: 'Last Active', sortable: true, render: (row) => row.lastSeenAt ? formatRelativeTime(row.lastSeenAt) : row.lastActive || 'Unknown' },
    ],
    data: devices,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['userAgent', 'ipAddress', 'userId'],
    filters: [
      { key: 'status', label: 'Status', options: ['Trusted', 'Blocked', 'Pending'] },
    ],
    bulkActions: [
      {
        label: 'Block selected',
        tone: 'danger',
        onClick: async (rows) => {
          const ok = await confirmDialog({
            title: `Block ${rows.length} device${rows.length === 1 ? '' : 's'}?`,
            message: 'Blocked devices are immediately signed out and cannot be used to sign in until unblocked.',
            confirmLabel: 'Block',
            tone: 'danger',
          })
          if (ok) {
            try {
              table.setLoading(true)
              const ids = rows.map((r) => r.id)
              await apiPatch('/admin/devices/bulk-block', { ids })
              await refreshDevices()
              showToast({ level: 'critical', title: `${rows.length} device${rows.length === 1 ? '' : 's'} blocked` })
            } catch (err) {
              showToast({ level: 'critical', title: 'Action failed', message: 'Could not block some devices.' })
            } finally {
              table.setLoading(false)
            }
          }
        },
      },
    ],
    rowActionsHTML: (row) => `
      ${
        row.status !== 'Blocked'
          ? `<button type="button" class="js-row-block flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-device-id="${row.id}">${noSymbolIcon} Block</button>`
          : ''
      }
      ${
        row.status !== 'Trusted'
          ? `<button type="button" class="js-row-trust flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-device-id="${row.id}">${checkIcon} Trust</button>`
          : ''
      }
    `,
    emptyState: { title: 'No devices match your search', message: 'Try a different search term or clear your filters.' },
  })

  $('#devices-table').on('click', '.js-row-block', async function () {
    const deviceId = $(this).data('device-id')
    const ok = await confirmDialog({
      title: 'Block this device?',
      message: 'It will be immediately signed out and cannot be used to sign in until unblocked.',
      confirmLabel: 'Block',
      tone: 'danger',
    })
    if (ok) {
      try {
        await apiPatch(`/admin/devices/${deviceId}`, { status: 'Blocked' })
        await refreshDevices()
        showToast({ level: 'critical', title: 'Device blocked' })
      } catch (err) {
        showToast({ level: 'critical', title: 'Action failed', message: 'Could not block device.' })
      }
    }
  })

  $('#devices-table').on('click', '.js-row-trust', async function () {
    const deviceId = $(this).data('device-id')
    const ok = await confirmDialog({
      title: 'Trust this device?',
      message: 'It will be marked as trusted and allowed to authenticate.',
      confirmLabel: 'Trust',
      tone: 'success',
    })
    if (ok) {
      try {
        await apiPatch(`/admin/devices/${deviceId}`, { status: 'Trusted' })
        await refreshDevices()
        showToast({ level: 'success', title: 'Device marked as trusted' })
      } catch (err) {
        showToast({ level: 'critical', title: 'Action failed', message: 'Could not trust device.' })
      }
    }
  })

  // Initial fetch
  await refreshDevices()
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountDevicesTable()
})
