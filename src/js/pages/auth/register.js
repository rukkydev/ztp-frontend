import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { textFieldHTML, fieldError, clearAllFieldErrors, isValidEmail, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { buttonHTML } from '../../components/button.js'
import { showToast } from '../../components/toast.js'
import { apiPost, ApiError } from '../../core/api-client.js'
import { sanitizeErrorMessage } from '../../utils/sanitize.js'

registerIconPlugin($)

async function render() {
  const content = `
    <form id="register-form" novalidate>
      <div class="mb-4 rounded-lg border border-primary-100 bg-primary-50/50 p-3 text-xs text-primary-800">
        <span class="font-semibold">Self-Registration:</span> Creates a standard <strong>USER</strong> account. Administrator accounts can only be provisioned by authorized administrators.
      </div>

      ${textFieldHTML({
        id: 'username',
        label: 'Username',
        type: 'text',
        autocomplete: 'username',
        placeholder: 'e.g. jdoe',
      })}

      ${textFieldHTML({
        id: 'email',
        label: 'Email address',
        type: 'email',
        autocomplete: 'email',
        placeholder: 'you@example.com',
      })}

      ${passwordFieldHTML({
        id: 'password',
        label: 'Password',
        autocomplete: 'new-password',
      })}

      ${passwordFieldHTML({
        id: 'confirm-password',
        label: 'Confirm password',
        autocomplete: 'new-password',
      })}

      <p class="mb-5 text-xs text-neutral-500">
        Password must be at least 8 characters long.
      </p>

      ${buttonHTML({
        variant: 'primary',
        label: 'Create account',
        type: 'submit',
        className: 'w-full',
        attrs: { id: 'register-submit' },
      })}
    </form>`

  $('#app').html(
    await authShellHTML({
      title: 'Create an account',
      subtitle: 'Sign up as a standard user to access the Zero Trust Platform.',
      contentHTML: content,
      footerHTML: `Already have an account? <a href="/auth/login.html" class="font-medium text-primary-600 hover:text-primary-700">Sign in</a>`,
    })
  )
}

function wireForm() {
  const $form = $('#register-form')

  $form.on('submit', async function (e) {
    e.preventDefault()
    clearAllFieldErrors($form)

    const username = $form.find('#username').val().trim()
    const email = $form.find('#email').val().trim()
    const password = $form.find('#password').val()
    const confirmPassword = $form.find('#confirm-password').val()
    let firstErrorField = null

    // Validation: Username
    if (!username) {
      fieldError($form, 'username', 'Enter a username.')
      firstErrorField = firstErrorField || 'username'
    } else if (username.length < 3 || username.length > 100) {
      fieldError($form, 'username', 'Username must be between 3 and 100 characters.')
      firstErrorField = firstErrorField || 'username'
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      fieldError($form, 'username', 'Username can only contain letters, numbers, dots, hyphens, and underscores.')
      firstErrorField = firstErrorField || 'username'
    }

    // Validation: Email
    if (!email) {
      fieldError($form, 'email', 'Enter your email address.')
      firstErrorField = firstErrorField || 'email'
    } else if (!isValidEmail(email)) {
      fieldError($form, 'email', 'Enter a valid email address.')
      firstErrorField = firstErrorField || 'email'
    }

    // Validation: Password
    if (!password) {
      fieldError($form, 'password', 'Enter a password.')
      firstErrorField = firstErrorField || 'password'
    } else if (password.length < 8) {
      fieldError($form, 'password', 'Password must be at least 8 characters long.')
      firstErrorField = firstErrorField || 'password'
    }

    // Validation: Confirm Password
    if (!confirmPassword) {
      fieldError($form, 'confirm-password', 'Confirm your password.')
      firstErrorField = firstErrorField || 'confirm-password'
    } else if (password && password !== confirmPassword) {
      fieldError($form, 'confirm-password', 'Passwords do not match.')
      firstErrorField = firstErrorField || 'confirm-password'
    }

    if (firstErrorField) {
      $form.find(`#${firstErrorField}`).trigger('focus')
      return
    }

    const restore = setSubmitting($('#register-submit'), 'Creating account…')

    try {
      const response = await apiPost('/auth/register', { username, email, password })

      showToast({
        level: 'success',
        title: 'Account created!',
        message: 'Your account has been created. Redirecting to sign in…',
      })

      setTimeout(() => {
        window.location.href = '/auth/login.html?registered=true'
      }, 1500)
    } catch (err) {
      restore()
      console.error('Registration error:', err)

      if (err instanceof ApiError && err.status === 0) {
        showToast({
          level: 'critical',
          title: 'Connection error',
          message: 'Could not connect to the server. Please check your connection and try again later.',
        })
        return
      }

      const rawMsg = err.data?.message || err.message || 'Registration failed.'
      const lower = rawMsg.toLowerCase()

      if (lower.includes('username') && (lower.includes('taken') || lower.includes('already exists') || lower.includes('in use'))) {
        fieldError($form, 'username', 'This username is already taken.')
        $form.find('#username').trigger('focus')
        return
      }

      if (lower.includes('email') && (lower.includes('registered') || lower.includes('already exists') || lower.includes('in use'))) {
        fieldError($form, 'email', 'An account with this email already exists.')
        $form.find('#email').trigger('focus')
        return
      }

      const safeMsg = sanitizeErrorMessage(rawMsg, 'Unable to create account. Please try again.')
      showToast({ level: 'critical', title: 'Registration failed', message: safeMsg })
    }
  })
}

async function init() {
  await render()
  await initPasswordToggles($('#app')[0])
  wireForm()
}

init()