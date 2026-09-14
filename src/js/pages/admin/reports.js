import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getReports } from '../../config/mock-reports-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, modalHTML, openModal, closeModal } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { badgeHTML } from '../../components/badge.js'
import { buttonHTML } from '../../components/button.js'
import { createDataTable } from '../../components/data-table.js'
import { setSubmitting } from '../../components/form-field.js'
import { API_BASE_URL, apiGet, apiPost, ApiError } from '../../core/api-client.js'

const TYPE_TONE = { Compliance: 'primary', Security: 'critical', Usage: 'neutral' }
const STATUS_TONE = { Ready: 'success', Processing: 'warning', Failed: 'critical' }

registerIconPlugin($)

function formatReportDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'reports', pageTitle: 'Reports' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function downloadReport(reportId, reportName, format) {
  try {
    showToast({ level: 'info', title: `Downloading ${reportName}…` })
    const res = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/download`, {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`)
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    const ext = format ? String(format).toLowerCase() : 'file'
    const safeName = reportName.replace(/[^a-z0-9]/gi, '_')
    a.download = safeName.endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    showToast({ level: 'success', title: 'Download complete', message: reportName })
  } catch (err) {
    showToast({ level: 'critical', title: 'Download failed', message: err.message || 'Could not download report file.' })
  }
}

