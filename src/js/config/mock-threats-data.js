/**
 * Placeholder data for the Threats table. Sample data only — swap
 * `getThreats()` for a real API call once the endpoint exists.
 */
export function getThreats() {
  const types = ['Credential Stuffing', 'Brute Force Attempt', 'Malware Signature', 'Phishing Link Clicked', 'Privilege Escalation Attempt', 'Data Exfiltration Attempt']
  const assets = ['MacBook Pro (J. Blake)', 'Windows Laptop (M. Nguyen)', 'API Gateway', 'Auth Service', 'iPhone 15 (R. Chen)', 'File Server 02']
  const severities = ['Critical', 'High', 'Medium', 'Low']

  const threats = []
  for (let i = 0; i < 24; i++) {
    const hoursAgo = (i * 5) % 96
    threats.push({
      id: i + 1,
      threatType: types[i % types.length],
      severity: severities[i % severities.length],
      affected: assets[i % assets.length],
      detectedAt: hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`,
      status: i % 3 === 0 ? 'Mitigated' : 'Active',
    })
  }
  return threats
}
