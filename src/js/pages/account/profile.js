import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { getCurrentUserProfile } from '../../config/mock-profile-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, modalHTML, openModal, closeModal, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { buttonHTML } from '../../components/button.js'
import { badgeHTML } from '../../components/badge.js'
import { textFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { API_BASE_URL, apiGet, apiPatch, apiPost, apiPut, ApiError } from '../../core/api-client.js'
import { getAvatarSrc, initials } from '../../utils/avatar.js'

registerIconPlugin($)

let profile = null
let recoveryPhraseConfigured = false

async function loadProfile() {
  try {
    const res = await apiGet('/account/profile', { optional: true })
    profile = res && res.data ? res.data : res
  } catch (err) {
    profile = getCurrentUserProfile()
    showToast({ level: 'warning', title: 'Using offline profile', message: 'Could not load profile from server.' })
  }

  try {
    const statusRes = await apiGet('/account/security/recovery-phrase/status', { optional: true })
    recoveryPhraseConfigured = statusRes && typeof statusRes.data === 'boolean' ? statusRes.data : statusRes === true
  } catch {
    recoveryPhraseConfigured = false
  }
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'profile', pageTitle: 'Profile' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function detailRowHTML({ iconName, label, value }) {
  const iconSvg = await icon('envelope', { className: 'w-4 h-4 text-neutral-400' })
  return `
  <div class="flex items-start gap-3">
    <span class="mt-0.5">${iconSvg}</span>
    <div class="min-w-0">
      <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">${label}</p>
      <p class="mt-0.5 text-sm text-neutral-700">${escapeHTML(value || '—')}</p>
    </div>
  </div>`
}

async function showRecoveryPhraseModal(rawPhrase) {
  const words = String(rawPhrase).trim().split(/\s+/)
  const copyIcon = await icon('clipboard', { className: 'w-4 h-4' })
  const modalId = 'recovery-phrase-display-modal'

  const bodyHTML = `
    <div class="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800">
      <p class="font-semibold text-warning-900 mb-1">Save this recovery phrase now!</p>
      <p>This 12-word phrase is shown <strong>exactly once</strong> and can never be retrieved again. If you lose access to your email, this phrase is your only way to recover your account.</p>
    </div>

    <div class="my-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono">
      ${words
        .map(
          (w, idx) => `
        <div class="flex items-center gap-2 rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
          <span class="text-neutral-400 select-none font-sans font-medium w-4">${idx + 1}.</span>
          <span class="font-semibold text-neutral-800">${escapeHTML(w)}</span>
        </div>`
        )
        .join('')}
    </div>

    <div class="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3">
      <button type="button" id="copy-phrase-btn" class="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700">
        ${copyIcon} Copy phrase to clipboard
      </button>
    </div>

    <label class="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
      <input type="checkbox" id="confirm-phrase-saved-check" class="rounded border-neutral-300 accent-[var(--color-primary-600)]" />
      I have safely copied or written down my 12-word recovery phrase.
    </label>
  `

  const footerHTML = `
    ${buttonHTML({ variant: 'primary', label: "I've saved my phrase", attrs: { id: 'done-phrase-btn', disabled: true } })}
  `

  const modalMarkup = modalHTML({
    id: modalId,
    title: 'Your 12-Word Recovery Phrase',
    bodyHTML,
    footerHTML,
    size: 'md',
  })

  $(`#${modalId}`).remove()
  $('body').append(modalMarkup)

  $(`#copy-phrase-btn`).on('click', () => {
    navigator.clipboard.writeText(words.join(' '))
    showToast({ level: 'success', title: 'Copied to clipboard' })
  })

  $(`#confirm-phrase-saved-check`).on('change', function () {
    $(`#done-phrase-btn`).prop('disabled', !this.checked)
  })

  $(`#done-phrase-btn`).on('click', async () => {
    closeModal(modalId)
    $(`#${modalId}`).remove()
    recoveryPhraseConfigured = true
    showToast({ level: 'success', title: 'Recovery phrase saved' })
    await renderView()
  })

  openModal(modalId)
}

async function renderView() {
  if (!profile) await loadProfile()

  const cameraIcon = await icon('camera', { className: 'w-3.5 h-3.5' })

  const details = await Promise.all([
    detailRowHTML({ iconName: 'envelope', label: 'Email', value: profile.email }),
    detailRowHTML({ iconName: 'phone', label: 'Phone', value: profile.phone }),
    detailRowHTML({ iconName: 'briefcase', label: 'Job Title', value: profile.jobTitle }),
    detailRowHTML({ iconName: 'building-office', label: 'Department', value: profile.department }),
    detailRowHTML({ iconName: 'calendar', label: 'Member Since', value: profile.memberSince || profile.createdAt }),
    detailRowHTML({ iconName: 'clock', label: 'Last Login', value: profile.lastLogin || profile.lastLoginAt }),
  ])

  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Profile'],
    title: 'Profile',
    description: 'Your personal information and account details.',
  })

  const avatarUrl = profile.avatarUrl || profile.avatar_url || profile.avatar
  const avatarSrc = getAvatarSrc(avatarUrl)
  const avatarDisplayHTML = avatarSrc
    ? `<img src="${escapeHTML(avatarSrc)}" alt="Avatar" class="h-16 w-16 rounded-full object-cover border border-neutral-200 shadow-sm" onerror="this.onerror=null; this.outerHTML='<span class=\\'flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700\\'>${escapeHTML(initials(profile.fullName || profile.username))}</span>';" />`
    : `<span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700">${escapeHTML(initials(profile.fullName || profile.username))}</span>`
  
  const is2FAEnabled = Boolean(
      profile.twoFactorEnabled === true ||
      profile.twoFactorRequired === true ||
      profile.isTwoFactorEnabled === true ||
      profile.twoFactor === true ||
      profile.twoFactorAuth === true ||
      profile.hasTwoFactor === true ||
      profile.has2FA === true ||
      String(profile.twoFactorStatus || '').toLowerCase() === 'enabled' ||
      String(profile.twoFactor || '').toLowerCase() === 'enabled' ||
      String(profile.twoFactorEnabled || '').toLowerCase() === 'true'
    )

  $('#page-content').html(`
    ${header}
    <input type="file" id="avatar-file-input" accept="image/jpeg,image/png,image/webp" class="hidden" />
    <div class="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="relative">
            ${avatarDisplayHTML}
            <button type="button" id="change-photo" class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 shadow-sm" aria-label="Change photo">${cameraIcon}</button>
          </div>
          <div>
            <p class="text-lg font-semibold text-neutral-900">${escapeHTML(profile.fullName || profile.username || profile.email)}</p>
            <div class="mt-1">${badgeHTML({ label: profile.role || 'USER', tone: 'primary' })}</div>
          </div>
        </div>
        ${buttonHTML({ variant: 'secondary', label: 'Edit profile', attrs: { id: 'edit-profile-btn' } })}
      </div>

      <div class="mt-6 grid grid-cols-1 gap-5 border-t border-neutral-100 pt-6 sm:grid-cols-2">
        ${details.join('')}
      </div>
    </div>

    <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
      <h2 class="mb-3 text-sm font-semibold text-neutral-900">Security</h2>
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div>
          <p class="text-sm text-neutral-700 font-medium">Two-factor authentication</p>
          <p class="text-xs text-neutral-400">Security verification required on sign-in.</p>
        </div>
        <div class="flex items-center gap-3">
          ${badgeHTML({ label: is2FAEnabled ? 'Enabled' : 'Disabled', tone: is2FAEnabled ? 'success' : 'critical' })}
          ${buttonHTML({
            variant: is2FAEnabled ? 'secondary' : 'primary',
            label: is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA',
            attrs: { id: 'toggle-2fa-btn' },
          })}
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-4">
        <div>
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-neutral-700">Account Recovery Phrase</p>
            ${badgeHTML({
              label: recoveryPhraseConfigured ? 'Configured' : 'Not set up',
              tone: recoveryPhraseConfigured ? 'success' : 'warning',
            })}
          </div>
          <p class="mt-0.5 text-xs text-neutral-400">
            ${recoveryPhraseConfigured
              ? 'A 12-word recovery phrase is active for emergency account recovery.'
              : 'Set up a 12-word recovery phrase to regain access if you lose email access.'}
          </p>
        </div>
        ${buttonHTML({
          variant: recoveryPhraseConfigured ? 'secondary' : 'primary',
          label: recoveryPhraseConfigured ? 'Re-generate phrase' : 'Set up phrase',
          attrs: { id: 'setup-recovery-phrase-btn' },
        })}
      </div>
    </div>
  `)

  $('#toggle-2fa-btn').on('click', async () => {
    const nextState = !is2FAEnabled
    const actionLabel = nextState ? 'Enable' : 'Disable'
    const ok = await confirmDialog({
      title: `${actionLabel} two-factor authentication?`,
      message: nextState
        ? 'You will be required to verify a 6-digit code sent to your email on future sign-ins.'
        : 'You will no longer be prompted for a 2FA verification code when signing in.',
      confirmLabel: `${actionLabel} 2FA`,
      tone: nextState ? 'primary' : 'danger',
    })
    if (!ok) return

    const password = await promptPasswordModal({
      title: `${actionLabel} 2FA — Password Required`,
      subtitle: `Enter your account password to confirm ${actionLabel.toLowerCase()}ing two-factor authentication.`,
      actionLabel: `${actionLabel} 2FA`,
    })
    if (!password) return

    try {
      showToast({ level: 'info', title: 'Updating 2FA settings…' })
      const payload = {
        password: password,
        enabled: nextState,
      }
      // Try Laravel route first, then Java Spring fallback
      let res
      try {
        res = await apiPost('/account/two-factor/toggle', payload)
      } catch (e1) {
        if (!e1.status || e1.status === 404) {
          res = await apiPost('/user/two-factor/toggle', payload)
        } else {
          throw e1
        }
      }
      const updated = res && res.data ? res.data : res
      profile = {
        ...profile,
        ...(updated || {}),
        twoFactorEnabled: nextState,
        twoFactorRequired: nextState,
        twoFactor: nextState,
      }
      showToast({
        level: 'success',
        title: `2FA ${nextState ? 'enabled' : 'disabled'}`,
        message: `Two-factor authentication has been ${nextState ? 'enabled' : 'disabled'} for your account.`,
      })
      await renderView()
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not update 2FA setting.'
      showToast({ level: 'critical', title: 'Update failed', message: msg })
    }
  })

  $('#edit-profile-btn').on('click', renderEdit)

function promptPasswordModal({ title = 'Confirm Your Password', subtitle = 'Enter your password to verify your identity.', actionLabel = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const modalId = 'confirm-password-phrase-modal'

    const bodyHTML = `
      <form id="confirm-password-phrase-form" novalidate>
        <p class="mb-4 text-xs text-neutral-500">${escapeHTML(subtitle)}</p>
        ${passwordFieldHTML({ id: 'confirm-phrase-password', label: 'Current Password', autocomplete: 'current-password' })}
      </form>
    `

    const footerHTML = `
      ${buttonHTML({ variant: 'ghost', label: 'Cancel', attrs: { id: 'cancel-phrase-password-btn' } })}
      ${buttonHTML({ variant: 'primary', label: actionLabel, type: 'submit', attrs: { id: 'submit-phrase-password-btn', form: 'confirm-password-phrase-form' } })}
    `

    const modalMarkup = modalHTML({
      id: modalId,
      title,
      bodyHTML,
      footerHTML,
      size: 'sm',
    })

    $(`#${modalId}`).remove()
    $('body').append(modalMarkup)
    initPasswordToggles(document)

    const cleanup = (val) => {
      closeModal(modalId)
      setTimeout(() => $(`#${modalId}`).remove(), 150)
      resolve(val)
    }

    $(`#cancel-phrase-password-btn, #${modalId} .js-modal-close, #${modalId} .js-modal-backdrop`).on('click', () => cleanup(null))

    $(`#confirm-password-phrase-form`).on('submit', (e) => {
      e.preventDefault()
      clearAllFieldErrors($('#confirm-password-phrase-form'))
      const pwd = $('#confirm-phrase-password').val()
      if (!pwd) {
        fieldError($('#confirm-password-phrase-form'), 'confirm-phrase-password', 'Enter your password.')
        return
      }
      if (pwd.length > 72) {
        fieldError($('#confirm-password-phrase-form'), 'confirm-phrase-password', 'Password cannot be more than 72 bytes.')
        return
      }
      cleanup(pwd)
    })

    openModal(modalId)
  })
}

  $('#setup-recovery-phrase-btn').on('click', async () => {
    if (recoveryPhraseConfigured) {
      const ok = await confirmDialog({
        title: 'Re-generate recovery phrase?',
        message: 'Generating a new recovery phrase will immediately invalidate your previous phrase. Are you sure you want to proceed?',
        confirmLabel: 'Re-generate phrase',
        tone: 'danger',
      })
      if (!ok) return
    }

    const password = await promptPasswordModal()
    if (!password) return

    try {
      showToast({ level: 'info', title: 'Generating recovery phrase…' })
      const res = await apiPost('/account/security/recovery-phrase/generate', {
        password: password,
        currentPassword: password,
      })
      const phrase = res && res.data ? res.data : res
      if (phrase && typeof phrase === 'string') {
        await showRecoveryPhraseModal(phrase)
      } else {
        throw new Error('No phrase returned from server.')
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not generate recovery phrase.'
      showToast({ level: 'critical', title: 'Generation failed', message: msg })
    }
  })

  $('#change-photo').on('click', () => {
    $('#avatar-file-input').trigger('click')
  })

  $('#avatar-file-input').on('change', async function (e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast({ level: 'critical', title: 'Invalid file format', message: 'Only JPEG, PNG, and WebP image files are allowed.' })
      $(this).val('')
      return
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      showToast({ level: 'critical', title: 'File too large', message: 'The selected image exceeds the maximum allowed size of 2MB.' })
      $(this).val('')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    showToast({ level: 'info', title: 'Uploading avatar…' })

    try {
      const res = await apiPost('/account/profile/avatar', formData)
      const uploadedUrl = (res && res.data && (res.data.avatarUrl || res.data.avatar_url || res.data.avatar || (typeof res.data === 'string' ? res.data : null))) || res?.avatarUrl || res?.avatar_url || res?.avatar
      if (uploadedUrl) {
        profile.avatarUrl = uploadedUrl
        profile.avatar_url = uploadedUrl
        profile.avatar = uploadedUrl
      }
      await loadProfile()
      window.dispatchEvent(new CustomEvent('ztp:avatar-updated'))
      showToast({ level: 'success', title: 'Avatar uploaded successfully' })
      await renderView()
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not upload avatar photo.'
      showToast({ level: 'critical', title: 'Upload failed', message: msg })
    } finally {
      $(this).val('')
    }
  })
}

