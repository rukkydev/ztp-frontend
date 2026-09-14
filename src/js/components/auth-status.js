import { icon } from '../utils/icons.js'

const TONE_CLASSES = {
  neutral: 'bg-neutral-100 text-neutral-500',
  warning: 'bg-warning-50 text-warning-600',
  critical: 'bg-critical-50 text-critical-600',
}

/**
 * Centered icon + message body used by the no-form auth screens.
 * @param {object} opts
 * @param {string} opts.iconName
 * @param {'neutral'|'warning'|'critical'} [opts.tone='neutral']
 * @param {string} opts.message
 * @param {string} [opts.actionHTML]  pre-rendered button(s)
 */
export async function statusContentHTML({ iconName, tone = 'neutral', message, actionHTML = '' }) {
  const iconSvg = await icon(iconName, { className: 'w-6 h-6' })

  return `
  <div class="flex flex-col items-center text-center">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full ${TONE_CLASSES[tone]}">
      ${iconSvg}
    </div>
    <p class="text-sm text-neutral-600">${message}</p>
    ${actionHTML ? `<div class="mt-6 w-full">${actionHTML}</div>` : ''}
  </div>`
}
