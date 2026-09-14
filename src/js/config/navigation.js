/**
 * Sidebar navigation config. Each item's `id` doubles as the
 * data-page value used to mark the active link. Add new pages here —
 * sidebar.js only knows how to render this shape, it doesn't hardcode
 * any page names.
 */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home', href: '#dashboard' }],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'alerts', label: 'Alerts', icon: 'bell', href: '#alerts' },
      { id: 'threats', label: 'Threats', icon: 'shield-exclamation', href: '#threats' },
      { id: 'activity-logs', label: 'Activity Logs', icon: 'document-text', href: '#activity-logs' },
      { id: 'network-monitoring', label: 'Network Monitoring', icon: 'wifi', href: '#network-monitoring' },
      { id: 'anomaly-detection', label: 'Anomaly Detection', icon: 'magnifying-glass-circle', href: '#anomaly-detection' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: 'users', href: '/users.html' },
      { id: 'devices', label: 'Devices', icon: 'device-tablet', href: '#devices' },
      { id: 'sessions', label: 'Sessions', icon: 'clock', href: '#sessions' },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'key', href: '#roles-permissions' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'reports', label: 'Reports', icon: 'chart-bar', href: '#reports' },
      { id: 'settings', label: 'Settings', icon: 'cog-6-tooth', href: '#settings' },
    ],
  },
]