function renderEdit() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Profile'],
    title: 'Edit profile',
    description: 'Update your personal information.',
  })

  $('#page-content').html(`
    ${header}
    <form id="profile-form" novalidate class="max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]">
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        ${textFieldHTML({ id: 'fullName', label: 'Full name' })}
        ${textFieldHTML({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'email' })}
        ${textFieldHTML({ id: 'phone', label: 'Phone', type: 'tel', required: false })}
        ${textFieldHTML({ id: 'jobTitle', label: 'Job title', required: false })}
      </div>
      ${textFieldHTML({ id: 'department', label: 'Department', required: false })}

      <div class="flex items-center gap-2 border-t border-neutral-100 pt-5">
        ${buttonHTML({ variant: 'primary', label: 'Save changes', type: 'submit', attrs: { id: 'save-profile-btn' } })}
        ${buttonHTML({ variant: 'ghost', label: 'Cancel', attrs: { id: 'cancel-edit-btn' } })}
      </div>
    </form>
  `)

  $('#fullName').val(profile.fullName || '')
  $('#email').val(profile.email || '')
  $('#phone').val(profile.phone || '')
  $('#jobTitle').val(profile.jobTitle || '')
  $('#department').val(profile.department || '')

  $('#cancel-edit-btn').on('click', renderView)

  $('#profile-form').on('submit', async function (e) {
    e.preventDefault()
    const $form = $(this)
    clearAllFieldErrors($form)

    const fullName = $form.find('#fullName').val().trim()
    const email = $form.find('#email').val().trim()
    let firstErrorField = null

    if (!fullName) {
      fieldError($form, 'fullName', 'Enter your full name.')
      firstErrorField = firstErrorField || 'fullName'
    }
    if (!email) {
      fieldError($form, 'email', 'Enter your email address.')
      firstErrorField = firstErrorField || 'email'
    } else if (!isValidEmail(email)) {
      fieldError($form, 'email', 'Enter a valid email address.')
      firstErrorField = firstErrorField || 'email'
    }

    if (firstErrorField) {
      $form.find(`#${firstErrorField}`).trigger('focus')
      return
    }

    const restore = setSubmitting($('#save-profile-btn'), 'Saving…')
    const payload = {
      fullName,
      email,
      phone: $form.find('#phone').val().trim(),
      jobTitle: $form.find('#jobTitle').val().trim(),
      department: $form.find('#department').val().trim(),
    }

    try {
      const res = await apiPut('/account/profile', payload)
      const updated = res && res.data ? res.data : res
      profile = { ...profile, ...payload, ...(updated || {}) }
      showToast({ level: 'success', title: 'Profile updated' })
      await renderView()
    } catch (err) {
      restore()
      if (err instanceof ApiError) {
        showToast({ level: 'critical', title: 'Update failed', message: err.data?.message || 'Could not save profile.' })
      } else {
        showToast({ level: 'critical', title: 'Update failed', message: 'An unexpected error occurred.' })
      }
    }
  })
}

$(async function () {
  await requireAuth()
  await mountShell()
  await loadProfile()
  await renderView()
})
