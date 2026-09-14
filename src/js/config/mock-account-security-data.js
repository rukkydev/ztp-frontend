/**
 * Placeholder data for "My Devices" and "My Sessions". Sample data
 * only — nothing is fetched from or revoked on a real backend yet.
 * Swap these two functions for real API calls when the endpoints
 * exist; the pages don't need to change shape. `isCurrent` marks the
 * device/session the person is using right now.
 */
export function getMyDevices() {
  return [
    { id: 'dev-1', name: 'MacBook Pro', iconName: 'computer-desktop', os: 'macOS 15 · Chrome', location: 'Port Harcourt, NG', lastActive: 'Active now', isCurrent: true },
    { id: 'dev-2', name: 'iPhone 15', iconName: 'device-phone-mobile', os: 'iOS 18 · Safari', location: 'Port Harcourt, NG', lastActive: '2 hours ago', isCurrent: false },
    { id: 'dev-3', name: 'Windows Laptop', iconName: 'computer-desktop', os: 'Windows 11 · Edge', location: 'Lagos, NG', lastActive: '3 days ago', isCurrent: false },
    { id: 'dev-4', name: 'iPad Air', iconName: 'device-tablet', os: 'iPadOS 18 · Safari', location: 'Port Harcourt, NG', lastActive: '2 weeks ago', isCurrent: false },
  ]
}

export function getMySessions() {
  return [
    { id: 'sess-1', device: 'MacBook Pro · Chrome', iconName: 'computer-desktop', ip: '102.89.4x.xxx', location: 'Port Harcourt, NG', startedAt: 'Today, 9:42 AM', lastActive: 'Active now', isCurrent: true },
    { id: 'sess-2', device: 'iPhone 15 · Safari', iconName: 'device-phone-mobile', ip: '102.89.4x.xxx', location: 'Port Harcourt, NG', startedAt: 'Today, 7:15 AM', lastActive: '2 hours ago', isCurrent: false },
    { id: 'sess-3', device: 'Windows Laptop · Edge', iconName: 'computer-desktop', ip: '105.112.2x.xxx', location: 'Lagos, NG', startedAt: '3 days ago', lastActive: '3 days ago', isCurrent: false },
  ]
}
