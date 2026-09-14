/**
 * Minimal SVG bar chart for a week's worth of detection counts.
 * No charting library — Tailwind/jQuery/Heroicons is the whole stack,
 * and a handful of <rect> elements is all this needs.
 *
 * @param {object} opts
 * @param {string} [opts.title='Detection Timeline']
 * @param {Array<{label: string, value: number}>} opts.data
 */
export function timelineChartHTML({ title = 'Detection Timeline', data }) {
  const width = 560
  const height = 160
  const paddingBottom = 24
  const paddingTop = 16
  const chartHeight = height - paddingBottom - paddingTop
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const barSlot = width / data.length
  const barWidth = Math.min(32, barSlot * 0.5)

  const bars = data
    .map((d, i) => {
      const barHeight = (d.value / maxValue) * chartHeight
      const x = i * barSlot + (barSlot - barWidth) / 2
      const y = paddingTop + (chartHeight - barHeight)
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" class="fill-primary-600/80" />
        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" class="fill-neutral-400" style="font-size: 10px">${d.value}</text>
        <text x="${x + barWidth / 2}" y="${height - 6}" text-anchor="middle" class="fill-neutral-400" style="font-size: 10px">${d.label}</text>
      `
    })
    .join('')

  return `
  <div class="rounded-lg border border-neutral-200 bg-white p-5 shadow-[var(--shadow-subtle)]">
    <h3 class="mb-4 text-sm font-semibold text-neutral-900">${title}</h3>
    <svg viewBox="0 0 ${width} ${height}" class="w-full" role="img" aria-label="${title}, bar chart by day">
      <line x1="0" y1="${paddingTop + chartHeight}" x2="${width}" y2="${paddingTop + chartHeight}" class="stroke-neutral-200" stroke-width="1" />
      ${bars}
    </svg>
  </div>`
}
