/**
 * Sidebar nav for the /account area (the person managing their own
 * access), as opposed to /admin (managing everyone else's). Same
 * shape as admin-navigation.js — sidebar.js doesn't know the
 * difference.
 */
export const ACCOUNT_NAV_GROUPS = [
  {
    label: 'My Account',
    items: [
      { id: 'overview', label: 'Overview', icon: 'squares-2x2', href: '/account/index.html' },
      { id: 'profile', label: 'Profile', icon: 'user-circle', href: '/account/profile.html' },
      { id: 'devices', label: 'My Devices', icon: 'device-tablet', href: '/account/devices.html' },
      { id: 'sessions', label: 'My Sessions', icon: 'clock', href: '/account/sessions.html' },
      { id: 'notifications', label: 'Notifications', icon: 'bell', href: '/account/notifications.html' },
      { id: 'notification-settings', label: 'Notification Settings', icon: 'adjustments-horizontal', href: '/account/notification-settings.html' },
    ],
  },
]
