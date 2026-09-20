import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth, getCachedUser } from '../../core/auth-guard.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ACCOUNT_NAV_GROUPS } from '../../config/account-navigation.js'
import { getCurrentUserProfile } from '../../config/mock-profile-data.js'
import { getMySessions } from '../../config/mock-account-security-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, modalHTML, openModal, closeModal, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { buttonHTML } from '../../components/button.js'
import { badgeHTML } from '../../components/badge.js'
import { textFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError } from '../../core/api-client.js'
import { getAvatarSrc, initials } from '../../utils/avatar.js'

registerIconPlugin($)

// ─── State ───────────────────────────────────────────────────────────────────
let profile = null
let sessions = []

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diffMs)) return String(dateStr)
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiGet('/account/profile', { optional: true })
    const data = res && res.data ? res.data : res
    // Merge with cached user so we always have at least username/email/role
    const cached = getCachedUser() || {}
    profile = { ...cached, ...data }
  } catch {
    profile = { ...( getCachedUser() || {}), ...getCurrentUserProfile() }
  }
}

async function loadSessions() {
  try {
    const res = await apiGet('/account/sessions', { optional: true })
    const live = res && res.data ? res.data : Array.isArray(res) ? res : []
    sessions = live.length > 0 ? live : getMySessions()
  } catch {
    sessions = getMySessions()
  }
}

// ─── Shell ────────────────────────────────────────────────────────────────────
async function mountShell() {
  const shell = await appShellHTML({ navGroups: ACCOUNT_NAV_GROUPS, currentPage: 'settings', pageTitle: 'Settings' })
  $('#app').html(shell)
  initSidebar()
  initDropdowns(document)
  initModals()
}

// ─── Password Confirm Modal ───────────────────────────────────────────────────
function promptPasswordModal({ title = 'Confirm Your Password', subtitle = 'Enter your password to verify your identity.', actionLabel = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const modalId = 'settings-confirm-password-modal'
    const bodyHTML = `
      <form id="settings-confirm-pw-form" novalidate>
        <p class="mb-4 text-xs text-neutral-500">${escapeHTML(subtitle)}</p>
        ${passwordFieldHTML({ id: 'settings-confirm-pw', label: 'Current Password', autocomplete: 'current-password' })}
      </form>`
    const footerHTML = `
      ${buttonHTML({ variant: 'ghost', label: 'Cancel', attrs: { id: 'settings-cancel-pw-btn' } })}
      ${buttonHTML({ variant: 'primary', label: actionLabel, type: 'submit', attrs: { id: 'settings-submit-pw-btn', form: 'settings-confirm-pw-form' } })}`

    $(`#${modalId}`).remove()
    $('body').append(modalHTML({ id: modalId, title, bodyHTML, footerHTML, size: 'sm' }))
    initPasswordToggles(document)

    const cleanup = (val) => {
      closeModal(modalId)
      setTimeout(() => $(`#${modalId}`).remove(), 150)
      resolve(val)
    }

    $(`#settings-cancel-pw-btn, #${modalId} .js-modal-close, #${modalId} .js-modal-backdrop`).on('click', () => cleanup(null))
    $(`#settings-confirm-pw-form`).on('submit', (e) => {
      e.preventDefault()
      clearAllFieldErrors($('#settings-confirm-pw-form'))
      const pwd = $('#settings-confirm-pw').val()
      if (!pwd) { fieldError($('#settings-confirm-pw-form'), 'settings-confirm-pw', 'Enter your password.'); return }
      cleanup(pwd)
    })
    openModal(modalId)
  })
}

