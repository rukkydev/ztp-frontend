import { icon } from '../utils/icons.js'

/**
 * Full-page shell for auth screens (login, 2FA, access denied, etc.).
 * These pages have no sidebar/topbar — the person isn't authenticated
 * yet, or is being told they can't proceed, so the shell is just a
 * centered card on a quiet background.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {string} opts.contentHTML   form fields / message body
 * @param {string} [opts.footerHTML]  links below the card (e.g. "Back to sign in")
 * @param {'sm'|'md'} [opts.width='sm']
 */
export async function authShellHTML({ title, subtitle = '', contentHTML, footerHTML = '', width = 'sm' }) {
  const brandIcon = await icon('shield-check', { className: 'w-7 h-7 text-primary-600' })
  const widths = { sm: 'max-w-sm', md: 'max-w-md' }

  return `
  <div class="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
    <div class="mb-6 flex items-center gap-2">
      ${brandIcon}
      <span class="text-base font-semibold text-neutral-900">ZTP</span>
    </div>

    <div class="w-full ${widths[width]} rounded-lg border border-neutral-200 bg-white p-8 shadow-[var(--shadow-subtle)]">
      <h1 class="text-lg font-semibold text-neutral-900">${title}</h1>
      ${subtitle ? `<p class="mt-1 text-sm text-neutral-500">${subtitle}</p>` : ''}
      <div class="mt-6">${contentHTML}</div>
    </div>

    ${footerHTML ? `<div class="mt-6 text-sm text-neutral-500">${footerHTML}</div>` : ''}

    <p class="mt-10 text-xs text-neutral-400">Protected by ZTP Zero Trust verification</p>
  </div>`
}