async function mountReportsTable() {
  const downloadIcon = await icon('arrow-down-tray', { className: 'w-4 h-4' })
  const spinnerIcon = await icon('arrow-path', { className: 'w-4 h-4 animate-spin text-warning-600' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Reports'],
    title: 'Reports',
    description: 'Generated compliance, security, and usage reports.',
    actionsHTML: buttonHTML({ variant: 'primary', label: 'Generate report', attrs: { id: 'generate-report-btn' } }),
  })

  const modalBodyHTML = `
    <form id="generate-report-form" novalidate>
      <div class="mb-4">
        <label for="report-category" class="mb-1 block text-xs font-medium text-neutral-700">Report Category</label>
        <select id="report-category" class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
          <option value="USERS">Users Export (Accounts, roles, status)</option>
          <option value="AUDIT_LOGS" selected>Audit Logs (Activity & security history)</option>
          <option value="THREATS">Security Threats (Threat mitigations & logs)</option>
          <option value="ALERTS">Security Alerts (Auto-generated security alerts)</option>
          <option value="EXECUTIVE_SUMMARY">Executive Security Summary (Metrics & counts)</option>
        </select>
      </div>

      <div class="mb-4">
        <label for="report-type" class="mb-1 block text-xs font-medium text-neutral-700">Type Classification</label>
        <select id="report-type" class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
          <option value="Security">Security</option>
          <option value="Compliance">Compliance</option>
          <option value="Usage">Usage</option>
        </select>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-xs font-medium text-neutral-700">File Format</label>
        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input type="radio" name="reportFormat" value="CSV" checked class="accent-[var(--color-primary-600)]" />
            CSV (Spreadsheet)
          </label>
          <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input type="radio" name="reportFormat" value="PDF" class="accent-[var(--color-primary-600)]" />
            PDF (Document Summary)
          </label>
        </div>
      </div>
    </form>
  `

  const modalFooterHTML = `
    ${buttonHTML({ variant: 'ghost', label: 'Cancel', attrs: { id: 'close-generate-modal-btn' } })}
    ${buttonHTML({ variant: 'primary', label: 'Generate', type: 'submit', attrs: { id: 'submit-generate-report-btn', form: 'generate-report-form' } })}
  `

  const generateModalHTML = modalHTML({
    id: 'generate-report-modal',
    title: 'Generate New Report',
    bodyHTML: modalBodyHTML,
    footerHTML: modalFooterHTML,
    size: 'md',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample report records.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="reports-table"></div>${generateModalHTML}`)

  let reports = []
  let pollTimer = null

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const startPolling = () => {
    if (pollTimer) return
    pollTimer = setInterval(async () => {
      try {
        const res = await apiGet('/admin/reports')
        const liveData = res && res.data ? res.data : Array.isArray(res) ? res : null
        if (Array.isArray(liveData)) {
          reports = liveData
          $('#offline-banner').addClass('hidden')
          table.setData(reports)
          const isStillProcessing = reports.some((r) => r.status === 'Processing')
          if (!isStillProcessing) {
            stopPolling()
          }
        }
      } catch {
        // ignore background poll errors
      }
    }, 3000)
  }

  const refreshReports = async () => {
    try {
      table.setLoading(true)
      const res = await apiGet('/admin/reports')
      const liveData = res && res.data ? res.data : Array.isArray(res) ? res : null
      if (Array.isArray(liveData)) {
        reports = liveData
        $('#offline-banner').addClass('hidden')
      } else {
        reports = getReports()
        $('#offline-banner').removeClass('hidden')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast({ level: 'critical', title: 'Access denied', message: 'You do not have permission to view reports.' })
      }
      reports = getReports()
      $('#offline-banner').removeClass('hidden')
    } finally {
      table.setLoading(false)
      table.setData(reports)
      if (reports.some((r) => r.status === 'Processing')) {
        startPolling()
      } else {
        stopPolling()
      }
    }
  }

  const table = await createDataTable({
    container: '#reports-table',
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'type', label: 'Type', sortable: true, render: (row) => badgeHTML({ label: row.type || 'Security', tone: TYPE_TONE[row.type] || 'neutral' }) },
      { key: 'format', label: 'Format', sortable: true, render: (row) => badgeHTML({ label: row.format || 'CSV', tone: row.format === 'PDF' ? 'warning' : 'neutral' }) },
      { key: 'generatedAt', label: 'Generated', sortable: true, render: (row) => formatReportDate(row.generatedAt) },
      { key: 'generatedBy', label: 'Generated By', sortable: true, render: (row) => escapeHTML(row.generatedBy || '—') },
      { key: 'status', label: 'Status', sortable: true, render: (row) => badgeHTML({ label: row.status || 'Processing', tone: STATUS_TONE[row.status] || 'warning' }) },
      { key: 'fileSize', label: 'Size', sortable: false, render: (row) => escapeHTML(row.fileSize || '—') },
    ],
    data: reports,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['name', 'generatedBy', 'type', 'format'],
    filters: [
      { key: 'type', label: 'Type', options: ['Security', 'Compliance', 'Usage'] },
      { key: 'format', label: 'Format', options: ['CSV', 'PDF'] },
      { key: 'status', label: 'Status', options: ['Ready', 'Processing', 'Failed'] },
    ],
    rowActionsHTML: (row) => {
      if (row.status === 'Ready') {
        return `<button type="button" class="js-row-download flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary-600 hover:bg-primary-50" data-report-id="${row.id}" data-report-name="${escapeHTML(row.name)}" data-report-format="${row.format}">${downloadIcon} Download</button>`
      }
      if (row.status === 'Processing') {
        return `<span class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-warning-600">${spinnerIcon} Processing…</span>`
      }
      return `<span class="block px-3 py-2 text-sm font-medium text-critical-600">Failed</span>`
    },
    emptyState: { title: 'No reports match your search' },
  })

  $('#reports-table').on('click', '.js-row-download', function () {
    const reportId = $(this).data('report-id')
    const reportName = $(this).data('report-name')
    const format = $(this).data('report-format')
    downloadReport(reportId, reportName, format)
  })

  $('#generate-report-btn').on('click', () => {
    openModal('generate-report-modal')
  })

  $('#close-generate-modal-btn').on('click', () => {
    closeModal('generate-report-modal')
  })

  $('#generate-report-form').on('submit', async function (e) {
    e.preventDefault()
    const category = $('#report-category').val()
    const type = $('#report-type').val()
    const format = $('input[name="reportFormat"]:checked').val()

    const restore = setSubmitting($('#submit-generate-report-btn'), 'Generating…')

    try {
      const res = await apiPost('/admin/reports', { category, type, format })
      const newReport = res && res.data ? res.data : res
      showToast({ level: 'info', title: 'Report generation started', message: newReport.name || 'Your report is now processing.' })
      closeModal('generate-report-modal')
      await refreshReports()
    } catch (err) {
      restore()
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not generate report.'
      showToast({ level: 'critical', title: 'Generation failed', message: msg })
    }
  })

  // Initial fetch
  await refreshReports()
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountReportsTable()
})