// ─── Section 1: Profile Info ──────────────────────────────────────────────────
async function renderProfileSection() {
  const avatarUrl = profile.avatarUrl || profile.avatar_url || profile.avatar
  const avatarSrc = getAvatarSrc(avatarUrl)
  const displayName = profile.fullName || profile.username || profile.name || profile.email || 'User'
  const cameraIcon = await icon('camera', { className: 'w-3.5 h-3.5' })

  const avatarHTML = avatarSrc
    ? `<img src="${escapeHTML(avatarSrc)}" alt="Avatar" class="h-16 w-16 rounded-full object-cover border border-neutral-200 shadow-sm"
        onerror="this.onerror=null;this.outerHTML='<span class=\\'flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700\\'>${escapeHTML(initials(displayName))}</span>';" />`
    : `<span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700">${escapeHTML(initials(displayName))}</span>`

  const roleLabel = profile.role || profile.type || profile.userType || 'User'

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]" id="profile-section">
    <h2 class="mb-4 text-sm font-semibold text-neutral-900">Profile Information</h2>

    <div class="flex flex-wrap items-center gap-4 mb-6 pb-5 border-b border-neutral-100">
      <input type="file" id="settings-avatar-input" accept="image/jpeg,image/png,image/webp" class="hidden" />
      <div class="relative shrink-0">
        ${avatarHTML}
        <button type="button" id="settings-change-photo"
          class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 shadow-sm"
          aria-label="Change photo">${cameraIcon}</button>
      </div>
      <div>
        <p class="text-base font-semibold text-neutral-900">${escapeHTML(displayName)}</p>
        <div class="mt-1 flex items-center gap-2">
          ${badgeHTML({ label: roleLabel, tone: 'primary' })}
          ${profile.email ? `<span class="text-xs text-neutral-400">${escapeHTML(profile.email)}</span>` : ''}
        </div>
      </div>
    </div>

    <form id="settings-profile-form" novalidate>
      <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        ${textFieldHTML({ id: 'sp-fullName', label: 'Full name' })}
        ${textFieldHTML({ id: 'sp-email', label: 'Email address', type: 'email', autocomplete: 'email' })}
        ${textFieldHTML({ id: 'sp-phone', label: 'Phone', type: 'tel', required: false })}
        ${textFieldHTML({ id: 'sp-jobTitle', label: 'Job title', required: false })}
      </div>
      ${textFieldHTML({ id: 'sp-department', label: 'Department', required: false })}
      <div class="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4">
        ${buttonHTML({ variant: 'primary', label: 'Save profile', type: 'submit', attrs: { id: 'settings-save-profile-btn' } })}
      </div>
    </form>
  </div>`
}

function populateProfileForm() {
  $('#sp-fullName').val(profile.fullName || profile.name || '')
  $('#sp-email').val(profile.email || '')
  $('#sp-phone').val(profile.phone || '')
  $('#sp-jobTitle').val(profile.jobTitle || profile.title || '')
  $('#sp-department').val(profile.department || '')
}

function bindProfileSection() {
  $('#settings-change-photo').on('click', () => $('#settings-avatar-input').trigger('click'))

  $('#settings-avatar-input').on('change', async function (e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type.toLowerCase())) {
      showToast({ level: 'critical', title: 'Invalid format', message: 'Only JPEG, PNG, and WebP images are allowed.' })
      $(this).val(''); return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast({ level: 'critical', title: 'File too large', message: 'Maximum allowed size is 2 MB.' })
      $(this).val(''); return
    }
    showToast({ level: 'info', title: 'Uploading avatar…' })
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await apiPost('/account/profile/avatar', fd)
      const url = res?.data?.avatarUrl || res?.data?.avatar_url || res?.avatarUrl || res?.avatar_url
      if (url) { profile.avatarUrl = url; profile.avatar_url = url; profile.avatar = url }
      showToast({ level: 'success', title: 'Avatar updated' })
      window.dispatchEvent(new CustomEvent('ztp:avatar-updated'))
      await renderView()
    } catch (err) {
      showToast({ level: 'critical', title: 'Upload failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not upload avatar.' })
    } finally { $(this).val('') }
  })

  $('#settings-profile-form').on('submit', async function (e) {
    e.preventDefault()
    const $form = $(this)
    clearAllFieldErrors($form)

    const fullName = $form.find('#sp-fullName').val().trim()
    const email = $form.find('#sp-email').val().trim()
    let firstErr = null

    if (!fullName) { fieldError($form, 'sp-fullName', 'Enter your full name.'); firstErr = firstErr || 'sp-fullName' }
    if (!email) { fieldError($form, 'sp-email', 'Enter your email address.'); firstErr = firstErr || 'sp-email' }
    else if (!isValidEmail(email)) { fieldError($form, 'sp-email', 'Enter a valid email address.'); firstErr = firstErr || 'sp-email' }
    if (firstErr) { $form.find(`#${firstErr}`).trigger('focus'); return }

    const payload = {
      fullName,
      email,
      phone: $form.find('#sp-phone').val().trim(),
      jobTitle: $form.find('#sp-jobTitle').val().trim(),
      department: $form.find('#sp-department').val().trim(),
    }

    const restore = setSubmitting($('#settings-save-profile-btn'), 'Saving…')
    try {
      // Try PUT first (Laravel), fall back to PATCH (Java)
      let res
      try { res = await apiPut('/account/profile', payload) }
      catch (e1) {
        if (e1 instanceof ApiError && (e1.status === 404 || e1.status === 405)) {
          res = await apiPatch('/account/profile', payload)
        } else { throw e1 }
      }
      const updated = res && res.data ? res.data : res
      profile = { ...profile, ...payload, ...(updated || {}) }
      showToast({ level: 'success', title: 'Profile saved' })
      await renderView()
    } catch (err) {
      restore()
      showToast({ level: 'critical', title: 'Save failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not save profile.' })
    }
  })
}

