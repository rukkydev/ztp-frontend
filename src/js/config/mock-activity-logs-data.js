/**
 * Placeholder data for the Activity Logs table. Sample data only —
 * swap `getActivityLogs()` for a real API call once the endpoint
 * exists. `timestamp` is a real ISO date/time (unlike the friendly
 * "3h ago" strings used elsewhere) specifically so the date-range
 * filter has something real to compare against — `timestampDisplay`
 * is what actually renders in the table.
 */
export function getActivityLogs() {
  const users = ['Jordan Blake', 'Riley Chen', 'Casey Patel', 'Morgan Nguyen', 'Taylor Garcia', 'Alex Kim']
  const actions = ['Signed in', 'Signed out', 'Updated profile', 'Changed password', 'Enrolled new device', 'Exported report', 'Updated role permissions', 'Viewed sensitive record']
  const resources = ['Auth Service', 'User Profile', 'Device Registry', 'Reports Module', 'Roles & Permissions', 'Users Directory']

  const logs = []
  const now = new Date()
  for (let i = 0; i < 60; i++) {
    const daysAgo = (i * 11) % 30
    const timestamp = new Date(now)
    timestamp.setDate(timestamp.getDate() - daysAgo)
    timestamp.setHours(8 + (i % 10), (i * 7) % 60, 0, 0)

    logs.push({
      id: i + 1,
      timestamp: timestamp.toISOString(),
      timestampDisplay: timestamp.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      user: users[i % users.length],
      action: actions[i % actions.length],
      resource: resources[i % resources.length],
      ip: `10${i % 9}.5${i % 8}.${i % 90}.${(i * 7) % 200}`,
      status: i % 9 === 0 ? 'Failed' : 'Success',
    })
  }
  return logs
}
