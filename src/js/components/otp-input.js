import $ from '../core/dom.js'

/**
 * Renders `length` single-digit inputs. Typing a digit auto-advances
 * to the next box; Backspace on an empty box moves back; pasting a
 * full code fills every box at once.
 *
 * @param {object} opts
 * @param {string} opts.name       used to build each input's id: `${name}-0`, `${name}-1`, ...
 * @param {number} [opts.length=6]
 */
export function codeInputHTML({ name, length = 6 }) {
  const boxes = Array.from({ length })
    .map(
      (_, i) => `
      <input
        id="${name}-${i}" data-code-index="${i}"
        type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1"
        autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
        class="js-code-box h-12 w-11 rounded-lg border border-neutral-300 text-center text-lg font-semibold text-neutral-900
          focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />`
    )
    .join('')

  return `
  <div class="js-code-input flex justify-between gap-2" data-code-name="${name}" data-code-length="${length}">
    ${boxes}
  </div>
  <p class="js-field-error mt-2 hidden text-xs text-critical-600" role="alert"></p>`
}

/** Reads the full code as a string, e.g. "482913". */
export function getCodeValue($container) {
  return $container
    .find('.js-code-box')
    .map(function () {
      return $(this).val()
    })
    .get()
    .join('')
}

export function initCodeInputs(scope = document) {
  $(scope)
    .find('.js-code-input')
    .each(function () {
      const $container = $(this)
      const $boxes = $container.find('.js-code-box')

      $boxes
        .off('input.ztp-code')
        .on('input.ztp-code', function () {
          const $box = $(this)
          $box.val($box.val().replace(/[^0-9]/g, '').slice(0, 1))
          if ($box.val() && $box.data('code-index') < $boxes.length - 1) {
            $boxes.eq($box.data('code-index') + 1).trigger('focus')
          }
        })
        .off('keydown.ztp-code')
        .on('keydown.ztp-code', function (e) {
          const $box = $(this)
          const index = $box.data('code-index')
          if (e.key === 'Backspace' && !$box.val() && index > 0) {
            $boxes.eq(index - 1).trigger('focus')
          }
        })
        .off('paste.ztp-code')
        .on('paste.ztp-code', function (e) {
          const pasted = (e.originalEvent.clipboardData || window.clipboardData).getData('text')
          const digits = pasted.replace(/[^0-9]/g, '').slice(0, $boxes.length).split('')
          if (!digits.length) return
          e.preventDefault()
          digits.forEach((digit, i) => $boxes.eq(i).val(digit))
          $boxes.eq(Math.min(digits.length, $boxes.length - 1)).trigger('focus')
        })
    })
}
