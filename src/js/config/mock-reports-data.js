/**
 * Placeholder data for the Reports table. Sample data only — swap
 * `getReports()` for a real API call once the endpoint exists.
 */
export function getReports() {
  const names = [
    { name: 'Monthly Compliance Summary', type: 'Compliance' },
    { name: 'Access Review — Q3', type: 'Compliance' },
    { name: 'Security Incident Report', type: 'Security' },
    { name: 'Failed Login Analysis', type: 'Security' },
    { name: 'User Activity Summary', type: 'Usage' },
    { name: 'Device Enrollment Report', type: 'Usage' },
  ]
  const generatedBy = ['Jordan Blake', 'Riley Chen', 'Casey Patel', 'System (scheduled)']

  const reports = []
  for (let i = 0; i < 18; i++) {
    const template = names[i % names.length]
    const daysAgo = (i * 3) % 30
    reports.push({
      id: i + 1,
      name: `${template.name}${i >= names.length ? ` (${Math.floor(i / names.length) + 1})` : ''}`,
      type: template.type,
      generatedAt: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
      generatedBy: generatedBy[i % generatedBy.length],
      status: i % 7 === 0 ? 'Processing' : 'Ready',
      fileSize: `${(1.2 + (i % 8) * 0.4).toFixed(1)} MB`,
    })
  }
  return reports
}
