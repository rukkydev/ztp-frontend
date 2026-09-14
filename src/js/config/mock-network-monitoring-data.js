/**
 * Placeholder data for Network Monitoring. Sample data only — swap
 * `getNetworkMonitoringData()` for a real API call once the endpoint
 * exists.
 */
export function getNetworkMonitoringData() {
  return {
    stats: {
      uptime: { value: '99.98%', trend: { direction: 'flat', label: 'Last 30 days' } },
      throughputIn: { value: '842 Mbps', trend: { direction: 'up', label: '6% vs yesterday', isGood: true } },
      throughputOut: { value: '318 Mbps', trend: { direction: 'up', label: '3% vs yesterday', isGood: true } },
      latency: { value: '24 ms', trend: { direction: 'down', label: '2ms vs yesterday', isGood: true } },
    },
    trafficTimeline: [
      { label: 'Mon', value: 620 },
      { label: 'Tue', value: 710 },
      { label: 'Wed', value: 680 },
      { label: 'Thu', value: 790 },
      { label: 'Fri', value: 842 },
      { label: 'Sat', value: 410 },
      { label: 'Sun', value: 380 },
    ],
    endpoints: [
      { name: 'Primary Firewall', iconName: 'shield-check', location: 'Port Harcourt DC', status: 'Up', latency: '3 ms', lastChecked: 'Just now' },
      { name: 'VPN Gateway', iconName: 'lock-closed', location: 'Lagos DC', status: 'Up', latency: '18 ms', lastChecked: '1 minute ago' },
      { name: 'Load Balancer 01', iconName: 'server-stack', location: 'Port Harcourt DC', status: 'Up', latency: '5 ms', lastChecked: 'Just now' },
      { name: 'Load Balancer 02', iconName: 'server-stack', location: 'Abuja DC', status: 'Degraded', latency: '142 ms', lastChecked: '2 minutes ago' },
      { name: 'Backup Link', iconName: 'globe-alt', location: 'Remote', status: 'Down', latency: '—', lastChecked: '5 minutes ago' },
    ],
  }
}
