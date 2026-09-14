import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { requireAuth } from '../../core/auth-guard.js'
import { ADMIN_ROLES } from '../../config/roles.js'
import { icon, registerIconPlugin } from '../../utils/icons.js'
import { escapeHTML } from '../../utils/sanitize.js'
import { ADMIN_NAV_GROUPS } from '../../config/admin-navigation.js'
import { getRoles } from '../../config/mock-roles-data.js'
import { appShellHTML, pageHeaderHTML } from '../../components/page.js'
import { initSidebar } from '../../components/sidebar.js'
import { initDropdowns } from '../../components/dropdown.js'
import { initModals, openModal, modalHTML } from '../../components/modal.js'
import { buttonHTML } from '../../components/button.js'
import { toggleSwitchHTML } from '../../components/toggle-switch.js'
import { createDataTable } from '../../components/data-table.js'
import { showToast } from '../../components/toast.js'
import { apiGet, apiPatch, ApiError } from '../../core/api-client.js'

registerIconPlugin($)

const KNOWN_SYSTEM_PERMISSIONS = [
  {
    id: 'Manage users',
    label: 'Manage users',
    description: 'Create, update profiles, suspend, and unlock user accounts.',
  },
  {
    id: 'View users (read-only)',
    label: 'View users (read-only)',
    description: 'Inspect the organization directory and user records without edit rights.',
  },
  {
    id: 'Manage roles & permissions',
    label: 'Manage roles & permissions',
    description: 'Modify role permission assignments and access controls.',
  },
  {
    id: 'View all activity logs',
    label: 'View all activity logs',
    description: 'Access the immutable system audit trail and user activity records.',
  },
  {
    id: 'Manage alerts & threats',
    label: 'Manage alerts & threats',
    description: 'Investigate, resolve security alerts, and execute threat mitigations.',
  },
  {
    id: 'View dashboards & reports',
    label: 'View dashboards & reports',
    description: 'Access telemetry overviews and download security/compliance reports.',
  },
  {
    id: 'Manage platform settings',
    label: 'Manage platform settings',
    description: 'Configure organization-wide security, timeouts, and system policies.',
  },
  {
    id: 'Manage own profile',
    label: 'Manage own profile',
    description: 'Update personal contact details, avatar photo, and 2FA credentials.',
  },
  {
    id: 'View own devices & sessions',
    label: 'View own devices & sessions',
    description: 'Inspect registered hardware devices and sign out active sessions.',
  },
]

let roles = []
let activeRole = null
let activeMode = 'view'
let activePermissions = []
let dataTableInstance = null

function getAvailablePermissions(rolesList) {
  const permMap = new Map()
  KNOWN_SYSTEM_PERMISSIONS.forEach((p) => permMap.set(p.id, { ...p }))

  rolesList.forEach((r) => {
    if (Array.isArray(r.permissions)) {
      r.permissions.forEach((perm) => {
        const id = typeof perm === 'string' ? perm : (perm.name || perm.id || String(perm))
        if (!permMap.has(id)) {
          permMap.set(id, {
            id,
            label: id,
            description: 'Assigned platform capability for this role.',
          })
        }
      })
    }
  })

  return Array.from(permMap.values())
}

