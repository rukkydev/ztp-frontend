import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { resourceListItemHTML, resourceListCardHTML } from '../../components/resource-list-item.js'
import { apiGet, apiDelete } from '../../core/api-client.js'
import { getMyDevices } from '../../config/mock-account-security-data.js'

registerIconPlugin($)

let devices = []

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
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'devices', pageTitle: 'My Devices' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function renderDevices() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'My Devices'],
    title: 'My Devices',
    description: 'Devices that are currently trusted to sign in without extra verification.',
  })

  const currentDeviceId = localStorage.getItem('ztp_device_id')

  const rows = await Promise.all(
    devices.map((device) => {
      let name, os, iconName
      if (device.userAgent) {
        const parsed = parseUserAgent(device.userAgent)
        name = parsed.name
        os = parsed.os
        iconName = parsed.iconName
      } else {
        name = device.name || 'Device'
        os = device.os || ''
        iconName = device.iconName || 'computer-desktop'
      }

      const isCurrent = Boolean(device.isCurrent || String(device.id) === currentDeviceId)
      const ipStr = device.ipAddress ? `IP: ${device.ipAddress} · ` : device.location ? `${device.location} · ` : ''
      const lastActiveStr = device.lastSeenAt ? `Last active ${formatRelativeTime(device.lastSeenAt)}` : device.lastActive || ''
      const meta = `${os} · ${ipStr}${lastActiveStr}`
      
      return resourceListItemHTML({
        iconName,
        title: name,
        meta,
        badgeHTML: isCurrent ? badgeHTML({ label: 'This device', tone: 'primary' }) : '',
        actionHTML: isCurrent
          ? ''
          : buttonHTML({ variant: 'ghost', size: 'sm', label: 'Remove', className: 'js-remove-device', attrs: { 'data-device-id': device.id } }),
      })
    })
  )

  $('#page-content').html(`
    ${header}
    ${resourceListCardHTML(rows, { title: 'No registered devices found', message: 'You have no trusted devices registered.' })}
  `)

  $('.js-remove-device').off('click').on('click', async function () {
    const deviceId = $(this).data('device-id')
    const device = devices.find((d) => d.id === deviceId)
    const { name } = device?.userAgent ? parseUserAgent(device.userAgent) : { name: device?.name || 'Device' }

    const ok = await confirmDialog({
      title: 'Remove this device?',
      message: `${name} will need to verify its identity again the next time it's used to sign in.`,
      confirmLabel: 'Remove device',
      tone: 'danger',
    })

    if (ok) {
      try {
        await apiDelete(`/account/devices/${deviceId}`)
        showToast({ level: 'success', title: 'Device removed' })
        await refreshDevices()
      } catch (err) {
        showToast({
          level: 'critical',
          title: 'Failed to remove device',
          message: err.message || 'The request could not be completed.'
        })
      }
    }
  })
}

async function refreshDevices() {
  try {
    const res = await apiGet('/account/devices', { optional: true })
    const liveData = res && res.data ? res.data : Array.isArray(res) ? res : []
    devices = liveData.length > 0 ? liveData : getMyDevices()
  } catch (err) {
    devices = getMyDevices()
  }
  await renderDevices()
}

$(async function () {
  await requireAuth()
  await mountShell()
  await refreshDevices()
})
