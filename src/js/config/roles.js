/**
 * CONFIRMED with backend: `role` on LoginResponse.user and GET
 * /auth/me is a plain string, one of these three. Nothing else is
 * currently a valid value — don't add to this list without a backend
 * confirm, the same way these three were confirmed.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SECURITY_NETWORK_ADMIN: 'SECURITY_NETWORK_ADMIN',
  USER: 'USER',
}

/**
 * Roles allowed into /admin/*. Both admin-tier roles land here —
 * there's no UI distinction between SUPER_ADMIN and
 * SECURITY_NETWORK_ADMIN yet (e.g. a SUPER_ADMIN-only settings
 * section); add one if the backend starts enforcing that distinction
 * and the frontend needs to match it.
 */
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SECURITY_NETWORK_ADMIN]

/** Where a person lands right after login, based on their role. */
export function homePathForRole(role) {
  return ADMIN_ROLES.includes(role) ? '/admin/dashboard.html' : '/account/index.html'
}
