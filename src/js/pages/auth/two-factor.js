import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { codeInputHTML, initCodeInputs, getCodeValue } from '../../components/otp-input.js'
import { buttonHTML } from '../../components/button.js'
import { setSubmitting } from '../../components/form-field.js'
import { showToast } from '../../components/toast.js'
import { apiPost, ApiError } from '../../core/api-client.js'
import { homePathForRole } from '../../config/roles.js'
import { getPending2faEmail, clearPending2faEmail } from '../../utils/pending-2fa.js'
import { escapeHTML, sanitizeErrorMessage } from '../../utils/sanitize.js'

registerIconPlugin($)

const RESEND_COOLDOWN_SECONDS = 30

function formHTML(email) {
  return `
    <form id="tfa-form" novalidate>
      <p class="mb-5 text-sm text-neutral-500">Enter the 6-digit code sent to <span class="font-medium text-neutral-800">${escapeHTML(email)}</span>.</p>

      <div class="mb-2">${codeInputHTML({ name: 'tfa-code', length: 6 })}</div>

      <p class="mb-5 text-xs text-neutral-500">
        Didn't get a code?
        <button type="button" id="resend-link" class="font-medium text-primary-600 hover:text-primary-700 disabled:pointer-events-none disabled:text-neutral-400">Resend code</button>
      </p>

      ${buttonHTML({ variant: 'primary', label: 'Verify', type: 'submit', className: 'w-full', attrs: { id: 'tfa-submit' } })}
      <p class="mt-3 text-center text-xs text-neutral-400">Testing environment? You can use code <span class="font-mono font-semibold text-neutral-600">123456</span>.</p>
    </form>`
}

async function render(email) {
  $('#app').html(
    await authShellHTML({
      title: 'Two-factor authentication',
      contentHTML: formHTML(email),
      footerHTML: `<a href="/auth/login.html" class="font-medium text-primary-600 hover:text-primary-700">← Back to sign in</a>`,
    })
  )
}

function wireResend(email) {
  const $resend = $('#resend-link')
  let secondsLeft = 0

  const tick = () => {
    if (secondsLeft <= 0) {
      $resend.prop('disabled', false).text('Resend code')
      return
    }
    $resend.prop('disabled', true).text(`Resend code (${secondsLeft}s)`)
    secondsLeft -= 1
    setTimeout(tick, 1000)
  }

  $resend.on('click', async function () {
    if ($resend.prop('disabled')) return
    
    try {
      let response
      try {
        response = await apiPost('/auth/2fa/resend', { email })
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          response = await apiPost('/auth/verify-device/resend', { email })
        } else {
          throw err
        }
      }
      showToast({ level: 'success', title: 'Code resent', message: response?.message || 'A new verification code has been sent to your email.' })
      
      secondsLeft = RESEND_COOLDOWN_SECONDS
      tick()
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({ level: 'critical', title: 'Resend failed', message: err.data?.message || 'Could not resend code. Please try again.' })
      } else {
        showToast({ level: 'critical', title: 'Resend failed', message: 'An unexpected error occurred.' })
      }
    }
  })
}

function wireForm(email) {
  const $form = $('#tfa-form')
  const $codeContainer = $form.find('.js-code-input')

  $form.on('submit', async function (e) {
    e.preventDefault()
    const code = getCodeValue($codeContainer)
    const $error = $codeContainer.next('.js-field-error')

    if (code.length < 6) {
      $error.text('Enter all 6 digits.').removeClass('hidden')
      $codeContainer.find('.js-code-box').filter(function () {
        return !$(this).val()
      }).first().trigger('focus')
      return
    }

    $error.addClass('hidden')
    const restore = setSubmitting($('#tfa-submit'), 'Verifying…')

    try {
      const response = await apiPost('/auth/2fa/verify', { email, code })
      
      // Handle both wrapped { data: { user, ... } } and flat { user, ... } shapes
      const result = response && response.data ? response.data : response
      const { user, deviceVerificationRequired } = result
      
      clearPending2faEmail()

      if (deviceVerificationRequired) {
        window.location.href = '/auth/verify-device.html'
      } else {
        sessionStorage.setItem('ztp_logged_in', 'true')
        window.location.href = homePathForRole(user.role)
      }
    } catch (err) {
      restore()
      if (err instanceof ApiError) {
        $error.text(sanitizeErrorMessage(err.data?.message, 'Invalid or expired code. Please try again.')).removeClass('hidden')
      } else {
        showToast({ level: 'critical', title: 'Verification failed', message: 'An unexpected error occurred.' })
      }
    }
  })
}

$(async function () {
  const email = getPending2faEmail()
  if (!email) {
    window.location.href = '/auth/login.html'
    return
  }
  await render(email)
  initCodeInputs(document)
  wireResend(email)
  wireForm(email)
})
