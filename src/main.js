import './styles/main.css'

import $ from './js/core/dom.js'
import { registerIconPlugin } from './js/utils/icons.js'
import { NAV_GROUPS } from './js/config/navigation.js'
import { appShellHTML } from './js/components/page.js'
import { initSidebar } from './js/components/sidebar.js'
import { initDropdowns } from './js/components/dropdown.js'
import { initModals } from './js/components/modal.js'
import { mountDashboardPage } from './js/pages/dashboard.js'

const CURRENT_PAGE = 'dashboard'

async function mountShell() {
  const shell = await appShellHTML({
    navGroups: NAV_GROUPS,
    currentPage: CURRENT_PAGE,
    pageTitle: 'Dashboard',
  })
  $('#app').html(shell)

  initSidebar()
  initDropdowns(document)
  initModals()
}

registerIconPlugin($)

$(async function () {
  await mountShell()
  await mountDashboardPage()
})
