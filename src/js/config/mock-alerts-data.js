/**
 * Placeholder data for the Alerts table. Sample data only — swap
 * `getAlerts()` for a real API call once the endpoint exists.
 */
export function getAlerts() {
  const templates = [
    { severity: 'Critical', title: 'High-risk login blocked', source: 'Auth Service' },
    { severity: 'Critical', title: 'Impossible travel detected', source: 'Auth Service' },
    { severity: 'Warning', title: 'Multiple failed login attempts', source: 'Auth Service' },
    { severity: 'Warning', title: 'New device enrolled without 2FA', source: 'Device Service' },
    { severity: 'Info', title: 'Password rotation reminder sent', source: 'Notification Service' },
    { severity: 'Info', title: 'Weekly compliance scan completed', source: 'Compliance Engine' },
  ]
  const users = ['j.blake@company.com', 'r.chen@company.com', 'c.patel@company.com', 'm.nguyen@company.com', 't.garcia@company.com']

  const alerts = []
  for (let i = 0; i < 32; i++) {
    const template = templates[i % templates.length]
    const hoursAgo = (i * 3) % 72
    alerts.push({
      id: i + 1,
      severity: template.severity,
      title: `${template.title} — ${users[i % users.length]}`,
      source: template.source,
      triggeredAt: hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
      status: i % 4 === 0 ? 'Resolved' : 'Open',
    })
  }
  return alerts
}
