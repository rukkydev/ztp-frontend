import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { statusContentHTML } from '../../components/auth-status.js'
import { fieldError, clearAllFieldErrors, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { buttonHTML } from '../../components/button.js'
import { showToast } from '../../components/toast.js'
import { apiPost, ApiError } from '../../core/api-client.js'

registerIconPlugin($)

const RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'One symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

function getTokenFromURL() {
  return new URLSearchParams(window.location.search).get('token')
}

function checklistHTML() {
  const items = RULES.map(
    (rule) => `
    <li class="js-rule flex items-center gap-2 text-xs text-neutral-400" data-rule="${rule.id}">
      <span class="js-rule-dot h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300"></span>
      ${rule.label}
    </li>`
  ).join('')
  return `<ul class="mb-4 grid grid-cols-2 gap-1.5">${items}</ul>`
}

function formHTML() {
  return `
    <form id="reset-form" novalidate>
      ${passwordFieldHTML({ id: 'new-password', label: 'New password', autocomplete: 'new-password' })}
      ${checklistHTML()}
      ${passwordFieldHTML({ id: 'confirm-password', label: 'Confirm new password', autocomplete: 'new-password' })}
      ${buttonHTML({ variant: 'primary', label: 'Reset password', type: 'submit', className: 'w-full', attrs: { id: 'reset-submit' } })}
    </form>`
}

async function confirmationHTML() {
  const checkIcon = await icon('check-circle', { className: 'w-5 h-5 text-success-600 shrink-0' })
  return `
    <div class="flex items-start gap-3 rounded-lg border border-success-500/20 bg-success-50 p-4">
      ${checkIcon}
      <div class="min-w-0">
        <p class="font-medium text-neutral-900">Password reset</p>
        <p class="mt-1 text-sm text-neutral-600">Your password has been updated. You can now sign in with it.</p>
      </div>
    </div>
    <div class="mt-4">${buttonHTML({ variant: 'primary', label: 'Continue to sign in', className: 'w-full', attrs: { id: 'reset-continue' } })}</div>`
}

async function renderForm() {
  $('#app').html(
    await authShellHTML({
      title: 'Set a new password',
      subtitle: 'Choose a strong password you haven\'t used before.',
      contentHTML: formHTML(),
    })
  )
}

async function renderInvalidToken() {
  const actionHTML = buttonHTML({ variant: 'primary', label: 'Request a new link', className: 'w-full', attrs: { id: 'invalid-token-action' } })
  const content = await statusContentHTML({
    iconName: 'exclamation-triangle',
    tone: 'critical',
    message: 'This password reset link is invalid or has expired. Please request a new one.',
    actionHTML,
  })

  $('#app').html(await authShellHTML({ title: 'Reset link expired', contentHTML: content }))
  $('#invalid-token-action').on('click', () => (window.location.href = '/auth/forgot-password.html'))
}

function updateChecklist(value) {
  RULES.forEach((rule) => {
    const passed = rule.test(value)
    const $li = $(`.js-rule[data-rule="${rule.id}"]`)
    $li.toggleClass('text-neutral-400', !passed).toggleClass('text-success-600', passed)
    $li.find('.js-rule-dot').toggleClass('bg-neutral-300', !passed).toggleClass('bg-success-500', passed)
  })
}

function wireForm(token) {
  const $form = $('#reset-form')

  $form.find('#new-password').on('input', function () {
    updateChecklist($(this).val())
  })

  $form.on('submit', async function (e) {
    e.preventDefault()
    clearAllFieldErrors($form)

    const newPassword = $form.find('#new-password').val()
    const confirm = $form.find('#confirm-password').val()
    const unmetRule = RULES.find((rule) => !rule.test(newPassword))

    if (unmetRule) {
      fieldError($form, 'new-password', 'Password doesn\'t meet all the requirements below.')
      $form.find('#new-password').trigger('focus')
      return
    }
    if (newPassword !== confirm) {
      fieldError($form, 'confirm-password', 'Passwords don\'t match.')
      $form.find('#confirm-password').trigger('focus')
      return
    }

    const restore = setSubmitting($('#reset-submit'), 'Resetting…')

    try {
      await apiPost('/auth/reset-password', { token, newPassword })
      $('.mt-6').first().html(await confirmationHTML())
      $('#reset-continue').on('click', () => (window.location.href = '/auth/login.html'))
    } catch (err) {
      restore()
      if (err instanceof ApiError && err.status === 0) {
        showToast({ level: 'critical', title: 'Connection error', message: 'Could not connect to the server. Please check your connection and try again later.' })
      } else if (err instanceof ApiError && err.status === 400) {
        // Token is invalid, expired, or already used — show error state
        await renderInvalidToken()
      } else {
        const msg = (err instanceof ApiError && err.data?.message) ? err.data.message : 'An unexpected error occurred.'
        showToast({ level: 'critical', title: 'Reset failed', message: msg })
      }
    }
  })
}

$(async function () {
  const token = getTokenFromURL()

  if (!token) {
    await renderInvalidToken()
    return
  }

  await renderForm()
  await initPasswordToggles(document)
  wireForm(token)
})