async function mountShell() {
  const shell = await appShellHTML({
    navGroups: ADMIN_NAV_GROUPS,
    currentPage: 'roles-permissions',
    pageTitle: 'Roles & Permissions',
  })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

async function mountPermissionsModal() {
  $('#page-content').append(
    modalHTML({
      id: 'role-permissions-modal',
      title: 'Role Permissions',
      bodyHTML: '',
      footerHTML: '<div class="js-modal-footer-actions flex w-full items-center justify-between gap-2"></div>',
      size: 'lg',
    })
  )
  const closeIcon = await icon('x-mark', { className: 'h-4 w-4' })
  $('#role-permissions-modal .js-modal-close-icon').html(closeIcon)
}

async function renderViewMode() {
  if (!activeRole) return
  activeMode = 'view'
  const checkIcon = await icon('check-circle', { className: 'w-4 h-4 text-success-600 shrink-0' })
  const grantedList = Array.isArray(activeRole.permissions) ? activeRole.permissions : []
  const allPerms = getAvailablePermissions(roles)

  $('#role-permissions-modal-title').text(activeRole.name)
  $('#role-permissions-modal .js-modal-body').html(`
    <div class="space-y-4">
      <div class="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-neutral-700">${escapeHTML(activeRole.description || 'No description available.')}</p>
          <p class="mt-0.5 text-xs text-neutral-400">${activeRole.userCount ?? 0} users currently assigned to this role</p>
        </div>
        <span class="inline-flex shrink-0 items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-700/10">
          ${grantedList.length} granted
        </span>
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Granted Permissions</p>
          <span class="text-xs text-neutral-500">${grantedList.length} of ${allPerms.length} system privileges</span>
        </div>
        ${
          grantedList.length === 0
            ? `<div class="py-6 text-center text-xs text-neutral-400">No permissions currently granted to this role.</div>`
            : `<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                ${grantedList
                  .map((p) => {
                    const permId = typeof p === 'string' ? p : (p.name || p.id || String(p))
                    return `
                    <li class="flex items-center gap-2 rounded-lg border border-neutral-100 bg-white p-2.5 text-xs font-medium text-neutral-800 shadow-[var(--shadow-subtle)]">
                      ${checkIcon}
                      <span class="truncate">${escapeHTML(permId)}</span>
                    </li>`
                  })
                  .join('')}
              </ul>`
        }
      </div>
    </div>
  `)

  $('#role-permissions-modal .js-modal-footer-actions').html(`
    <span class="text-xs text-neutral-400">Read-only view</span>
    <div class="flex items-center gap-2">
      ${buttonHTML({ variant: 'secondary', label: 'Close', className: 'js-modal-close' })}
      ${buttonHTML({ variant: 'primary', label: 'Edit permissions', attrs: { id: 'btn-enter-edit-mode' } })}
    </div>
  `)
}

async function renderEditMode() {
  if (!activeRole) return
  activeMode = 'edit'
  const allPerms = getAvailablePermissions(roles)
  activePermissions = Array.isArray(activeRole.permissions) ? [...activeRole.permissions] : []

  $('#role-permissions-modal-title').text(`Edit Permissions — ${activeRole.name}`)
  $('#role-permissions-modal .js-modal-body').html(`
    <div class="space-y-4">
      <div class="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs text-neutral-600">Toggle permissions on or off for this role.</p>
          <p class="mt-0.5 text-xs font-medium text-neutral-700">
            <span class="js-active-toggle-count font-bold text-primary-700">${activePermissions.length}</span> of ${allPerms.length} permissions enabled
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <button type="button" class="js-grant-all-perms font-medium text-primary-600 hover:text-primary-700 hover:underline">Grant all</button>
          <span class="text-neutral-300">|</span>
          <button type="button" class="js-revoke-all-perms font-medium text-neutral-500 hover:text-neutral-700 hover:underline">Revoke all</button>
        </div>
      </div>

      <div class="max-h-96 overflow-y-auto divide-y divide-neutral-100 pr-1">
        ${allPerms
          .map((perm, idx) => {
            const isChecked = activePermissions.includes(perm.id)
            return `
            <div class="js-perm-toggle-row py-0.5" data-perm-id="${escapeHTML(perm.id)}">
              ${toggleSwitchHTML({
                id: `perm-toggle-${idx}`,
                label: perm.label,
                description: perm.description,
                checked: isChecked,
              })}
            </div>`
          })
          .join('')}
      </div>
    </div>
  `)

  $('#role-permissions-modal .js-modal-footer-actions').html(`
    <button type="button" class="js-reset-perms text-xs text-neutral-500 hover:text-neutral-700 hover:underline">Reset changes</button>
    <div class="flex items-center gap-2">
      ${buttonHTML({ variant: 'secondary', label: 'Cancel', attrs: { id: 'btn-cancel-edit-mode' } })}
      ${buttonHTML({ variant: 'primary', label: 'Save changes', attrs: { id: 'btn-save-role-permissions' } })}
    </div>
  `)
}

function wireModalInteractions() {
  const $modal = $('#role-permissions-modal')

  $modal.on('click', '#btn-enter-edit-mode', async function () {
    await renderEditMode()
  })

  $modal.on('click', '#btn-cancel-edit-mode', async function () {
    await renderViewMode()
  })

  $modal.on('click', '.js-grant-all-perms', function () {
    $modal.find('.js-toggle').prop('checked', true).trigger('change')
  })

  $modal.on('click', '.js-revoke-all-perms', function () {
    $modal.find('.js-toggle').prop('checked', false).trigger('change')
  })

  $modal.on('click', '.js-reset-perms', async function () {
    await renderEditMode()
  })

  $modal.on('change', '.js-toggle', function () {
    const count = $modal.find('.js-toggle:checked').length
    $modal.find('.js-active-toggle-count').text(count)
  })

  $modal.on('click', '#btn-save-role-permissions', async function () {
    if (!activeRole) return
    const $saveBtn = $(this)
    const $cancelBtn = $('#btn-cancel-edit-mode')

    const selectedPerms = []
    $modal.find('.js-perm-toggle-row').each(function () {
      const isChecked = $(this).find('.js-toggle').is(':checked')
      if (isChecked) {
        const permId = $(this).data('perm-id')
        if (permId) selectedPerms.push(permId)
      }
    })

    $saveBtn.prop('disabled', true).text('Saving…')
    $cancelBtn.prop('disabled', true)

    try {
      const payload = {
        permissions: selectedPerms,
        permissionIds: selectedPerms,
      }
      const res = await apiPatch(`/admin/roles/${activeRole.id}`, payload)

      const updatedRole = res && res.data ? res.data : (res?.id ? res : null)
      if (updatedRole && Array.isArray(updatedRole.permissions)) {
        activeRole.permissions = updatedRole.permissions
      } else {
        activeRole.permissions = [...selectedPerms]
      }

      if (dataTableInstance) {
        dataTableInstance.setData(roles)
      }

      showToast({
        level: 'success',
        title: 'Permissions updated',
        message: `Successfully saved permissions for ${activeRole.name}.`,
      })

      await renderViewMode()
    } catch (err) {
      const msg = err instanceof ApiError ? (err.data?.message || err.message) : 'Could not save role permissions.'
      showToast({
        level: 'critical',
        title: 'Update failed',
        message: msg,
      })
      $saveBtn.prop('disabled', false).text('Save changes')
      $cancelBtn.prop('disabled', false)
    }
  })
}

async function mountRolesTable() {
  const header = pageHeaderHTML({
    breadcrumbs: ['Admin', 'Roles & Permissions'],
    title: 'Roles & Permissions',
    description: 'What each role can see and do across ZTP.',
  })

  const offlineBannerHTML = `
    <div id="offline-banner" class="hidden mb-4 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800 shadow-sm" role="alert">
      <span class="font-semibold text-warning-900">Offline / Demo Mode:</span>
      <span>Could not connect to live API server. Showing cached sample roles & permissions.</span>
    </div>`

  $('#page-content').html(`${header}${offlineBannerHTML}<div id="roles-table"></div>`)
  await mountPermissionsModal()
  wireModalInteractions()

  try {
    const response = await apiGet('/admin/roles')
    const liveRoles = Array.isArray(response) ? response : response?.data
    if (Array.isArray(liveRoles)) {
      roles = liveRoles
      $('#offline-banner').addClass('hidden')
    } else {
      roles = getRoles()
      $('#offline-banner').removeClass('hidden')
    }
  } catch (err) {
    roles = getRoles()
    $('#offline-banner').removeClass('hidden')
    showToast({ level: 'warning', title: 'Offline roles', message: 'Could not load roles from server. Showing cached data.' })
  }

  dataTableInstance = await createDataTable({
    columns: [
      { key: 'name', label: 'Role', sortable: true },
      { key: 'description', label: 'Description', sortable: false },
      { key: 'userCount', label: 'Users', sortable: true },
      {
        key: 'permissions',
        label: 'Permissions',
        sortable: false,
        render: (row) => `${row.permissions?.length ?? 0} granted`,
      },
    ],
    container: '#roles-table',
    data: roles,
    rowKey: 'id',
    pageSize: 8,
    searchableKeys: ['name', 'description'],
    rowActionsHTML: () => `
      <button type="button" class="js-row-view-permissions flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
        View permissions
      </button>
      <button type="button" class="js-row-edit-permissions flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary-700 hover:bg-primary-50">
        Edit permissions
      </button>
    `,
    emptyState: { title: 'No roles match your search' },
  })

  $('#roles-table').on('click', '.js-row-view-permissions', async function () {
    const roleId = $(this).closest('.js-table-row').data('row-key')
    const role = roles.find((r) => String(r.id) === String(roleId))
    if (role) {
      activeRole = role
      await renderViewMode()
      openModal('role-permissions-modal')
    }
  })

  $('#roles-table').on('click', '.js-row-edit-permissions', async function () {
    const roleId = $(this).closest('.js-table-row').data('row-key')
    const role = roles.find((r) => String(r.id) === String(roleId))
    if (role) {
      activeRole = role
      await renderEditMode()
      openModal('role-permissions-modal')
    }
  })
}

$(async function () {
  await requireAuth({ allowedRoles: ADMIN_ROLES })
  await mountShell()
  await mountRolesTable()
})
