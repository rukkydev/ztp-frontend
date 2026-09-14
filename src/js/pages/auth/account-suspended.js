import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { statusContentHTML } from '../../components/auth-status.js'
import { buttonHTML } from '../../components/button.js'

registerIconPlugin($)

$(async function () {
  const actionHTML = buttonHTML({ variant: 'secondary', label: 'Back to sign in', className: 'w-full', attrs: { id: 'suspended-action' } })
  const content = await statusContentHTML({
    iconName: 'no-symbol',
    tone: 'critical',
    message: 'Your account has been suspended. Please contact your system administrator for assistance.',
    actionHTML,
  })

  $('#app').html(await authShellHTML({ title: 'Account suspended', contentHTML: content }))
  $('#suspended-action').on('click', () => {
    window.location.href = '/auth/login.html'
  })
})
