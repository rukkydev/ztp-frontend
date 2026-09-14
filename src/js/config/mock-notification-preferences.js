/**
 * Placeholder data for Notification Settings. Sample defaults only —
 * nothing is saved to a real backend yet. Swap `getNotificationPreferences()`
 * for a real API call, and wire the page's save handler to a real
 * PATCH request, when the endpoint exists.
 */
export function getNotificationPreferences() {
  return {
    email: [
      { id: 'email-security-alerts', label: 'Security alerts', description: 'High-risk logins, new device enrollments, and access changes.', checked: true },
      { id: 'email-account-activity', label: 'Account activity', description: 'Password changes and profile updates.', checked: true },
      { id: 'email-product-updates', label: 'Product updates', description: 'New features and changes to ZTP.', checked: false },
      { id: 'email-weekly-digest', label: 'Weekly digest', description: 'A summary of activity across your account.', checked: false },
    ],
    push: [
      { id: 'push-security-alerts', label: 'Security alerts', description: 'High-risk logins and new device enrollments.', checked: true },
      { id: 'push-mentions', label: 'Mentions', description: "When someone mentions you in a report or comment.", checked: true },
    ],
  }
}
