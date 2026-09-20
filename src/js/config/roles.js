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
  ADMIN: 'admin',
  SECURITY_ANALYST: 'security_analyst',
}

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.SECURITY_NETWORK_ADMIN,
  ROLES.ADMIN,
  ROLES.SECURITY_ANALYST,
  'admin',
  'security_analyst',
]

/** Where a person lands right after login, based on their role or user type. */
export function homePathForRole(role) {
  if (!role) return '/account/index.html'
  const normalized = String(role).toLowerCase()
  if (normalized === 'admin' || normalized === 'security_analyst' || normalized === 'super_admin' || normalized === 'security_network_admin') {
    return '/admin/dashboard.html'
  }
  return ADMIN_ROLES.includes(role) ? '/admin/dashboard.html' : '/account/index.html'
}
