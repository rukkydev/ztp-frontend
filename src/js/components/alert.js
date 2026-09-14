import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'
import { STATUS_LEVELS } from '../config/status-levels.js'
import { escapeHTML } from '../utils/sanitize.js'

/**
 * Alert markup for Information / Success / Warning / Critical states.
 * Critical alerts use the same visual weight as the others by design —
 * urgency comes from color + icon, not size, so the interface never
 * feels like it's shouting.
 *
 * @param {object} opts
 * @param {'info'|'success'|'warning'|'critical'} [opts.level='info']
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {boolean} [opts.dismissible=true]
 */
export async function alertHTML({ level = 'info', title, message = '', dismissible = true }) {
  const config = STATUS_LEVELS[level]
  const iconSvg = await icon(config.icon, { className: 'w-5 h-5 shrink-0' })

  return `<div class="js-ztp-alert flex items-start gap-3 rounded-lg border p-4 ${config.classes}" role="alert">
    ${iconSvg}
    <div class="min-w-0 flex-1">
      <p class="font-medium text-neutral-900">${escapeHTML(title)}</p>
      ${message ? `<p class="mt-0.5 text-sm text-neutral-600">${escapeHTML(message)}</p>` : ''}
    </div>
    ${
      dismissible
        ? `<button type="button" class="js-ztp-alert-dismiss shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-black/5" aria-label="Dismiss">&times;</button>`
        : ''
    }
  </div>`
}

export function initAlertDismiss(scope = document) {
  $(scope)
    .off('click.ztp-alert-dismiss')
    .on('click.ztp-alert-dismiss', '.js-ztp-alert-dismiss', function () {
      $(this).closest('.js-ztp-alert').fadeOut(150, function () {
        $(this).remove()
      })
    })
}
