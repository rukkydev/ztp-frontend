import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { statusContentHTML } from '../../components/auth-status.js'
import { buttonHTML } from '../../components/button.js'

registerIconPlugin($)

$(async function () {
  // Only render if auth-guard actually redirected here (sets this flag before redirect).
  // A direct navigation or bookmark without a real expired session goes to login instead.
  const reason = sessionStorage.getItem('ztp_session_expired')
  if (!reason) {
    window.location.replace('/auth/login.html')
    return
  }
  // Consume the flag — one-time use so a manual F5 after viewing the page
  // still redirects to login rather than re-showing the expired screen.
  sessionStorage.removeItem('ztp_session_expired')

  const actionHTML = buttonHTML({ variant: 'primary', label: 'Sign in again', className: 'w-full', attrs: { id: 'session-expired-action' } })
  const content = await statusContentHTML({
    iconName: 'clock',
    tone: 'neutral',
    message: 'For your security, you were signed out after a period of inactivity.',
    actionHTML,
  })

  $('#app').html(await authShellHTML({ title: 'Your session expired', contentHTML: content }))
  $('#session-expired-action').on('click', () => (window.location.href = '/auth/login.html'))
})
