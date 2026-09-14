import '../../../styles/main.css'

import $ from '../../core/dom.js'
import { registerIconPlugin } from '../../utils/icons.js'
import { authShellHTML } from '../../components/auth-shell.js'
import { statusContentHTML } from '../../components/auth-status.js'
import { buttonHTML } from '../../components/button.js'

registerIconPlugin($)

$(async function () {
  const actionHTML = buttonHTML({ variant: 'primary', label: 'Go to sign in', className: 'w-full', attrs: { id: 'unauthorized-action' } })
  const content = await statusContentHTML({
    iconName: 'lock-closed',
    tone: 'warning',
    message: 'You need to sign in to view this page.',
    actionHTML,
  })

  $('#app').html(await authShellHTML({ title: 'Sign in required', contentHTML: content }))
  $('#unauthorized-action').on('click', () => (window.location.href = '/auth/login.html'))
})
