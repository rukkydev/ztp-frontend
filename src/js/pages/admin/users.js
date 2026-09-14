import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, openModal, closeModal, modalHTML, confirmDialog } from '../../components/modal.js'
import { showToast } from '../../components/toast.js'
import { buttonHTML } from '../../components/button.js'
import { badgeHTML } from '../../components/badge.js'
import { textFieldHTML, setSubmitting } from '../../components/form-field.js'
import { passwordFieldHTML, initPasswordToggles } from '../../components/password-field.js'
import { createDataTable } from '../../components/data-table.js'
import { apiGet, apiPost, apiPatch, ApiError } from '../../core/api-client.js'

const ROLE_TONE = { SUPER_ADMIN: 'primary', SECURITY_NETWORK_ADMIN: 'primary', USER: 'neutral', Admin: 'primary', 'Security Analyst': 'primary', Auditor: 'neutral', 'Standard User': 'neutral' }
const STATUS_TONE = { Active: 'success', Invited: 'warning', Suspended: 'critical', Locked: 'warning' }

registerIconPlugin($)

async function mountShell() {
  const shell = await appShellHTML({ navGroups: ADMIN_NAV_GROUPS, currentPage: 'users', pageTitle: 'Users' })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountUserModals(onSave) {
  const addModalHTML = modalHTML({
    id: 'add-user-modal',
    title: 'Add New User',
    bodyHTML: `
      <form id="add-user-form" class="flex flex-col gap-4">
        ${textFieldHTML({ id: 'add-username', label: 'Username', placeholder: 'jdoe' })}
        ${textFieldHTML({ id: 'add-email', label: 'Email', type: 'email', placeholder: 'jdoe@example.com' })}
        ${passwordFieldHTML({ id: 'add-password', label: 'Password', autocomplete: 'new-password' })}
        <div>
          <label class="mb-1 block text-sm font-medium text-neutral-700">Role</label>
          <select id="add-role" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white">
            <option value="USER">USER (Standard User)</option>
            <option value="SECURITY_NETWORK_ADMIN">SECURITY_NETWORK_ADMIN (Security Analyst)</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (Admin)</option>
          </select>
        </div>
      </form>
    `,
    footerHTML: `
      <div class="flex justify-end gap-2">
        ${buttonHTML({ variant: 'ghost', label: 'Cancel', className: 'js-modal-close' })}
        ${buttonHTML({ variant: 'primary', label: 'Create User', attrs: { id: 'submit-add-user', form: 'add-user-form' }, type: 'submit' })}
      </div>
    `,
  })

  const editModalHTML = modalHTML({
    id: 'edit-user-modal',
    title: 'Edit User',
    bodyHTML: `
      <form id="edit-user-form" class="flex flex-col gap-4">
        <input type="hidden" id="edit-user-id" />
        ${textFieldHTML({ id: 'edit-username', label: 'Username' })}
        ${textFieldHTML({ id: 'edit-email', label: 'Email', type: 'email' })}
        ${textFieldHTML({ id: 'edit-phone', label: 'Phone', required: false })}
        ${textFieldHTML({ id: 'edit-jobTitle', label: 'Job Title', required: false })}
        ${textFieldHTML({ id: 'edit-department', label: 'Department', required: false })}
        <div>
          <label class="mb-1 block text-sm font-medium text-neutral-700">Role</label>
          <select id="edit-role" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white">
            <option value="USER">USER (Standard User)</option>
            <option value="SECURITY_NETWORK_ADMIN">SECURITY_NETWORK_ADMIN (Security Analyst)</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (Admin)</option>
          </select>
        </div>
      </form>
    `,
    footerHTML: `
      <div class="flex justify-end gap-2">
        ${buttonHTML({ variant: 'ghost', label: 'Cancel', className: 'js-modal-close' })}
        ${buttonHTML({ variant: 'primary', label: 'Save Changes', attrs: { id: 'submit-edit-user', form: 'edit-user-form' }, type: 'submit' })}
      </div>
    `,
  })

  $('#page-content').append(addModalHTML).append(editModalHTML)
  initPasswordToggles(document)

  $('#add-user-form').on('submit', async function (e) {
    e.preventDefault()
    const username = $('#add-username').val().trim()
    const email = $('#add-email').val().trim()
    const password = $('#add-password').val()
    const role = $('#add-role').val()

    if (!username || !email || !password) {
      showToast({ level: 'critical', title: 'Validation error', message: 'Please fill in all required fields.' })
      return
    }

    const restore = setSubmitting($('#submit-add-user'), 'Creating…')
    try {
      const res = await apiPost('/admin/users', { username, email, password, role })
      const newUser = res && res.data ? res.data : res
      showToast({ level: 'success', title: 'User created' })
      closeModal('add-user-modal')
      $('#add-user-form')[0].reset()
      onSave(newUser, 'create')
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not create user.'
      showToast({ level: 'critical', title: 'Creation failed', message: msg })
    } finally {
      restore()
    }
  })

  $('#edit-user-form').on('submit', async function (e) {
    e.preventDefault()
    const userId = $('#edit-user-id').val()
    const payload = {
      username: $('#edit-username').val().trim(),
      email: $('#edit-email').val().trim(),
      phone: $('#edit-phone').val().trim(),
      jobTitle: $('#edit-jobTitle').val().trim(),
      department: $('#edit-department').val().trim(),
      role: $('#edit-role').val(),
    }

    const restore = setSubmitting($('#submit-edit-user'), 'Saving…')
    try {
      const res = await apiPatch(`/admin/users/${userId}`, payload)
      const updatedUser = res && res.data ? res.data : { id: userId, ...payload }
      showToast({ level: 'success', title: 'User updated' })
      closeModal('edit-user-modal')
      onSave(updatedUser, 'edit')
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.message : 'Could not update user.'
      showToast({ level: 'critical', title: 'Update failed', message: msg })
    } finally {
      restore()
    }
  })
}

export function getUserStatus(user) {
  if (!user) return 'Active'
  if (user.enabled === false) return 'Suspended'
  if (user.accountLocked === true) return 'Locked'
  return user.status || 'Active'
}

async function mountUsersTable() {
  const editIcon = await icon('pencil-square', { className: 'w-4 h-4' })
  const suspendIcon = await icon('no-symbol', { className: 'w-4 h-4' })
  const activateIcon = await icon('check-circle', { className: 'w-4 h-4' })
  const unlockIcon = await icon('lock-open', { className: 'w-4 h-4' })

  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Users'],
    title: 'Users',
    description: 'Everyone with access to ZTP, their role, and their current status.',
    actionsHTML: buttonHTML({ variant: 'primary', label: 'Add user', attrs: { id: 'btn-add-user-modal' } }),
  })

  $('#page-content').html(`${header}<div id="users-table"></div>`)

  let users = []
  try {
    const response = await apiGet('/admin/users')
    const rawUsers = Array.isArray(response)
      ? response
      : Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response?.data?.content)
      ? response.data.content
      : Array.isArray(response?.data)
      ? response.data
      : []
    users = rawUsers.map((u) => ({
      ...u,
      status: getUserStatus(u),
    }))
  } catch (err) {
    showToast({ level: 'critical', title: 'Could not load users', message: 'Please refresh to try again.' })
  }

  function rowActionsFor(row) {
    const status = getUserStatus(row)
    if (status === 'Locked') {
      return `
        <button type="button" class="js-row-edit flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-user-id="${row.id}">${editIcon} Edit</button>
        <button type="button" class="js-row-unlock flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-user-id="${row.id}">${unlockIcon} Unlock</button>
        <button type="button" class="js-row-suspend flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-user-id="${row.id}">${suspendIcon} Suspend</button>
      `
    }
    if (status === 'Suspended') {
      return `
        <button type="button" class="js-row-edit flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-user-id="${row.id}">${editIcon} Edit</button>
        <button type="button" class="js-row-activate flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-success-600 hover:bg-success-50" data-user-id="${row.id}">${activateIcon} Activate</button>
      `
    }
    return `
      <button type="button" class="js-row-edit flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" data-user-id="${row.id}">${editIcon} Edit</button>
      <button type="button" class="js-row-suspend flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-critical-600 hover:bg-critical-50" data-user-id="${row.id}">${suspendIcon} Suspend</button>
    `
  }

  const table = await createDataTable({
    container: '#users-table',
    columns: [
      { key: 'username', label: 'Name / Username', sortable: true, render: (row) => row.name || row.username || 'User' },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'role', label: 'Role', sortable: true, render: (row) => badgeHTML({ label: row.role, tone: ROLE_TONE[row.role] || 'neutral' }) },
      { key: 'status', label: 'Status', sortable: true, render: (row) => {
          const status = getUserStatus(row)
          return badgeHTML({ label: status, tone: STATUS_TONE[status] || 'neutral' })
        }
      },
      { key: 'lastActive', label: 'Last Active', sortable: true, render: (row) => row.lastActive || (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—') },
    ],
    data: users,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['username', 'name', 'email'],
    filters: [
      { key: 'role', label: 'Role', options: ['SUPER_ADMIN', 'SECURITY_NETWORK_ADMIN', 'USER'] },
      { key: 'status', label: 'Status', options: ['Active', 'Invited', 'Suspended', 'Locked'] },
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
          if (!ok) return

          try {
            const ids = rows.map((r) => r.id)
            await apiPatch('/admin/users/bulk-suspend', { ids })
            const idSet = new Set(ids.map((id) => String(id)))
            users.forEach((u) => {
              if (idSet.has(String(u.id))) {
                u.enabled = false
                u.status = getUserStatus(u)
              }
            })
            table.setData(users)
            showToast({ level: 'critical', title: `${rows.length} user${rows.length === 1 ? '' : 's'} suspended` })
          } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Please try again.'
            showToast({ level: 'critical', title: 'Could not suspend users', message })
          }
        },
      },
    ],
    rowActionsHTML: rowActionsFor,
    emptyState: { title: 'No users match your search', message: 'Try a different search term or clear your filters.' },
  })

  await mountUserModals((data, action) => {
    if (action === 'create') {
      const newUser = {
        ...data,
        enabled: data.enabled !== undefined ? data.enabled : true,
        accountLocked: data.accountLocked || false,
      }
      newUser.status = getUserStatus(newUser)
      users.unshift(newUser)
    } else if (action === 'edit') {
      const idx = users.findIndex((u) => String(u.id) === String(data.id))
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...data }
        users[idx].status = getUserStatus(users[idx])
      }
    }
    table.setData(users)
  })

  $('#btn-add-user-modal').on('click', function () {
    openModal('add-user-modal')
  })

  $('#users-table').on('click', '.js-row-suspend', async function () {
    const userId = $(this).data('user-id')
    const ok = await confirmDialog({
      title: 'Suspend this user?',
      message: 'They will immediately lose access to ZTP until reinstated.',
      confirmLabel: 'Suspend',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await apiPatch(`/admin/users/${userId}`, { status: 'Suspended' })
      const user = users.find((u) => String(u.id) === String(userId))
      if (user) {
        user.enabled = false
        user.status = getUserStatus(user)
      }
      table.setData(users)
      showToast({ level: 'critical', title: 'User suspended' })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Please try again.'
      showToast({ level: 'critical', title: 'Could not suspend user', message })
    }
  })

  $('#users-table').on('click', '.js-row-activate, .js-row-unsuspend', async function () {
    const userId = $(this).data('user-id')
    const ok = await confirmDialog({
      title: 'Activate this user?',
      message: 'Their access to ZTP will be reinstated.',
      confirmLabel: 'Activate',
      tone: 'success',
    })
    if (!ok) return

    try {
      await apiPatch(`/admin/users/${userId}`, { status: 'Active' })
      const user = users.find((u) => String(u.id) === String(userId))
      if (user) {
        user.enabled = true
        user.status = getUserStatus(user)
      }
      table.setData(users)
      showToast({ level: 'success', title: 'User activated' })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Please try again.'
      showToast({ level: 'critical', title: 'Could not activate user', message })
    }
  })

  $('#users-table').on('click', '.js-row-unlock', async function () {
    const userId = $(this).data('user-id')
    try {
      await apiPatch(`/admin/users/${userId}/unlock`)
      const user = users.find((u) => String(u.id) === String(userId))
      if (user) {
        user.accountLocked = false
        user.status = getUserStatus(user)
      }
      table.setData(users)
      showToast({ level: 'success', title: 'User unlocked' })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Please try again.'
      showToast({ level: 'critical', title: 'Could not unlock user', message })
    }
  })

  $('#users-table').on('click', '.js-row-edit', async function () {
    const userId = $(this).data('user-id')
    let user = users.find((u) => String(u.id) === String(userId))
    try {
      const res = await apiGet(`/admin/users/${userId}`)
      if (res && res.data) user = res.data
    } catch (err) {
      // Fall back to row data if single fetch fails
    }

    if (user) {
      $('#edit-user-id').val(user.id)
      $('#edit-username').val(user.username || user.name || '')
      $('#edit-email').val(user.email || '')
      $('#edit-phone').val(user.phone || '')
      $('#edit-jobTitle').val(user.jobTitle || '')
      $('#edit-department').val(user.department || '')
      $('#edit-role').val(user.role || 'USER')
      openModal('edit-user-modal')
    }
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountUsersTable()
})
