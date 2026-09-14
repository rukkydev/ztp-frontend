import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'

/**
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} [opts.label='Password']
 * @param {string} [opts.autocomplete='current-password']
 */
export function passwordFieldHTML({ id, label = 'Password', autocomplete = 'current-password' }) {
  return `
  <div class="mb-4">
    <label for="${id}" class="mb-1.5 block text-sm font-medium text-neutral-700">${label}</label>
    <div class="relative">
      <input
        id="${id}"
        name="${id}"
        type="password"
        autocomplete="${autocomplete}"
        required aria-required="true"
        class="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-10 text-sm text-neutral-900
          focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      <button type="button"
        class="js-password-toggle absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600"
        data-target="${id}" aria-label="Show password" aria-pressed="false">
        <span class="js-password-toggle-icon inline-block h-4 w-4"></span>
      </button>
    </div>
    <p class="js-field-error mt-1.5 hidden text-xs text-critical-600" id="${id}-error" role="alert"></p>
  </div>`
}

/**
 * Wires every show/hide toggle within `scope`. Password stays masked
 * by default; toggling never changes the underlying value, only
 * whether it's visible.
 */
export async function initPasswordToggles(scope = document) {
  const eyeIcon = await icon('eye', { className: 'h-4 w-4' })
  const eyeSlashIcon = await icon('eye-slash', { className: 'h-4 w-4' })

  $(scope)
    .find('.js-password-toggle')
    .each(function () {
      $(this).find('.js-password-toggle-icon').html(eyeIcon)
    })
    .off('click.ztp-password-toggle')
    .on('click.ztp-password-toggle', function () {
      const $btn = $(this)
      const $input = $(`#${$btn.data('target')}`)
      const isHidden = $input.attr('type') === 'password'

      $input.attr('type', isHidden ? 'text' : 'password')
      $btn.find('.js-password-toggle-icon').html(isHidden ? eyeSlashIcon : eyeIcon)
      $btn.attr('aria-pressed', String(isHidden)).attr('aria-label', isHidden ? 'Hide password' : 'Show password')
    })
}
