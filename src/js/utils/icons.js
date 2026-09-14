/**
 * Heroicons loader
 * ------------------------------------------------------------------
 * Heroicons ships as raw SVG files inside node_modules/heroicons.
 * We inline them (rather than <img src="...">) so they inherit
 * `currentColor` and can be sized/colored with Tailwind classes.
 *
 * Usage:
 *   import { icon } from '../utils/icons.js'
 *   $('#slot').html(await icon('shield-check'))
 *   $('#slot').html(await icon('bell', { variant: 'solid', size: 20 }))
 */

// Vite glob-imports every icon as a raw string at build time.
// Keeping this to the two variants/sizes we use keeps the bundle lean —
// add more globs here only if a new set is genuinely needed.
const OUTLINE_24 = import.meta.glob('/node_modules/heroicons/24/outline/*.svg', {
  query: '?raw',
  import: 'default',
})
const SOLID_24 = import.meta.glob('/node_modules/heroicons/24/solid/*.svg', {
  query: '?raw',
  import: 'default',
})
const SOLID_20 = import.meta.glob('/node_modules/heroicons/20/solid/*.svg', {
  query: '?raw',
  import: 'default',
})

const REGISTRIES = {
  '24-outline': OUTLINE_24,
  '24-solid': SOLID_24,
  '20-solid': SOLID_20,
}

const cache = new Map()

/**
 * @param {string} name    icon name, e.g. "shield-check"
 * @param {object} [opts]
 * @param {'outline'|'solid'} [opts.variant='outline']
 * @param {16|20|24} [opts.size=24]  only 20 (solid) and 24 (outline/solid) are bundled
 * @param {string} [opts.className]  extra classes applied to the <svg>
 * @returns {Promise<string>} inline SVG markup
 */
export async function icon(name, { variant = 'outline', size = 24, className = '' } = {}) {
  const effectiveSize = variant === 'outline' ? 24 : size
  const key = `${effectiveSize}-${variant}`
  const cacheKey = `${key}/${name}/${className}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const registry = REGISTRIES[key]
  if (!registry) {
    throw new Error(`ztp/icons: no registry for ${key}. Bundled sets: ${Object.keys(REGISTRIES).join(', ')}`)
  }

  const path = `/node_modules/heroicons/${effectiveSize}/${variant}/${name}.svg`
  const loader = registry[path]
  if (!loader) {
    throw new Error(`ztp/icons: icon "${name}" not found in ${key}`)
  }

  let svg = await loader()
  if (className) {
    svg = svg.replace('<svg ', `<svg class="${className}" `)
  }

  cache.set(cacheKey, svg)
  return svg
}

/**
 * jQuery convenience: inject an icon into every matched element.
 *   $('.js-icon-shield').ztpIcon('shield-check', { className: 'w-5 h-5' })
 */
export function registerIconPlugin($) {
  $.fn.ztpIcon = function (name, opts) {
    return this.each(function () {
      const $el = $(this)
      icon(name, opts).then((svg) => $el.html(svg))
    })
  }
}
