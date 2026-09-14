/**
 * Placeholder data for Anomaly Detection. Sample data only — swap
 * `getAnomalyDetectionData()` for a real API call once the endpoint
 * exists.
 */
export function getAnomalyDetectionData() {
  const types = ['Unusual login time', 'Impossible travel', 'Abnormal data access volume', 'New device + new location', 'Privilege usage spike']
  const entities = ['j.blake@company.com', 'r.chen@company.com', 'c.patel@company.com', 'm.nguyen@company.com', 't.garcia@company.com']
  const statuses = ['Investigating', 'Confirmed', 'Dismissed']

  const anomalies = []
  for (let i = 0; i < 22; i++) {
    const hoursAgo = (i * 4) % 96
    anomalies.push({
      id: i + 1,
      detectedAt: hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
      type: types[i % types.length],
      entity: entities[i % entities.length],
      riskScore: 40 + ((i * 7) % 60),
      status: statuses[i % statuses.length],
    })
  }

  return {
    stats: {
      detectedToday: { value: '9', trend: { direction: 'up', label: '2 vs yesterday', isGood: false } },
      detectionRate: { value: '94%', trend: { direction: 'up', label: '1pt vs last week', isGood: true } },
      avgRiskScore: { value: '58', trend: { direction: 'down', label: '4pts vs last week', isGood: true } },
      autoResolved: { value: '12', trend: { direction: 'flat', label: 'This week' } },
    },
    timeline: [
      { label: 'Mon', value: 5 },
      { label: 'Tue', value: 8 },
      { label: 'Wed', value: 4 },
      { label: 'Thu', value: 9 },
      { label: 'Fri', value: 6 },
      { label: 'Sat', value: 2 },
      { label: 'Sun', value: 3 },
    ],
    anomalies,
  }
}
