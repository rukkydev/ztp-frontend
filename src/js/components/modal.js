import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'
import { buttonHTML } from './button.js'
import { escapeHTML } from '../utils/sanitize.js'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

let lastFocusedElement = null

/**
 * Declarative modal markup — for modals whose content lives on the
 * page (e.g. an "Add user" form) and is just shown/hidden by id.
 *
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.title  escaped automatically — plain text, not markup
 * @param {string} opts.bodyHTML  raw markup, rendered as-is — escape any dynamic text you interpolate into it yourself (see utils/sanitize.js)
 * @param {string} [opts.footerHTML]  same as bodyHTML — raw markup, escape dynamic text yourself
 * @param {'sm'|'md'|'lg'} [opts.size='md']
 */
export function modalHTML({ id, title, bodyHTML, footerHTML = '', size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

  return `
  <div id="${id}" class="js-modal fixed inset-0 z-50 hidden">
    <div class="js-modal-backdrop absolute inset-0 bg-neutral-900/40"></div>
    <div class="relative flex min-h-full items-center justify-center p-4">
      <div class="js-modal-panel w-full ${sizes[size]} rounded-lg border border-neutral-200 bg-white shadow-[var(--shadow-overlay)]"
           role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 id="${id}-title" class="text-sm font-semibold text-neutral-900">${escapeHTML(title)}</h2>
          <button type="button" class="js-modal-close rounded-lg p-1 text-neutral-400 hover:bg-neutral-100" aria-label="Close">
            <span class="js-modal-close-icon inline-block h-4 w-4"></span>
          </button>
        </div>
        <div class="js-modal-body px-5 py-4 text-sm text-neutral-600">${bodyHTML}</div>
        ${footerHTML ? `<div class="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">${footerHTML}</div>` : ''}
      </div>
    </div>
  </div>`
}

export function openModal(id) {
  lastFocusedElement = document.activeElement
  const $modal = $(`#${id}`)
  $modal.removeClass('hidden')
  document.body.classList.add('overflow-hidden')

  const $focusable = $modal.find(FOCUSABLE)
  if ($focusable.length) $focusable.first().trigger('focus')
}

export function closeModal(id) {
  $(`#${id}`).addClass('hidden')
  document.body.classList.remove('overflow-hidden')
  if (lastFocusedElement) lastFocusedElement.focus()
}

/**
 * Wires close button / backdrop click / Escape, and traps Tab focus
 * inside whichever modal is currently open. Call once at app init.
 */
export async function initModals() {
  const closeIcon = await icon('x-mark', { className: 'h-4 w-4' })
  $('.js-modal-close-icon').html(closeIcon)

  $(document)
    .off('click.ztp-modal')
    .on('click.ztp-modal', '.js-modal-close, .js-modal-backdrop', function () {
      const id = $(this).closest('.js-modal').attr('id')
      closeModal(id)
    })

  $(document)
    .off('keydown.ztp-modal')
    .on('keydown.ztp-modal', function (e) {
      const $open = $('.js-modal').not('.hidden')
      if (!$open.length) return

      if (e.key === 'Escape') {
        closeModal($open.attr('id'))
        return
      }

      if (e.key === 'Tab') {
        const $focusable = $open.find(FOCUSABLE)
        if (!$focusable.length) return
        const first = $focusable.get(0)
        const last = $focusable.get($focusable.length - 1)

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    })
}

/**
 * Promise-based confirmation dialog for destructive or otherwise
 * risky actions. Builds its own modal, injects it, resolves true/false,
 * then removes itself — no id management needed at the call site.
 *
 *   const ok = await confirmDialog({
 *     title: 'Revoke access?',
 *     message: 'This user will be signed out of every session immediately.',
 *     confirmLabel: 'Revoke access',
 *     tone: 'danger',
 *   })
 *   if (ok) { ... }
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary', // 'primary' | 'danger'
} = {}) {
  return new Promise(async (resolve) => {
    const id = `confirm-dialog-${Date.now()}`
    const closeIcon = await icon('x-mark', { className: 'h-4 w-4' })

    const footerHTML = `
      <span class="js-confirm-cancel contents">${buttonHTML({ variant: 'ghost', label: cancelLabel })}</span>
      <span class="js-confirm-ok contents">${buttonHTML({
        variant: tone === 'danger' ? 'danger' : 'primary',
        label: confirmLabel,
      })}</span>`

    const $el = $(
      modalHTML({
        id,
        title,
        bodyHTML: `<p>${escapeHTML(message)}</p>`,
        footerHTML,
        size: 'sm',
      })
    )
    $el.find('.js-modal-close-icon').html(closeIcon)
    $('body').append($el)

    const cleanup = (result) => {
      closeModal(id)
      setTimeout(() => $el.remove(), 150)
      resolve(result)
    }

    $el.find('.js-confirm-ok button').on('click', () => cleanup(true))
    $el.find('.js-confirm-cancel button').on('click', () => cleanup(false))
    $el.find('.js-modal-close, .js-modal-backdrop').on('click', () => cleanup(false))
    $(document).one('keydown.ztp-confirm-escape', (e) => {
      if (e.key === 'Escape' && !$el.hasClass('hidden')) cleanup(false)
    })

    openModal(id)
  })
}
