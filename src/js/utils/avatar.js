import { BACKEND_ORIGIN } from '../core/api-config.js'

/**
 * Constructs the absolute URL for an avatar image.
 * Static uploads under /uploads/... are served directly by Spring Boot on port 8080
 * (or VITE_BACKEND_ORIGIN), not through the Vite dev proxy on port 5176.
 */
export function getAvatarSrc(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }
  const cleanPath = trimmed.replace(/^\//, '')
  return `${BACKEND_ORIGIN}/${cleanPath}`
}

export function initials(name) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
