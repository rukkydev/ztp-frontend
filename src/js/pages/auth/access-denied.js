import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { statusContentHTML } from '../../components/auth-status.js'
import { buttonHTML } from '../../components/button.js'

registerIconPlugin($)

$(async function () {
  // Only render if auth-guard actually redirected here (sets this flag before redirect).
  // An unauthenticated user who browses directly to this URL goes to login instead.
  const reason = sessionStorage.getItem('ztp_access_denied')
  if (!reason) {
    window.location.replace('/auth/login.html')
    return
  }
  // Consume the flag — one-time use so a manual F5 re-redirects to login.
  sessionStorage.removeItem('ztp_access_denied')

  const actionHTML = buttonHTML({ variant: 'secondary', label: 'Back to dashboard', className: 'w-full', attrs: { id: 'access-denied-action' } })
  const content = await statusContentHTML({
    iconName: 'no-symbol',
    tone: 'critical',
    message: "You don't have permission to access this page. If you believe this is a mistake, contact your administrator.",
    actionHTML,
  })

  $('#app').html(await authShellHTML({ title: 'Access denied', contentHTML: content }))
  $('#access-denied-action').on('click', () => (window.location.href = '/admin/dashboard.html'))
})
