import $ from '../core/dom.js'

/**
 * Generic dropdown. Markup contract:
 *
 *   <div class="js-dropdown relative">
 *     <button class="js-dropdown-trigger">...</button>
 *     <div class="js-dropdown-panel hidden ...">...</div>
 *   </div>
 *
 * Behavior: click trigger toggles the panel, only one dropdown is open
 * at a time, clicking outside or pressing Escape closes it. This is
 * the only place that logic lives — sidebar/topbar just supply markup
 * in this shape.
 */
export function initDropdowns(scope = document) {
  const $scope = $(scope)

  $scope
    .off('click.ztp-dropdown', '.js-dropdown-trigger')
    .on('click.ztp-dropdown', '.js-dropdown-trigger', function (e) {
      e.stopPropagation()
      const $panel = $(this).siblings('.js-dropdown-panel')
      const isOpen = !$panel.hasClass('hidden')

      $('.js-dropdown-panel').addClass('hidden')
      if (!isOpen) $panel.removeClass('hidden')
    })

  $(document)
    .off('click.ztp-dropdown-outside')
    .on('click.ztp-dropdown-outside', () => $('.js-dropdown-panel').addClass('hidden'))

  $(document)
    .off('keydown.ztp-dropdown-escape')
    .on('keydown.ztp-dropdown-escape', (e) => {
      if (e.key === 'Escape') $('.js-dropdown-panel').addClass('hidden')
    })
}
