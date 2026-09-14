/**
 * Placeholder data for the Admin Sessions table (every active session
 * across the org, as opposed to /account/sessions.html). Sample data
 * only — swap `getAdminSessions()` for a real API call once the
 * endpoint exists; the table doesn't need to change.
 */
export function getAdminSessions() {
  const users = ['Jordan Blake', 'Riley Chen', 'Casey Patel', 'Morgan Nguyen', 'Taylor Garcia', 'Alex Kim', 'Sam Okafor', 'Jamie Rossi']
  const devices = ['MacBook Pro · Chrome', 'iPhone 15 · Safari', 'Windows Laptop · Edge', 'Pixel 9 · Chrome', 'iPad Air · Safari']
  const locations = ['Port Harcourt, NG', 'Lagos, NG', 'Abuja, NG', 'Remote']
  const risks = ['Normal', 'Normal', 'Normal', 'Elevated']

  const sessions = []
  for (let i = 0; i < 28; i++) {
    const minutesAgo = (i * 13) % 240
    sessions.push({
      id: i + 1,
      user: users[i % users.length],
      device: devices[i % devices.length],
      ip: `10${i % 9}.5${i % 8}.${i % 90}.${(i * 7) % 200}`,
      location: locations[i % locations.length],
      risk: risks[i % risks.length],
      lastActive: minutesAgo < 5 ? 'Active now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`,
    })
  }
  return sessions
}
