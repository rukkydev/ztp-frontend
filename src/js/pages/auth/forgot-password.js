import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { textFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { buttonHTML } from '../../components/button.js'
import { showToast } from '../../components/toast.js'
import { apiPost, ApiError } from '../../core/api-client.js'
import { sanitizeErrorMessage } from '../../utils/sanitize.js'


registerIconPlugin($)

let mode = 'email' // 'email' | 'phrase'

function emailFormHTML() {
  return `
    <form id="forgot-form" novalidate>
      <p class="mb-4 text-sm text-neutral-500">Enter the email address on your account and we'll send you a link to reset your password.</p>
      ${textFieldHTML({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'username', placeholder: 'you@company.com' })}
      ${buttonHTML({ variant: 'primary', label: 'Send reset link', type: 'submit', className: 'w-full mb-4', attrs: { id: 'forgot-submit' } })}
      <div class="border-t border-neutral-100 pt-4 text-center">
        <button type="button" id="switch-to-phrase-btn" class="text-xs font-medium text-primary-600 hover:text-primary-700">Lost access to your email? Recover using recovery phrase →</button>
      </div>
    </form>`
}

function phraseFormHTML() {
  return `
    <form id="recover-phrase-form" novalidate>
      <p class="mb-4 text-sm text-neutral-500">Enter your email address, your 12-word recovery phrase, and a new password to recover access to your account.</p>
      ${textFieldHTML({ id: 'recover-email', label: 'Email address', type: 'email', autocomplete: 'username', placeholder: 'you@company.com' })}
      
      <div class="mb-4">
        <label for="recover-phrase" class="mb-1 block text-xs font-medium text-neutral-700">12-Word Recovery Phrase</label>
        <textarea id="recover-phrase" rows="3" placeholder="abandon ability able about above ..." class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"></textarea>
        <p class="mt-1 text-xs text-neutral-400">Enter the 12 words separated by spaces.</p>
      </div>

      ${passwordFieldHTML({ id: 'recover-new-password', label: 'New Password', autocomplete: 'new-password' })}

      ${buttonHTML({ variant: 'primary', label: 'Recover account', type: 'submit', className: 'w-full mb-4', attrs: { id: 'recover-submit' } })}
      
      <div class="border-t border-neutral-100 pt-4 text-center">
        <button type="button" id="switch-to-email-btn" class="text-xs font-medium text-primary-600 hover:text-primary-700">← Back to standard email reset</button>
      </div>
    </form>`
}

async function confirmationHTML(email) {
  const checkIcon = await icon('check-circle', { className: 'w-5 h-5 text-success-600 shrink-0' })
  return `
    <div class="flex items-start gap-3 rounded-lg border border-success-500/20 bg-success-50 p-4">
      ${checkIcon}
      <div class="min-w-0">
        <p class="font-medium text-neutral-900">Check your email</p>
        <p class="mt-1 text-sm text-neutral-600">If an account exists for <span class="font-medium">${email}</span>, a reset link is on its way. It expires in 30 minutes.</p>
      </div>
    </div>`
}

async function recoverySuccessHTML() {
  const checkIcon = await icon('check-circle', { className: 'w-5 h-5 text-success-600 shrink-0' })
  return `
    <div class="rounded-lg border border-success-500/20 bg-success-50 p-5">
      <div class="flex items-start gap-3">
        ${checkIcon}
        <div class="min-w-0">
          <p class="font-semibold text-neutral-900">Account Recovered Successfully</p>
          <p class="mt-1 text-sm text-neutral-600">Your password has been updated and all existing active sessions have been terminated for security.</p>
        </div>
      </div>
      <div class="mt-5">
        <a href="/auth/login.html" class="inline-flex w-full justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">Sign in with new password</a>
      </div>
    </div>`
}

async function render() {
  $('#app').html(
    await authShellHTML({
      title: mode === 'email' ? 'Reset your password' : 'Recover with Recovery Phrase',
      contentHTML: mode === 'email' ? emailFormHTML() : phraseFormHTML(),
      footerHTML: `<a href="/auth/login.html" class="font-medium text-primary-600 hover:text-primary-700">← Back to sign in</a>`,
    })
  )
  await initPasswordToggles(document)
  wireHandlers()
}

function wireHandlers() {
  $('#switch-to-phrase-btn').on('click', async () => {
    mode = 'phrase'
    await render()
  })

  $('#switch-to-email-btn').on('click', async () => {
    mode = 'email'
    await render()
  })

  if (mode === 'email') {
    const $form = $('#forgot-form')
    $form.on('submit', async function (e) {
      e.preventDefault()
      clearAllFieldErrors($form)

      const email = $form.find('#email').val().trim()
      if (!email) {
        fieldError($form, 'email', 'Enter your email address.')
        $form.find('#email').trigger('focus')
        return
      }
      if (!isValidEmail(email)) {
        fieldError($form, 'email', 'Enter a valid email address.')
        $form.find('#email').trigger('focus')
        return
      }

      const restore = setSubmitting($('#forgot-submit'), 'Sending…')

      try {
        await apiPost('/auth/forgot-password', { email })
        $('.mt-6').first().html(await confirmationHTML(email))
      } catch (err) {
        restore()
        if (err instanceof ApiError && err.status === 0) {
          showToast({ level: 'critical', title: 'Connection error', message: 'Could not connect to the server. Please check your connection and try again later.' })
        } else {
          $('.mt-6').first().html(await confirmationHTML(email))
        }
      }
    })
  } else {
    const $form = $('#recover-phrase-form')
    $form.on('submit', async function (e) {
      e.preventDefault()
      clearAllFieldErrors($form)

      const email = $form.find('#recover-email').val().trim()
      const phrase = $form.find('#recover-phrase').val().trim()
      const newPassword = $form.find('#recover-new-password').val()
      let firstErrorField = null

      if (!email) {
        fieldError($form, 'recover-email', 'Enter your email address.')
        firstErrorField = firstErrorField || 'recover-email'
      } else if (!isValidEmail(email)) {
        fieldError($form, 'recover-email', 'Enter a valid email address.')
        firstErrorField = firstErrorField || 'recover-email'
      }

      if (!phrase) {
        fieldError($form, 'recover-phrase', 'Enter your 12-word recovery phrase.')
        firstErrorField = firstErrorField || 'recover-phrase'
      } else if (phrase.split(/\s+/).length < 12) {
        fieldError($form, 'recover-phrase', 'Please enter all 12 words of your recovery phrase.')
        firstErrorField = firstErrorField || 'recover-phrase'
      }

      if (!newPassword) {
        fieldError($form, 'recover-new-password', 'Enter a new password.')
        firstErrorField = firstErrorField || 'recover-new-password'
      } else if (newPassword.length < 8) {
        fieldError($form, 'recover-new-password', 'Password must be at least 8 characters.')
        firstErrorField = firstErrorField || 'recover-new-password'
      }

      if (firstErrorField) {
        $form.find(`#${firstErrorField}`).trigger('focus')
        return
      }

      const restore = setSubmitting($('#recover-submit'), 'Recovering…')

      try {
        await apiPost('/auth/recover-with-phrase', { email, phrase, newPassword })
        $('.mt-6').first().html(await recoverySuccessHTML())
      } catch (err) {
        restore()
        const rawMsg = err instanceof ApiError ? err.data?.message || err.message : err.message
        const errorMsg = sanitizeErrorMessage(rawMsg, 'Invalid recovery phrase or email.')
        showToast({ level: 'critical', title: 'Recovery failed', message: errorMsg })
        fieldError($form, 'recover-phrase', errorMsg)
        $form.find('#recover-phrase').trigger('focus')
      }
    })
  }
}

$(async function () {
  await render()
})
