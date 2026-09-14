/**
 * Placeholder data for the Admin Devices table (the org-wide fleet,
 * as opposed to /account/devices.html which is just the signed-in
 * person's own devices). Sample data only — swap `getAdminDevices()`
 * for a real API call once the endpoint exists; the table doesn't
 * need to change.
 */
export function getAdminDevices() {
  const owners = ['Jordan Blake', 'Riley Chen', 'Casey Patel', 'Morgan Nguyen', 'Taylor Garcia', 'Alex Kim', 'Sam Okafor', 'Jamie Rossi']
  const types = [
    { name: 'MacBook Pro', os: 'macOS 15', iconName: 'computer-desktop' },
    { name: 'Windows Laptop', os: 'Windows 11', iconName: 'computer-desktop' },
    { name: 'iPhone 15', os: 'iOS 18', iconName: 'device-phone-mobile' },
    { name: 'Pixel 9', os: 'Android 15', iconName: 'device-phone-mobile' },
    { name: 'iPad Air', os: 'iPadOS 18', iconName: 'device-tablet' },
  ]
  const statuses = ['Trusted', 'Trusted', 'Trusted', 'Blocked']
  const locations = ['Port Harcourt, NG', 'Lagos, NG', 'Abuja, NG', 'Remote']

  const devices = []
  for (let i = 0; i < 35; i++) {
    const type = types[i % types.length]
    const daysAgo = (i * 5) % 20
    devices.push({
      id: i + 1,
      name: type.name,
      iconName: type.iconName,
      owner: owners[i % owners.length],
      os: type.os,
      status: statuses[i % statuses.length],
      location: locations[i % locations.length],
      lastActive: daysAgo === 0 ? 'Active now' : `${daysAgo}d ago`,
    })
  }
  return devices
}
