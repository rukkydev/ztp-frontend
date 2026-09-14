import { icon } from '../utils/icons.js'
import { buttonHTML } from './button.js'

/**
 * Top nav for pages outside the authenticated app (landing, docs).
 * Just a brand mark, a Docs link, and a Sign in button — there's no
 * sidebar here since nobody's authenticated yet.
 */
export async function publicNavHTML() {
  const brandIcon = await icon('shield-check', { className: 'w-6 h-6 text-primary-600' })

  return `
  <header class="border-b border-neutral-200 bg-white">
    <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
      <a href="/index.html" class="flex items-center gap-2">
        ${brandIcon}
        <span class="text-base font-semibold text-neutral-900">ZTP</span>
      </a>
      <nav class="flex items-center gap-2">
        <a href="/docs.html" class="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">Docs</a>
        ${buttonHTML({ variant: 'primary', label: 'Sign in', href: '/auth/login.html' })}
      </nav>
    </div>
  </header>`
}
