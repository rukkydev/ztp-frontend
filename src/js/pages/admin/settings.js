import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getPlatformSettings, SESSION_TIMEOUT_OPTIONS } from '../../config/mock-platform-settings.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { buttonHTML } from '../../components/button.js'
import { toggleSwitchHTML } from '../../components/toggle-switch.js'
import { textFieldHTML, selectFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

registerIconPlugin($)

let settings = null
let isOffline = false

async function loadSettings() {
  try {
    const res = await apiGet('/admin/settings')
    settings = res && res.data ? res.data : res
    isOffline = false
  } catch (err) {
    isOffline = true
    if (err instanceof ApiError && err.status === 403) {
      showToast({ level: 'critical', title: 'Access denied', message: 'You need SUPER_ADMIN permissions to view or edit platform settings.' })
    } else {
      showToast({ level: 'warning', title: 'Offline settings', message: 'Could not load settings from server.' })
    }
    settings = getPlatformSettings()
  }
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'settings', pageTitle: 'Settings' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function renderSettings() {
  if (!settings) await loadSettings()

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Settings'],
    title: 'Settings',
    description: 'Platform-wide configuration for the organization.',
  })

  const rawToggles = settings.security?.toggles || []
  const securityTogglesHTML = rawToggles.map((t) => {
    return toggleSwitchHTML({
      id: `toggle-${t.key || t.id}`,
      label: t.label,
      description: t.description || '',
      checked: t.enabled !== undefined ? Boolean(t.enabled) : Boolean(t.checked),
    })
  }).join('')

  const currentTimeout = String(settings.security?.sessionTimeout || 30)
  const hasMatchingOption = SESSION_TIMEOUT_OPTIONS.some((opt) => opt.value === currentTimeout)
  const timeoutOptions = hasMatchingOption
    ? SESSION_TIMEOUT_OPTIONS
    : [...SESSION_TIMEOUT_OPTIONS, { value: currentTimeout, label: `${currentTimeout} minutes` }]

  const orgNameVal = settings.general?.orgName || ''
  const supportEmailVal = settings.general?.supportEmail || ''

  const offlineBannerHTML = isOffline
    ? `<div class="mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm max-w-2xl" role="alert">
        <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
        <span>Could not connect to live API server. Showing cached default platform settings.</span>
      </div>`
    : ''

  $('#page-content').html(`
    ${header}
    ${offlineBannerHTML}
    <form id="settings-form" novalidate class="flex max-w-2xl flex-col gap-6">
      <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
        <h2 class="mb-4 text-sm font-semibold text-neutral-900">General</h2>
        ${textFieldHTML({ id: 'org-name', label: 'Organization name', required: false })}
        ${textFieldHTML({ id: 'support-email', label: 'Support email', type: 'email', required: false })}
      </div>

      <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
        <h2 class="mb-1 text-sm font-semibold text-neutral-900">Security Policy</h2>
        <div class="divide-y divide-neutral-100">${securityTogglesHTML}</div>
        <div class="mt-4 max-w-xs">
          ${selectFieldHTML({ id: 'session-timeout', label: 'Session timeout', options: timeoutOptions, value: currentTimeout })}
        </div>
        <p class="mt-4 rounded-lg bg-neutral-50 border border-neutral-100 p-3 text-xs text-neutral-500">
          Note: Security policy configuration is saved to the platform database. Enforcement integration across active services takes effect on deployment.
        </p>
      </div>

      <div>${buttonHTML({ variant: 'primary', label: 'Save settings', type: 'submit', attrs: { id: 'save-settings-btn' } })}</div>
    </form>
  `)

  $('#org-name').val(orgNameVal)
  $('#support-email').val(supportEmailVal)

  $('#settings-form').on('submit', async function (e) {
    e.preventDefault()
    const $form = $(this)
    clearAllFieldErrors($form)

    const orgName = $form.find('#org-name').val().trim()
    const supportEmail = $form.find('#support-email').val().trim()
    let firstErrorField = null

    if (supportEmail && !isValidEmail(supportEmail)) {
      fieldError($form, 'support-email', 'Enter a valid email address.')
      firstErrorField = 'support-email'
    }

    if (firstErrorField) {
      $form.find(`#${firstErrorField}`).trigger('focus')
      return
    }

    const restore = setSubmitting($('#save-settings-btn'), 'Saving…')

    const toggleUpdates = rawToggles.map((t) => {
      const key = t.key || t.id
      const isChecked = $(`#toggle-${key}`).is(':checked')
      return { key, enabled: isChecked }
    })

    const timeoutMinutes = parseInt($form.find('#session-timeout').val(), 10) || 30

    const payload = {
      general: {
        orgName: orgName || null,
        supportEmail: supportEmail || null,
      },
      security: {
        sessionTimeout: timeoutMinutes,
        toggles: toggleUpdates,
      },
    }

    try {
      const res = await apiPatch('/admin/settings', payload)
      const updated = res && res.data ? res.data : res
      settings = updated || settings
      showToast({ level: 'success', title: 'Settings saved' })
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({ level: 'critical', title: 'Save failed', message: err.data?.message || err.message || 'Could not save settings.' })
      } else {
        showToast({ level: 'critical', title: 'Save failed', message: 'An unexpected error occurred.' })
      }
    } finally {
      restore()
    }
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await loadSettings()
  await renderSettings()
})
