import $ from '../core/dom.js'

/**
 * Labeled text input with a reserved error slot. Errors are injected
 * by validation.js helpers, never written by hand — keeps the markup
 * and the validation logic in sync.
 *
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.label
 * @param {string} [opts.type='text']
 * @param {string} [opts.placeholder]
 * @param {string} [opts.autocomplete]
 * @param {boolean} [opts.required=true]
 */
export function textFieldHTML({ id, label, type = 'text', placeholder = '', autocomplete = '', required = true }) {
  return `
  <div class="mb-4">
    <label for="${id}" class="mb-1.5 block text-sm font-medium text-neutral-700">${label}</label>
    <input
      id="${id}"
      name="${id}"
      type="${type}"
      ${placeholder ? `placeholder="${placeholder}"` : ''}
      ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
      ${required ? 'required aria-required="true"' : ''}
      class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400
        focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
    />
    <p class="js-field-error mt-1.5 hidden text-xs text-critical-600" id="${id}-error" role="alert"></p>
  </div>`
}

/**
 * Labeled select dropdown, same error-slot contract as textFieldHTML.
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.label
 * @param {Array<{value: string, label: string}>} opts.options
 * @param {string} [opts.value]  currently-selected value
 */
export function selectFieldHTML({ id, label, options, value = '' }) {
  const optionTags = options
    .map((opt) => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`)
    .join('')

  return `
  <div class="mb-4">
    <label for="${id}" class="mb-1.5 block text-sm font-medium text-neutral-700">${label}</label>
    <select
      id="${id}"
      name="${id}"
      class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
        focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
    >${optionTags}</select>
    <p class="js-field-error mt-1.5 hidden text-xs text-critical-600" id="${id}-error" role="alert"></p>
  </div>`
}

export function fieldError($form, fieldId, message) {
  const $input = $form.find(`#${fieldId}`)
  const $error = $form.find(`#${fieldId}-error`)
  $input.addClass('border-critical-500').attr('aria-invalid', 'true').attr('aria-describedby', `${fieldId}-error`)
  $error.text(message).removeClass('hidden')
}

export function clearFieldError($form, fieldId) {
  const $input = $form.find(`#${fieldId}`)
  const $error = $form.find(`#${fieldId}-error`)
  $input.removeClass('border-critical-500').removeAttr('aria-invalid')
  $error.text('').addClass('hidden')
}

export function clearAllFieldErrors($form) {
  $form.find('.js-field-error').text('').addClass('hidden')
  $form.find('input').removeClass('border-critical-500').removeAttr('aria-invalid')
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/**
 * Disables the submit button and swaps its label while a form is
 * "processing" — prevents double submits on a security-sensitive form.
 * Call the returned function to restore the button afterwards.
 */
export function setSubmitting($button, loadingLabel) {
  const originalLabel = $button.text()
  $button.prop('disabled', true).text(loadingLabel)
  return () => $button.prop('disabled', false).text(originalLabel)
}
