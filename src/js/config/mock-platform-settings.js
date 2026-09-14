/**
 * Placeholder data for Admin Settings. Sample defaults only — swap
 * `getPlatformSettings()` for a real API call, and wire the page's
 * save handler to a real PATCH request, when the endpoint exists.
 */
export function getPlatformSettings() {
  return {
    general: {
      orgName: 'Acme Corporation',
      supportEmail: 'security@acme.com',
    },
    security: {
      sessionTimeout: '30', // minutes
      toggles: [
        { id: 'require-2fa', label: 'Require two-factor authentication for all users', description: 'New sign-ins will be prompted to set up 2FA if they haven\'t already.', checked: true },
        { id: 'enforce-password-rotation', label: 'Enforce password rotation every 90 days', description: 'Users will be required to set a new password after 90 days.', checked: true },
        { id: 'alert-impossible-travel', label: 'Alert on impossible-travel logins', description: 'Flag sign-ins from locations that are geographically implausible given the previous login.', checked: true },
        { id: 'block-legacy-auth', label: 'Block legacy authentication protocols', description: 'Prevents sign-in methods that don\'t support modern verification.', checked: false },
      ],
    },
  }
}

export const SESSION_TIMEOUT_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
]
