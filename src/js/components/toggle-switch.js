/**
 * A labeled on/off switch, styled as a track+thumb rather than a
 * checkbox. Backed by a real checkbox input for accessibility/keyboard
 * support — the switch look is CSS on top of it.
 *
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.label
 * @param {string} [opts.description]
 * @param {boolean} [opts.checked=false]
 */
export function toggleSwitchHTML({ id, label, description = '', checked = false }) {
  return `
  <label for="${id}" class="flex cursor-pointer items-start justify-between gap-4 py-3">
    <span class="min-w-0">
      <span class="block text-sm font-medium text-neutral-800">${label}</span>
      ${description ? `<span class="block text-xs text-neutral-400">${description}</span>` : ''}
    </span>
    <span class="relative inline-flex shrink-0 items-center">
      <input type="checkbox" id="${id}" class="js-toggle peer sr-only" ${checked ? 'checked' : ''} />
      <span class="h-6 w-10 rounded-full bg-neutral-200 transition-colors peer-checked:bg-primary-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500"></span>
      <span class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></span>
    </span>
  </label>`
}
