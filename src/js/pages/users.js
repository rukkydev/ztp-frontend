import '../../styles/main.css'

import $ from '../core/dom.js'
import { icon, registerIconPlugin } from '../utils/icons.js'
import { NAV_GROUPS } from '../config/navigation.js'
import { getUsers } from '../config/mock-users-data.js'
import { appShellHTML, pageHeaderHTML } from '../components/page.js'
import { initSidebar } from '../components/sidebar.js'
import { initDropdowns } from '../components/dropdown.js'
import { initModals, confirmDialog } from '../components/modal.js'
import { showToast } from '../components/toast.js'
import { buttonHTML } from '../components/button.js'
import { badgeHTML } from '../components/badge.js'
import { createDataTable } from '../components/data-table.js'

const ROLE_TONE = { Admin: 'primary', 'Security Analyst': 'primary', Auditor: 'neutral', 'Standard User': 'neutral' }
const STATUS_TONE = { Active: 'success', Invited: 'warning', Suspended: 'critical' }

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: NAV_GROUPS, currentPage: 'users', pageTitle: 'Users' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountUsersTable() {
  const editIcon = await icon('pencil-square', { className: 'w-4 h-4' })
  const suspendIcon = await icon('no-symbol', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['ZTP', 'Users'],
    title: 'Users',
    description: 'Everyone with access to ZTP, their role, and their current status.',
    actionsHTML: buttonHTML({ variant: 'primary', label: 'Add user' }),
  })

  $('#page-content').html(`${header}<div id="users-table"></div>`)

  const table = await createDataTable({
    container: '#users-table',
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'role', label: 'Role', sortable: true, render: (row) => badgeHTML({ label: row.role, tone: ROLE_TONE[row.role] }) },
      { key: 'status', label: 'Status', sortable: true, render: (row) => badgeHTML({ label: row.status, tone: STATUS_TONE[row.status] }) },
      { key: 'lastActive', label: 'Last Active', sortable: true },
    ],
    data: getUsers(),
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['name', 'email'],
    filters: [
      { key: 'role', label: 'Role', options: ['Admin', 'Security Analyst', 'Auditor', 'Standard User'] },
      { key: 'status', label: 'Status', options: ['Active', 'Invited', 'Suspended'] },
    ],
    bulkActions: [
      {
        label: 'Suspend selected',
        tone: 'danger',
        onClick: async (rows) => {
          const ok = await confirmDialog({
            title: `Suspend ${rows.length} user${rows.length === 1 ? '' : 's'}?`,
            message: 'They will immediately lose access to ZTP until reinstated.',
            confirmLabel: 'Suspend',
            tone: 'danger',
          })
          if (ok) showToast({ level: 'critical', title: `${rows.length} user${rows.length === 1 ? '' : 's'} suspended` })
        },
      },
    ],
    rowActionsHTML: () => `
      <button type="button" class="js-row-edit flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">${editIcon} Edit</button>
      <button type="button" class="js-row-suspend flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50">${suspendIcon} Suspend</button>
    `,
    emptyState: { title: 'No users match your search', message: 'Try a different search term or clear your filters.' },
  })

  // Row actions are illustrative — no backend wired up yet.
  $('#users-table').on('click', '.js-row-suspend', async function () {
    const ok = await confirmDialog({
      title: 'Suspend this user?',
      message: 'They will immediately lose access to ZTP until reinstated.',
      confirmLabel: 'Suspend',
      tone: 'danger',
    })
    if (ok) showToast({ level: 'critical', title: 'User suspended' })
  })
  $('#users-table').on('click', '.js-row-edit', function () {
    showToast({ level: 'info', title: 'Edit user', message: 'This opens an edit form once that flow is built.' })
  })
}

$(async function () {
  await mountShell()
  await mountUsersTable()
})
