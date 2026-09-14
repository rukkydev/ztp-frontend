/**
 * Mock in-app notifications data fallback for testing and offline/error states.
 */
export function getMockNotifications() {
  return [
    {
      id: 101,
      eventKey: 'login_alerts',
      title: 'New login detected',
      message: 'A new login was recorded from Windows PC (IP 10.48.54.236).',
      read: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
    },
    {
      id: 102,
      eventKey: 'critical_alerts',
      title: 'Untrusted device attempt',
      message: 'An unrecognized device attempted to log in from IP 192.168.1.105.',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    },
    {
      id: 103,
      eventKey: 'security_updates',
      title: 'Recovery phrase generated',
      message: 'A new 12-word account recovery phrase was successfully generated.',
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    },
    {
      id: 104,
      eventKey: 'account_changes',
      title: 'Profile updated',
      message: 'Your account contact details were updated.',
      read: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3d ago
    },
    {
      id: 105,
      eventKey: 'security_updates',
      title: 'Notification preferences updated',
      message: 'Security update channel preferences were saved.',
      read: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5d ago
    },
  ]
}