// ─── Section 2: Change Password ───────────────────────────────────────────────
function renderPasswordSection() {
  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]" id="password-section">
    <h2 class="mb-1 text-sm font-semibold text-neutral-900">Change Password</h2>
    <p class="mb-5 text-xs text-neutral-500">Choose a strong password you don't use anywhere else.</p>
    <form id="settings-password-form" novalidate class="max-w-md">
      ${passwordFieldHTML({ id: 'sp-current-password', label: 'Current password', autocomplete: 'current-password' })}
      ${passwordFieldHTML({ id: 'sp-new-password', label: 'New password', autocomplete: 'new-password' })}
      ${passwordFieldHTML({ id: 'sp-confirm-password', label: 'Confirm new password', autocomplete: 'new-password' })}
      <div class="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4">
        ${buttonHTML({ variant: 'primary', label: 'Update password', type: 'submit', attrs: { id: 'settings-save-password-btn' } })}
      </div>
    </form>
  </div>`
}

function bindPasswordSection() {
  initPasswordToggles(document)

  $('#settings-password-form').on('submit', async function (e) {
    e.preventDefault()
    const $form = $(this)
    clearAllFieldErrors($form)

    const current = $form.find('#sp-current-password').val()
    const newPwd = $form.find('#sp-new-password').val()
    const confirm = $form.find('#sp-confirm-password').val()
    let firstErr = null

    if (!current) { fieldError($form, 'sp-current-password', 'Enter your current password.'); firstErr = firstErr || 'sp-current-password' }
    if (!newPwd || newPwd.length < 8) { fieldError($form, 'sp-new-password', 'New password must be at least 8 characters.'); firstErr = firstErr || 'sp-new-password' }
    else if (newPwd === current) { fieldError($form, 'sp-new-password', 'New password must differ from current password.'); firstErr = firstErr || 'sp-new-password' }
    if (newPwd && confirm !== newPwd) { fieldError($form, 'sp-confirm-password', 'Passwords do not match.'); firstErr = firstErr || 'sp-confirm-password' }
    if (firstErr) { $form.find(`#${firstErr}`).trigger('focus'); return }

    const restore = setSubmitting($('#settings-save-password-btn'), 'Updating…')
    const payload = { currentPassword: current, password: newPwd, password_confirmation: confirm }

    try {
      // Try Laravel route first, fall back to Java Spring route
      try { await apiPost('/account/change-password', payload) }
      catch (e1) {
        if (e1 instanceof ApiError && (e1.status === 404 || e1.status === 405)) {
          await apiPost('/account/security/change-password', payload)
        } else { throw e1 }
      }
      showToast({ level: 'success', title: 'Password updated', message: 'Your password has been changed successfully.' })
      $form[0].reset()
    } catch (err) {
      showToast({ level: 'critical', title: 'Update failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not update password.' })
    } finally { restore() }
  })
}

