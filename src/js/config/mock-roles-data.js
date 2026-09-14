/**
 * Placeholder data for Roles & Permissions. Sample data only — swap
 * `getRoles()` for a real API call once the endpoint exists.
 */
export function getRoles() {
  return [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full access to every area, including user management and platform settings.',
      userCount: 3,
      permissions: ['Manage users', 'Manage roles & permissions', 'View all activity logs', 'Manage platform settings', 'View dashboards & reports'],
    },
    {
      id: 'security-analyst',
      name: 'Security Analyst',
      description: 'Investigates alerts and threats; read-only on user management.',
      userCount: 8,
      permissions: ['View all activity logs', 'Manage alerts & threats', 'View dashboards & reports', 'View users (read-only)'],
    },
    {
      id: 'auditor',
      name: 'Auditor',
      description: 'Read-only access for compliance review across the platform.',
      userCount: 4,
      permissions: ['View all activity logs', 'View dashboards & reports', 'View users (read-only)'],
    },
    {
      id: 'standard-user',
      name: 'Standard User',
      description: 'Access to their own account only.',
      userCount: 27,
      permissions: ['Manage own profile', 'View own devices & sessions'],
    },
  ]
}
