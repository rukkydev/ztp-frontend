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
import { getPending2faEmail, getPending2faUserId, clearPending2faEmail } from '../../utils/pending-2fa.js'
import { escapeHTML, sanitizeErrorMessage } from '../../utils/sanitize.js'

registerIconPlugin($)

const RESEND_COOLDOWN_SECONDS = 30

/**
 * Basic mask utility to secure email presentation in authentication logs.
 */
function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 1) return `•@${domain}`
  return `${local[0]}${'•'.repeat(Math.min(5, local.length - 1))}@${domain}`
}

function formHTML(email) {
  const masked = maskEmail(email)
  return `
    <form id="verify-form" novalidate>
      <p class="mb-5 text-sm text-neutral-500">We don't recognize this device. Enter the 6-digit code we sent to <span class="font-medium text-neutral-700">${escapeHTML(masked)}</span> to continue.</p>

      <div class="mb-2">${codeInputHTML({ name: 'verify-code', length: 6 })}</div>

      <p class="mb-5 text-xs text-neutral-500">
        Didn't get a code?
        <button type="button" id="resend-link" class="font-medium text-primary-600 hover:text-primary-700 disabled:pointer-events-none disabled:text-neutral-400">Resend code</button>
      </p>

      <label class="mb-5 flex items-center gap-2 text-sm text-neutral-600">
        <input type="checkbox" id="remember-device" checked class="rounded border-neutral-300 accent-[var(--color-primary-600)]" />
        Remember this device
      </label>

      ${buttonHTML({ variant: 'primary', label: 'Verify device', type: 'submit', className: 'w-full', attrs: { id: 'verify-submit' } })}
    </form>`
}

async function render(email) {
  $('#app').html(
    await authShellHTML({
      title: 'Verify this device',
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
      const response = await apiPost('/auth/verify-device/resend', { email })
      showToast({ level: 'success', title: 'Code resent', message: response.message || 'If the account exists, a new code has been sent.' })
      
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
  const $form = $('#verify-form')
  const $codeContainer = $form.find('.js-code-input')

  $form.on('submit', async function (e) {
    e.preventDefault()
    const code = getCodeValue($codeContainer)
    const rememberDevice = $form.find('#remember-device').is(':checked')
    const $error = $codeContainer.next('.js-field-error')

    if (code.length < 6) {
      $error.text('Enter all 6 digits.').removeClass('hidden')
      $codeContainer.find('.js-code-box').filter(function () {
        return !$(this).val()
      }).first().trigger('focus')
      return
    }

    $error.addClass('hidden')
    const restore = setSubmitting($('#verify-submit'), 'Verifying…')

    try {
      let response
      const userId = getPending2faUserId()
      try {
        response = await apiPost('/auth/verify-device', { email, code, rememberDevice })
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405) && userId) {
          response = await apiPost('/auth/verify-otp', { user_id: userId, code })
        } else {
          throw err
        }
      }
      
      // Handle both wrapped { data: { user, ... } } and flat shapes
      const result = response && response.data ? response.data : response
      const user = result.user || result
      const { twoFactorRequired } = result

      if (twoFactorRequired) {
        window.location.href = '/auth/two-factor.html'
      } else if (user) {
        clearPending2faEmail()
        sessionStorage.setItem('ztp_logged_in', 'true')
        window.location.href = homePathForRole(user.type || user.role)
      } else {
        clearPending2faEmail()
        sessionStorage.setItem('ztp_logged_in', 'true')
        window.location.href = '/admin/dashboard.html'
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
