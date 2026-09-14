/**
 * Placeholder data for the Users table. Sample data only — nothing is
 * fetched from a real backend yet. Swap `getUsers()` for an actual API
 * call when the endpoint exists; the table doesn't need to change.
 */
export function getUsers() {
  const roles = ['Admin', 'Security Analyst', 'Auditor', 'Standard User']
  const statuses = ['Active', 'Invited', 'Suspended']
  const firstNames = ['Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Alex', 'Sam', 'Jamie', 'Drew', 'Avery', 'Quinn', 'Reese']
  const lastNames = ['Blake', 'Chen', 'Patel', 'Nguyen', 'Garcia', 'Kim', 'Okafor', 'Rossi', 'Novak', 'Silva', 'Haddad', 'Ibrahim']

  const users = []
  for (let i = 0; i < 42; i++) {
    const first = firstNames[i % firstNames.length]
    const last = lastNames[(i * 3) % lastNames.length]
    const daysAgo = (i * 7) % 30
    users.push({
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@company.com`,
      role: roles[i % roles.length],
      status: statuses[i % statuses.length === 2 && i % 5 !== 0 ? 0 : i % statuses.length],
      lastActive: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
    })
  }
  return users
}
