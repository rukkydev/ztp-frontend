import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { textFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { buttonHTML } from '../../components/button.js'
import { showToast } from '../../components/toast.js'
import { apiPost, ApiError } from '../../core/api-client.js'
import { homePathForRole } from '../../config/roles.js'
import { setPending2faEmail } from '../../utils/pending-2fa.js'

registerIconPlugin($)

async function render() {
  const content = `
    <form id="login-form" novalidate>
      ${textFieldHTML({ id: 'email', label: 'Email address', type: 'email', autocomplete: 'username', placeholder: 'you@company.com' })}
      ${passwordFieldHTML({ id: 'password', label: 'Password', autocomplete: 'current-password' })}

      <div class="mb-6 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" id="remember-device" class="rounded border-neutral-300 accent-[var(--color-primary-600)]" />
          Remember this device
        </label>
        <a href="/auth/forgot-password.html" class="text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</a>
      </div>

      ${buttonHTML({ variant: 'primary', label: 'Sign in', type: 'submit', className: 'w-full', attrs: { id: 'login-submit' } })}
    </form>`

  $('#app').html(
    await authShellHTML({
      title: 'Sign in to ZTP',
      subtitle: 'Enter your credentials to access the Zero Trust Platform.',
      contentHTML: content,
      footerHTML: `Don't have access? <span class="font-medium text-neutral-700">Contact your administrator.</span>`,
    })
  )
}

function wireForm() {
  const $form = $('#login-form')

  $form.on('submit', async function (e) {
    e.preventDefault()
    clearAllFieldErrors($form)

    const email = $form.find('#email').val().trim()
    const password = $form.find('#password').val()
    let firstErrorField = null

    if (!email) {
      fieldError($form, 'email', 'Enter your email address.')
      firstErrorField = firstErrorField || 'email'
    } else if (!isValidEmail(email)) {
      fieldError($form, 'email', 'Enter a valid email address.')
      firstErrorField = firstErrorField || 'email'
    }

    if (!password) {
      fieldError($form, 'password', 'Enter your password.')
      firstErrorField = firstErrorField || 'password'
    }

    if (firstErrorField) {
      $form.find(`#${firstErrorField}`).trigger('focus')
      return
    }

    const restore = setSubmitting($('#login-submit'), 'Signing in…')

    try {
      const response = await apiPost('/auth/login', { email, password })

      // Backend always wraps: { data: { user, deviceVerificationRequired, twoFactorRequired }, message, success }
      if (!response || !response.data) {
        throw new ApiError(response?.message || 'Invalid email or password.', { status: 400, data: response })
      }

      const { user, deviceVerificationRequired, twoFactorRequired } = response.data

      if (!user && !deviceVerificationRequired && !twoFactorRequired) {
        throw new ApiError(response.message || 'Invalid email or password.', { status: 400, data: response })
      }

      if (user && (user.status === 'Suspended' || user.enabled === false)) {
        window.location.href = '/auth/account-suspended.html'
        return
      }

      if (deviceVerificationRequired) {
        setPending2faEmail(email)
        window.location.href = '/auth/verify-device.html'
      } else if (twoFactorRequired) {
        setPending2faEmail(email)
        window.location.href = '/auth/two-factor.html'
      } else {
        sessionStorage.setItem('ztp_logged_in', 'true')
        window.location.href = homePathForRole(user.role)
      }
    } catch (err) {
      restore()
      console.error('Login error:', err)
      
      if (err instanceof ApiError && err.status === 0) {
        showToast({ level: 'critical', title: 'Connection error', message: 'Could not connect to the server. Please check your connection and try again later.' })
        return
      }

      const errorMsg = (err instanceof ApiError ? err.data?.message || err.message : err.message) || 'Incorrect email or password.'
      const lowerMsg = String(errorMsg).toLowerCase()
      const isSuspended =
        lowerMsg.includes('suspend') ||
        lowerMsg.includes('disabled') ||
        lowerMsg.includes('inactive') ||
        err.data?.status === 'Suspended' ||
        err.data?.accountSuspended === true

      if (isSuspended) {
        window.location.href = '/auth/account-suspended.html'
        return
      }

      const isLocked =
        lowerMsg.includes('locked') ||
        err.data?.status === 'Locked' ||
        err.data?.accountLocked === true

      const isBlocked =
        lowerMsg.includes('blocked') ||
        lowerMsg.includes('security reasons') ||
        err.data?.status === 'Blocked'

      if (isLocked) {
        showToast({ level: 'critical', title: 'Account locked', message: errorMsg })
        fieldError($form, 'password', errorMsg)
        $('#login-submit').prop('disabled', true).text('Account Locked')
      } else if (isBlocked) {
        showToast({ level: 'critical', title: 'Login blocked', message: errorMsg })
        fieldError($form, 'password', errorMsg)
        $('#login-submit').prop('disabled', true).text('Login Blocked')
      } else {
        fieldError($form, 'password', errorMsg)
        showToast({ level: 'critical', title: 'Sign-in failed', message: errorMsg })
        $form.find('#password').trigger('focus')
      }
    }
  })
}

$(async function () {
  await render()
  await initPasswordToggles(document)
  wireForm()
})
