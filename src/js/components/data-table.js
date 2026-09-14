import $ from '../core/dom.js'
import { icon } from '../utils/icons.js'
import { searchBarHTML } from './search-bar.js'
import { escapeHTML } from '../utils/sanitize.js'

function formatShortDate(isoDateString) {
  const date = new Date(`${isoDateString}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * A fully client-side data table. Renders once into `container`, then
 * re-renders just the body/footer as the person searches, sorts,
 * filters, paginates, or selects rows.
 *
 * @param {object} opts
 * @param {string|HTMLElement} opts.container
 * @param {Array<{key: string, label: string, sortable?: boolean, render?: (row: object) => string}>} opts.columns  columns without a `render` are HTML-escaped automatically; a custom `render` is responsible for escaping any raw row data it interpolates itself (see utils/sanitize.js)
 * @param {object[]} opts.data              full client-side dataset
 * @param {string} [opts.rowKey='id']
 * @param {number} [opts.pageSize=8]
 * @param {string[]} [opts.searchableKeys]  defaults to all column keys
 * @param {Array<{key: string, label: string, options?: string[], type?: 'select'|'dateRange'}>} [opts.filters]  `type` defaults to 'select'; use 'dateRange' for a from/to date picker instead of an options list (the filtered field must hold a real date/ISO string)
 * @param {Array<{label: string, tone?: string, onClick: (rows: object[]) => void}>} [opts.bulkActions]
 * @param {(row: object) => string} [opts.rowActionsHTML]  optional per-row actions menu content
 * @param {{title: string, message?: string}} [opts.emptyState]
 * @returns {{ setData: (rows: object[]) => void, setLoading: (isLoading: boolean) => void }}
 */
export async function createDataTable({
  container,
  columns,
  data,
  rowKey = 'id',
  pageSize = 8,
  searchableKeys,
  filters = [],
  bulkActions = [],
  rowActionsHTML,
  emptyState = { title: 'Nothing here yet' },
}) {
  const $container = $(container)
  const searchKeys = searchableKeys || columns.map((c) => c.key)

  const state = {
    allRows: data,
    search: '',
    activeFilters: {}, // { [filterKey]: optionValue | null }
    sortKey: null,
    sortDir: 'asc',
    page: 1,
    selected: new Set(),
    loading: false,
  }

  const sortIconNeutral = await icon('chevron-up-down', { className: 'w-3.5 h-3.5 text-neutral-300' })
  const sortIconAsc = await icon('chevron-up', { className: 'w-3.5 h-3.5 text-primary-600' })
  const sortIconDesc = await icon('chevron-down', { className: 'w-3.5 h-3.5 text-primary-600' })
  const funnelIcon = await icon('funnel', { className: 'w-4 h-4' })
  const inboxIcon = await icon('inbox', { className: 'w-8 h-8 text-neutral-300' })
  const chevronLeft = await icon('chevron-left', { className: 'w-4 h-4' })
  const chevronRight = await icon('chevron-right', { className: 'w-4 h-4' })
  const ellipsisIcon = await icon('ellipsis-vertical', { className: 'w-4 h-4' })

  // ---------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------
  function getFilteredSortedRows() {
    let rows = state.allRows

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase()
      rows = rows.filter((row) => searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q)))
    }

    Object.entries(state.activeFilters).forEach(([key, value]) => {
      if (!value) return
      const filterConfig = filters.find((f) => f.key === key)

      if (filterConfig?.type === 'dateRange') {
        const { from, to } = value
        rows = rows.filter((row) => {
          const rowDate = new Date(row[key])
          if (from && rowDate < new Date(from)) return false
          if (to && rowDate > new Date(`${to}T23:59:59`)) return false
          return true
        })
      } else {
        rows = rows.filter((row) => String(row[key]) === String(value))
      }
    })

    if (state.sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[state.sortKey]
        const bv = b[state.sortKey]
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return state.sortDir === 'asc' ? cmp : -cmp
      })
    }

    return rows
  }

  // ---------------------------------------------------------------
  // Markup — static shell (rendered once)
  // ---------------------------------------------------------------
  async function shellHTML() {
    const search = await searchBarHTML({ id: 'table-search', placeholder: 'Search…' })

    const filterButtons = filters
      .map((filter) =>
        filter.type === 'dateRange'
          ? `
      <div class="js-dropdown relative">
        <button type="button" class="js-dropdown-trigger js-filter-trigger flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50" data-filter-key="${filter.key}">
          ${funnelIcon}<span class="js-filter-label">${filter.label}: All</span>
        </button>
        <div class="js-dropdown-panel js-daterange-panel hidden absolute left-0 z-10 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-[var(--shadow-overlay)]" data-filter-key="${filter.key}">
          <label class="mb-1 block text-xs font-medium text-neutral-500">From</label>
          <input type="date" class="js-daterange-from mb-2 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
          <label class="mb-1 block text-xs font-medium text-neutral-500">To</label>
          <input type="date" class="js-daterange-to mb-3 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
          <div class="flex items-center gap-2">
            <button type="button" class="js-daterange-apply flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700" data-filter-key="${filter.key}">Apply</button>
            <button type="button" class="js-daterange-clear rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50" data-filter-key="${filter.key}">Clear</button>
          </div>
        </div>
      </div>`
          : `
      <div class="js-dropdown relative">
        <button type="button" class="js-dropdown-trigger js-filter-trigger flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50" data-filter-key="${filter.key}">
          ${funnelIcon}<span class="js-filter-label">${filter.label}: All</span>
        </button>
        <div class="js-dropdown-panel hidden absolute left-0 z-10 mt-2 w-44 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-[var(--shadow-overlay)]">
          <button type="button" class="js-filter-option block w-full rounded-lg px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-filter-key="${filter.key}" data-filter-value="">All</button>
          ${filter.options
            .map(
              (opt) =>
                `<button type="button" class="js-filter-option block w-full rounded-lg px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-filter-key="${filter.key}" data-filter-value="${opt}">${opt}</button>`
            )
            .join('')}
        </div>
      </div>`
      )
      .join('')

    const bulkButtons = bulkActions
      .map(
        (action, i) => `
        <button type="button" class="js-bulk-action rounded-lg border px-3 py-1.5 text-sm font-medium
          ${action.tone === 'danger' ? 'border-critical-500/30 text-critical-600 hover:bg-critical-50' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}"
          data-action-index="${i}">${action.label}</button>`
      )
      .join('')

    const headCells = columns
      .map(
        (col) => `
      <th class="px-4 py-3 ${col.sortable ? 'js-sort-col cursor-pointer select-none' : ''}" data-key="${col.key}">
        <span class="flex items-center gap-1">${col.label}${col.sortable ? `<span class="js-sort-icon">${sortIconNeutral}</span>` : ''}</span>
      </th>`
      )
      .join('')

    return `
    <div class="rounded-lg border border-neutral-200 bg-white shadow-[var(--shadow-subtle)]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-4">
        <div class="flex flex-wrap items-center gap-2">${search}${filterButtons}</div>
        <div class="js-bulk-bar hidden items-center gap-2">
          <span class="js-bulk-count text-sm text-neutral-500"></span>
          ${bulkButtons}
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <th class="w-10 px-4 py-3"><input type="checkbox" class="js-select-all rounded border-neutral-300 accent-[var(--color-primary-600)]" /></th>
              ${headCells}
              ${rowActionsHTML ? '<th class="w-10 px-4 py-3"></th>' : ''}
            </tr>
          </thead>
          <tbody class="js-table-body divide-y divide-neutral-100"></tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500">
        <span class="js-page-info"></span>
        <div class="js-pagination flex items-center gap-1"></div>
      </div>
    </div>`
  }

  function loadingRowsHTML() {
    const colSpan = columns.length + 1 + (rowActionsHTML ? 1 : 0)
    return Array.from({ length: 5 })
      .map(
        () => `
      <tr>
        <td class="px-4 py-3" colspan="${colSpan}">
          <div class="h-4 w-full max-w-sm animate-pulse rounded bg-neutral-100"></div>
        </td>
      </tr>`
      )
      .join('')
  }

  function emptyRowHTML() {
    const colSpan = columns.length + 1 + (rowActionsHTML ? 1 : 0)
    return `
    <tr>
      <td class="px-4 py-12 text-center" colspan="${colSpan}">
        <div class="flex flex-col items-center gap-2">
          ${inboxIcon}
          <p class="font-medium text-neutral-700">${emptyState.title}</p>
          ${emptyState.message ? `<p class="text-sm text-neutral-400">${emptyState.message}</p>` : ''}
        </div>
      </td>
    </tr>`
  }

  function rowHTML(row) {
    const isSelected = state.selected.has(row[rowKey])
    const cells = columns.map((col) => `<td class="px-4 py-3 text-neutral-700">${col.render ? col.render(row) : escapeHTML(row[col.key])}</td>`).join('')

    return `
    <tr class="js-table-row ${isSelected ? 'bg-primary-50/40' : ''}" data-row-key="${row[rowKey]}">
      <td class="px-4 py-3"><input type="checkbox" class="js-row-select rounded border-neutral-300 accent-[var(--color-primary-600)]" ${isSelected ? 'checked' : ''} /></td>
      ${cells}
      ${
        rowActionsHTML
          ? `<td class="px-4 py-3 text-right">
              <div class="js-dropdown relative inline-block">
                <button type="button" class="js-dropdown-trigger rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100" aria-label="Row actions">${ellipsisIcon}</button>
                <div class="js-dropdown-panel hidden absolute right-0 z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-[var(--shadow-overlay)]">
                  ${rowActionsHTML(row)}
                </div>
              </div>
            </td>`
          : ''
      }
    </tr>`
  }

  // ---------------------------------------------------------------
  // Render body + footer (called on every state change)
  // ---------------------------------------------------------------
  function render() {
    const $body = $container.find('.js-table-body')

    if (state.loading) {
      $body.html(loadingRowsHTML())
      $container.find('.js-page-info').text('')
      $container.find('.js-pagination').empty()
      return
    }

    const filtered = getFilteredSortedRows()
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    state.page = Math.min(state.page, totalPages)
    const start = (state.page - 1) * pageSize
    const pageRows = filtered.slice(start, start + pageSize)

    $body.html(filtered.length ? pageRows.map(rowHTML).join('') : emptyRowHTML())

    const from = filtered.length ? start + 1 : 0
    const to = Math.min(start + pageSize, filtered.length)
    $container.find('.js-page-info').text(`Showing ${from}–${to} of ${filtered.length}`)

    $container.find('.js-pagination').html(`
      <button type="button" class="js-page-prev rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none" ${state.page <= 1 ? 'disabled' : ''}>${chevronLeft}</button>
      <span class="px-2 text-neutral-500">Page ${state.page} of ${totalPages}</span>
      <button type="button" class="js-page-next rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none" ${state.page >= totalPages ? 'disabled' : ''}>${chevronRight}</button>
    `)

    const $selectAll = $container.find('.js-select-all')
    const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => state.selected.has(r[rowKey]))
    $selectAll.prop('checked', allOnPageSelected)

    updateBulkBar()
  }

  function updateBulkBar() {
    const $bar = $container.find('.js-bulk-bar')
    if (state.selected.size > 0) {
      $bar.removeClass('hidden').addClass('flex')
      $container.find('.js-bulk-count').text(`${state.selected.size} selected`)
    } else {
      $bar.addClass('hidden').removeClass('flex')
    }
  }

  // ---------------------------------------------------------------
  // Event wiring (bound once — reads current state at call time)
  // ---------------------------------------------------------------
  function wireEvents() {
    let searchTimer
    $container.find('#table-search').on('input', function () {
      clearTimeout(searchTimer)
      const value = $(this).val()
      searchTimer = setTimeout(() => {
        state.search = value
        state.page = 1
        render()
      }, 200)
    })

    $container.on('click', '.js-sort-col', function () {
      const key = $(this).data('key')
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        state.sortKey = key
        state.sortDir = 'asc'
      }
      $container.find('.js-sort-icon').html(sortIconNeutral)
      $(this)
        .find('.js-sort-icon')
        .html(state.sortDir === 'asc' ? sortIconAsc : sortIconDesc)
      render()
    })

    $container.on('click', '.js-filter-option', function () {
      const key = $(this).data('filter-key')
      const value = $(this).data('filter-value') || null
      state.activeFilters[key] = value
      state.page = 1

      const filterConfig = filters.find((f) => f.key === key)
      $container.find(`.js-filter-trigger[data-filter-key="${key}"] .js-filter-label`).text(`${filterConfig.label}: ${value || 'All'}`)
      render()
    })

    $container.on('click', '.js-daterange-panel', function (e) {
      e.stopPropagation()
    })

    $container.on('click', '.js-daterange-apply', function () {
      const key = $(this).data('filter-key')
      const $panel = $(this).closest('.js-daterange-panel')
      const from = $panel.find('.js-daterange-from').val()
      const to = $panel.find('.js-daterange-to').val()

      state.activeFilters[key] = from || to ? { from, to } : null
      state.page = 1

      const filterConfig = filters.find((f) => f.key === key)
      const label =
        from || to
          ? `${filterConfig.label}: ${from ? formatShortDate(from) : 'Any'}–${to ? formatShortDate(to) : 'Any'}`
          : `${filterConfig.label}: All`
      $container.find(`.js-filter-trigger[data-filter-key="${key}"] .js-filter-label`).text(label)

      $panel.addClass('hidden')
      render()
    })

    $container.on('click', '.js-daterange-clear', function () {
      const key = $(this).data('filter-key')
      const $panel = $(this).closest('.js-daterange-panel')
      $panel.find('.js-daterange-from, .js-daterange-to').val('')

      state.activeFilters[key] = null
      state.page = 1

      const filterConfig = filters.find((f) => f.key === key)
      $container.find(`.js-filter-trigger[data-filter-key="${key}"] .js-filter-label`).text(`${filterConfig.label}: All`)

      $panel.addClass('hidden')
      render()
    })

    $container.on('click', '.js-page-prev', () => {
      state.page -= 1
      render()
    })
    $container.on('click', '.js-page-next', () => {
      state.page += 1
      render()
    })

    $container.on('change', '.js-select-all', function () {
      const checked = $(this).prop('checked')
      const filtered = getFilteredSortedRows()
      const start = (state.page - 1) * pageSize
      const pageRows = filtered.slice(start, start + pageSize)
      pageRows.forEach((row) => (checked ? state.selected.add(row[rowKey]) : state.selected.delete(row[rowKey])))
      render()
    })

    $container.on('change', '.js-row-select', function () {
      const key = $(this).closest('.js-table-row').data('row-key')
      if ($(this).prop('checked')) state.selected.add(key)
      else state.selected.delete(key)
      render()
    })

    $container.on('click', '.js-bulk-action', function () {
      const action = bulkActions[$(this).data('action-index')]
      const selectedRows = state.allRows.filter((row) => state.selected.has(row[rowKey]))
      action.onClick(selectedRows)
      state.selected.clear()
      render()
    })
  }

  $container.html(await shellHTML())
  wireEvents()
  render()

  return {
    setData(rows) {
      state.allRows = rows
      state.selected.clear()
      render()
    },
    setLoading(isLoading) {
      state.loading = isLoading
      render()
    },
  }
}
