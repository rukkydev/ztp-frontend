/**
 * Placeholder data for the current person's profile. Sample data
 * only — nothing is fetched from or saved to a real backend yet.
 * Swap `getCurrentUserProfile()` for a real API call (and wire the
 * profile page's save handler to a real PATCH request) once the
 * endpoint exists; the page doesn't need to change shape.
 */
export function getCurrentUserProfile() {
  return {
    fullName: 'Jordan Blake',
    email: 'jordan.blake@company.com',
    phone: '+1 (555) 012-4477',
    jobTitle: 'Security Analyst',
    department: 'Information Security',
    role: 'Security Analyst',
    twoFactorEnabled: true,
    memberSince: 'March 2023',
    lastLogin: 'Today, 9:42 AM',
  }
}
