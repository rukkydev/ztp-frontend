import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'
import { STATUS_LEVELS } from '../config/status-levels.js'
import { escapeHTML } from '../utils/sanitize.js'

const CONTAINER_ID = 'ztp-toast-container'
let toastCounter = 0

function ensureContainer() {
  let $container = $(`#${CONTAINER_ID}`)
  if (!$container.length) {
    $container = $(
      `<div id="${CONTAINER_ID}" class="fixed top-4 right-4 z-[60] flex w-80 flex-col gap-2" aria-label="Notifications" role="region"></div>`
    )
    $('body').append($container)
  }
  return $container
}

/**
 * Show a toast. Auto-dismisses after `duration` ms unless duration is 0.
 *
 *   showToast({ level: 'success', title: 'Changes saved' })
 *   showToast({ level: 'critical', title: 'Session revoked', message: 'This device was signed out.', duration: 0 })
 *
 * @param {object} opts
 * @param {'info'|'success'|'warning'|'critical'} [opts.level='info']
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {number} [opts.duration=5000]  ms before auto-dismiss; 0 = persistent
 */
export async function showToast({ level = 'info', title, message = '', duration = 5000 }) {
  const config = STATUS_LEVELS[level]
  const iconSvg = await icon(config.icon, { className: 'w-5 h-5 shrink-0' })
  const closeIcon = await icon('x-mark', { className: 'w-4 h-4' })

  const id = `ztp-toast-${++toastCounter}`
  const role = level === 'critical' ? 'alert' : 'status'

  const $toast = $(`
    <div id="${id}" role="${role}"
      class="js-ztp-toast flex items-start gap-3 rounded-lg border bg-white p-4 shadow-[var(--shadow-overlay)] ${config.classes}
        translate-x-4 opacity-0 transition-all duration-150">
      ${iconSvg}
      <div class="min-w-0 flex-1">
        <p class="font-medium text-neutral-900">${escapeHTML(title)}</p>
        ${message ? `<p class="mt-0.5 text-sm text-neutral-600">${escapeHTML(message)}</p>` : ''}
      </div>
      <button type="button" class="js-toast-dismiss shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-black/5" aria-label="Dismiss">
        ${closeIcon}
      </button>
    </div>`)

  ensureContainer().append($toast)

  // Next tick, so the transition actually animates in.
  requestAnimationFrame(() => $toast.removeClass('translate-x-4 opacity-0'))

  const dismiss = () => {
    $toast.addClass('translate-x-4 opacity-0')
    setTimeout(() => $toast.remove(), 150)
  }

  $toast.find('.js-toast-dismiss').on('click', dismiss)
  if (duration > 0) setTimeout(dismiss, duration)

  return id
}