// ─── Section 3: Active Sessions ───────────────────────────────────────────────
async function renderSessionsSection() {
  const isSingleSession = sessions.length === 1
  const otherCount = sessions.filter((s) => !(s.isCurrent || s.current || s.active)).length

  const rowsHTML = await Promise.all(
    sessions.map(async (session, idx) => {
      const isCurrent = Boolean(
        session.isCurrent || session.current || session.active ||
        isSingleSession ||
        (sessions.length > 1 && !sessions.some((s) => s.isCurrent || s.current || s.active) && idx === 0)
      )
      const sid = String(session.sessionId || session.id || '')
      const masked = sid.length > 8 ? `${sid.slice(0, 8)}••••${sid.slice(-4)}` : sid
      const ua = session.userAgent || session.device || ''
      const isDesktop = !ua.toLowerCase().includes('mobile') && !ua.toLowerCase().includes('iphone') && !ua.toLowerCase().includes('android')
      const deviceIconName = (session.iconName) || (isDesktop ? 'computer-desktop' : 'device-phone-mobile')
      const deviceIcon = await icon(deviceIconName, { className: 'w-5 h-5 text-neutral-400 shrink-0' })

      const parts = []
      if (session.ipAddress || session.ip) parts.push(session.ipAddress || session.ip)
      if (session.location) parts.push(session.location)
      if (session.startedAt || session.createdAt) parts.push(`Signed in ${formatRelativeTime(session.startedAt || session.createdAt)}`)
      if (session.lastRequest) parts.push(`Last active ${formatRelativeTime(session.lastRequest)}`)
      else if (session.lastActive) parts.push(session.lastActive)

      return `
      <div class="flex items-center gap-3 py-3 ${idx > 0 ? 'border-t border-neutral-100' : ''}">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">${deviceIcon}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-neutral-800 truncate">${escapeHTML(ua || (masked ? `Session ${masked}` : 'Session'))}</p>
          <p class="text-xs text-neutral-400 truncate">${escapeHTML(parts.join(' · '))}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          ${isCurrent ? badgeHTML({ label: 'Current', tone: 'primary' }) : ''}
          ${!isCurrent ? buttonHTML({ variant: 'ghost', size: 'sm', label: 'Terminate', className: 'js-settings-terminate-session', attrs: { 'data-session-id': sid } }) : ''}
        </div>
      </div>`
    })
  )

  const emptyHTML = rowsHTML.length === 0
    ? `<p class="py-6 text-center text-sm text-neutral-400">No active sessions found.</p>`
    : rowsHTML.join('')

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-[var(--shadow-subtle)]" id="sessions-section">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-neutral-900">Active Sessions</h2>
        <p class="text-xs text-neutral-500">Everywhere you're currently signed in to ZTP.</p>
      </div>
      ${otherCount > 0 ? buttonHTML({ variant: 'danger', size: 'sm', label: `Sign out ${otherCount} other session${otherCount !== 1 ? 's' : ''}`, attrs: { id: 'settings-signout-all-btn' } }) : ''}
    </div>
    <div id="sessions-list">${emptyHTML}</div>
  </div>`
}

async function bindSessionsSection() {
  $('#sessions-list').off('click.terminate').on('click.terminate', '.js-settings-terminate-session', async function () {
    const sessionId = $(this).data('session-id')
    const ok = await confirmDialog({
      title: 'Terminate this session?',
      message: 'That device will be signed out on its next request.',
      confirmLabel: 'Terminate',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiDelete(`/account/sessions/${sessionId}`)
      showToast({ level: 'success', title: 'Session terminated' })
      await loadSessions()
      const newSection = await renderSessionsSection()
      $('#sessions-section').replaceWith(newSection)
      await bindSessionsSection()
    } catch (err) {
      showToast({ level: 'critical', title: 'Failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not terminate session.' })
    }
  })

  $('#settings-signout-all-btn').off('click.signoutall').on('click.signoutall', async function () {
    const otherCount = sessions.filter((s) => !(s.isCurrent || s.current || s.active)).length
    const ok = await confirmDialog({
      title: 'Sign out all other sessions?',
      message: `${otherCount} other session${otherCount !== 1 ? 's' : ''} will be signed out. This device stays signed in.`,
      confirmLabel: 'Sign out all',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiDelete('/account/sessions')
      showToast({ level: 'success', title: 'All other sessions signed out' })
      await loadSessions()
      const newSection = await renderSessionsSection()
      $('#sessions-section').replaceWith(newSection)
      await bindSessionsSection()
    } catch (err) {
      showToast({ level: 'critical', title: 'Failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not sign out sessions.' })
    }
  })
}

// ─── Section 4: Danger Zone ───────────────────────────────────────────────────
function renderDangerSection() {
  return `
  <div class="rounded-lg border border-critical-200 bg-white p-6 shadow-[var(--shadow-subtle)]" id="danger-section">
    <h2 class="mb-1 text-sm font-semibold text-critical-700">Danger Zone</h2>
    <p class="mb-5 text-xs text-neutral-500">Irreversible actions that permanently affect your account.</p>
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-critical-100 bg-critical-50 p-4">
      <div>
        <p class="text-sm font-medium text-neutral-800">Delete my account</p>
        <p class="text-xs text-neutral-500 mt-0.5">Permanently deletes your account and all associated data. This cannot be undone.</p>
      </div>
      ${buttonHTML({ variant: 'danger', label: 'Delete account', attrs: { id: 'settings-delete-account-btn' } })}
    </div>
  </div>`
}

function bindDangerSection() {
  $('#settings-delete-account-btn').off('click').on('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete your account?',
      message: 'This will permanently delete your account and all associated data. There is no way to undo this.',
      confirmLabel: 'Yes, delete my account',
      tone: 'danger',
    })
    if (!ok) return

    const password = await promptPasswordModal({
      title: 'Confirm Account Deletion',
      subtitle: 'Enter your password to permanently delete your account.',
      actionLabel: 'Delete my account',
    })
    if (!password) return

    try {
      showToast({ level: 'info', title: 'Deleting account…' })
      // Try Laravel route first, then Java Spring fallback
      try { await apiDelete('/account/profile', { currentPassword: password }) }
      catch (e1) {
        if (e1 instanceof ApiError && (e1.status === 404 || e1.status === 405)) {
          await apiPost('/account/delete-account', { currentPassword: password, password })
        } else { throw e1 }
      }
      showToast({ level: 'success', title: 'Account deleted', message: 'Your account has been permanently removed.' })
      sessionStorage.removeItem('ztp_logged_in')
      setTimeout(() => { window.location.href = '/auth/login.html' }, 1500)
    } catch (err) {
      showToast({ level: 'critical', title: 'Deletion failed', message: err instanceof ApiError ? err.data?.message || err.message : 'Could not delete account.' })
    }
  })
}

// ─── Main Render ──────────────────────────────────────────────────────────────
async function renderView() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Account', 'Settings'],
    title: 'Settings',
    description: 'Manage your profile, password, active sessions, and account.',
  })

  const [profileSection, sessionsSection] = await Promise.all([
    renderProfileSection(),
    renderSessionsSection(),
  ])

  $('#page-content').html(`
    ${header}
    <div class="flex flex-col gap-6 max-w-3xl">
      ${profileSection}
      ${renderPasswordSection()}
      ${sessionsSection}
      ${renderDangerSection()}
    </div>
  `)

  // Populate form fields
  populateProfileForm()

  // Bind all interactivity
  bindProfileSection()
  bindPasswordSection()
  await bindSessionsSection()
  bindDangerSection()
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
$(async function () {
  await requireAuth()
  await mountShell()
  await Promise.all([loadProfile(), loadSessions()])
  await renderView()
})
