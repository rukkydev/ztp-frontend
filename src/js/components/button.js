import $ from '../core/dom.js'

/**
 * Button markup. Radius, borders, and color usage follow the ZTP
 * tokens — primary color reserved for the primary variant only.
 *
 * @param {object} opts
 * @param {'primary'|'secondary'|'danger'|'ghost'} [opts.variant='secondary']
 * @param {'sm'|'md'} [opts.size='md']
 * @param {string} opts.label
 * @param {boolean} [opts.disabled=false]
 * @param {string} [opts.type='button']
 * @param {string} [opts.href]  renders an <a> styled identically instead of a <button> — use for navigation, never for form submission or in-page actions
 * @param {object} [opts.attrs] extra HTML attributes, e.g. { 'data-action': 'submit' }
 */
export function buttonHTML({
  variant = 'secondary',
  size = 'md',
  label,
  disabled = false,
  type = 'button',
  href = '',
  className = '',
  attrs = {},
} = {}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium ' +
    'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
  }

  const variants = {
    primary:
      'bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 focus-visible:outline-primary-500',
    secondary:
      'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus-visible:outline-primary-500',
    danger:
      'bg-white text-critical-600 border border-critical-500/40 hover:bg-critical-50 focus-visible:outline-critical-500',
    ghost:
      'bg-transparent text-neutral-600 border border-transparent hover:bg-neutral-100 focus-visible:outline-primary-500',
  }

  const attrString = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')

  if (href) {
    return `<a href="${href}" ${attrString}
      class="${base} ${sizes[size]} ${variants[variant]} ${className}">${label}</a>`
  }

  return `<button type="${type}" ${disabled ? 'disabled' : ''} ${attrString}
    class="${base} ${sizes[size]} ${variants[variant]} ${className}">${label}</button>`
}

/**
 * Wires up buttons marked with data-loading-text. On click, disables
 * the button and swaps its label — used for form submits so a click
 * can never be accidentally repeated while a request is in flight.
 *
 * Call once after the relevant markup is in the DOM.
 */
export function initLoadingButtons(scope = document) {
  $(scope)
    .find('[data-loading-text]')
    .off('click.ztp-loading')
    .on('click.ztp-loading', function () {
      const $btn = $(this)
      if ($btn.prop('disabled')) return
      $btn.data('ztp-original-label', $btn.text())
      $btn.prop('disabled', true).text($btn.data('loading-text'))
    })
}
