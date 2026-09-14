/**
 * Shared across alert.js and toast.js so "what does warning look like"
 * is answered in exactly one place.
 */
export const STATUS_LEVELS = {
  info: { icon: 'information-circle', classes: 'bg-info-50 border-info-500/20 text-info-600' },
  success: { icon: 'check-circle', classes: 'bg-success-50 border-success-500/20 text-success-600' },
  warning: { icon: 'exclamation-triangle', classes: 'bg-warning-50 border-warning-500/20 text-warning-600' },
  critical: { icon: 'x-circle', classes: 'bg-critical-50 border-critical-500/20 text-critical-600' },
}
