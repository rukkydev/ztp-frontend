import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { getNotificationPreferences } from '../../config/mock-notification-preferences.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { buttonHTML } from '../../components/button.js'
import { setSubmitting } from '../../components/form-field.js'
import { toggleSwitchHTML } from '../../components/toggle-switch.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

registerIconPlugin($)

let preferences = null

async function loadPreferences() {
  try {
    const res = await apiGet('/account/notification-preferences')
    preferences = res && res.data ? res.data : res
  } catch (err) {
    preferences = getNotificationPreferences()
    showToast({ level: 'warning', title: 'Offline preferences', message: 'Could not load notification preferences from server.' })
  }
}

function toggleGroupHTML(title, channel, items = [], subtitle = '') {
  const rows = items.map((item) => {
    const key = item.eventKey || item.id
    const toggleId = `${channel}-${key}`
    return toggleSwitchHTML({
      id: toggleId,
      label: item.label,
      description: item.description || '',
      checked: item.checked,
    })
  }).join('')

  const subtitleHTML = subtitle ? `<p class="mb-3 text-xs text-neutral-400">${subtitle}</p>` : ''

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
    <h2 class="mb-0.5 text-sm font-semibold text-neutral-900">${title}</h2>
    ${subtitleHTML}
    <div class="divide-y divide-neutral-100">${rows}</div>
  </div>`
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'notifications', pageTitle: 'Notification Settings' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function renderNotificationSettings() {
  if (!preferences) await loadPreferences()

  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Notification Settings'],
    title: 'Notification Settings',
    description: 'Choose what you want to hear about, and how.',
  })

  $('#page-content').html(`
    ${header}
    <form id="notification-form" class="flex max-w-2xl flex-col gap-6">
      ${toggleGroupHTML('Push', 'push', preferences.push || [], 'Controls in-app notifications displayed in the topbar bell menu.')}
      ${toggleGroupHTML('Email', 'email', preferences.email || [], 'Configure email notifications for account events (security OTPs and password resets send immediately).')}
      <div>${buttonHTML({ variant: 'primary', label: 'Save preferences', type: 'submit', attrs: { id: 'save-notifications-btn' } })}</div>
    </form>
  `)

  $('#notification-form').on('submit', async function (e) {
    e.preventDefault()

    const emailUpdates = []
    const pushUpdates = []

    ;(preferences.email || []).forEach((item) => {
      const key = item.eventKey || item.id
      const toggleId = `email-${key}`
      const isChecked = $(`#${toggleId}`).is(':checked')
      emailUpdates.push({ eventKey: key, checked: isChecked })
    })

    ;(preferences.push || []).forEach((item) => {
      const key = item.eventKey || item.id
      const toggleId = `push-${key}`
      const isChecked = $(`#${toggleId}`).is(':checked')
      pushUpdates.push({ eventKey: key, checked: isChecked })
    })

    const payload = {
      email: emailUpdates,
      push: pushUpdates,
    }

    const restore = setSubmitting($('#save-notifications-btn'), 'Saving…')

    try {
      const res = await apiPatch('/account/notification-preferences', payload)
      const updated = res && res.data ? res.data : res
      preferences = updated || preferences
      showToast({ level: 'success', title: 'Notification preferences saved' })
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({ level: 'critical', title: 'Save failed', message: err.data?.message || 'Could not save notification preferences.' })
      } else {
        showToast({ level: 'critical', title: 'Save failed', message: 'An unexpected error occurred.' })
      }
    } finally {
      restore()
    }
  })
}

$(async function () {
  await requireAuth()
  await mountShell()
  await loadPreferences()
  await renderNotificationSettings()
})
