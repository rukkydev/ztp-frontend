/**
 * Admin sidebar navigation config. Each item's `id` doubles as the
 * data-page value used to mark the active link. Add new pages here —
 * sidebar.js only knows how to render this shape, it doesn't hardcode
 * any page names.
 *
 * hrefs point at their eventual /admin/*.html page whether or not
 * that page is built yet — see README for what's built vs planned.
 */
export const ADMIN_NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/admin/dashboard.html' }],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'alerts', label: 'Alerts', icon: 'bell', href: '/admin/alerts.html' },
      { id: 'threats', label: 'Threats', icon: 'shield-exclamation', href: '/admin/threats.html' },
      { id: 'activity-logs', label: 'Activity Logs', icon: 'document-text', href: '/admin/activity-logs.html' },
      { id: 'network-monitoring', label: 'Network Monitoring', icon: 'wifi', href: '/admin/network-monitoring.html' },
      { id: 'anomaly-detection', label: 'Anomaly Detection', icon: 'magnifying-glass-circle', href: '/admin/anomaly-detection.html' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: 'users', href: '/admin/users.html' },
      { id: 'devices', label: 'Devices', icon: 'device-tablet', href: '/admin/devices.html' },
      { id: 'sessions', label: 'Sessions', icon: 'clock', href: '/admin/sessions.html' },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'key', href: '/admin/roles-permissions.html' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '/admin/reports.html' },
      { id: 'settings', label: 'Settings', icon: 'cog-6-tooth', href: '/admin/settings.html' },
    ],
  },
  {
    label: 'My Account',
    items: [
      { id: 'my-account', label: 'My Account', icon: 'user-circle', href: '/account/index.html' },
    ],
  },
]
