import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: true,
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.origin) {
              proxyReq.setHeader('origin', 'http://localhost:5176')
            }
            if (req.headers.referer) {
              proxyReq.setHeader('referer', 'http://localhost:5176/')
            }
          })
        },
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminUsers: resolve(__dirname, 'admin/users.html'),
        adminDevices: resolve(__dirname, 'admin/devices.html'),
        adminSessions: resolve(__dirname, 'admin/sessions.html'),
        adminAlerts: resolve(__dirname, 'admin/alerts.html'),
        adminThreats: resolve(__dirname, 'admin/threats.html'),
        adminActivityLogs: resolve(__dirname, 'admin/activity-logs.html'),
        adminNetworkMonitoring: resolve(__dirname, 'admin/network-monitoring.html'),
        adminAnomalyDetection: resolve(__dirname, 'admin/anomaly-detection.html'),
        adminReports: resolve(__dirname, 'admin/reports.html'),
        adminRolesPermissions: resolve(__dirname, 'admin/roles-permissions.html'),
        adminSettings: resolve(__dirname, 'admin/settings.html'),
        accountIndex: resolve(__dirname, 'account/index.html'),
        accountProfile: resolve(__dirname, 'account/profile.html'),
        accountDevices: resolve(__dirname, 'account/devices.html'),
        accountSessions: resolve(__dirname, 'account/sessions.html'),
        accountNotifications: resolve(__dirname, 'account/notification-settings.html'),
        login: resolve(__dirname, 'auth/login.html'),
        forgotPassword: resolve(__dirname, 'auth/forgot-password.html'),
        resetPassword: resolve(__dirname, 'auth/reset-password.html'),
        verifyDevice: resolve(__dirname, 'auth/verify-device.html'),
        twoFactor: resolve(__dirname, 'auth/two-factor.html'),
        sessionExpired: resolve(__dirname, 'auth/session-expired.html'),
        unauthorized: resolve(__dirname, 'auth/unauthorized.html'),
        accessDenied: resolve(__dirname, 'auth/access-denied.html'),
        accountSuspended: resolve(__dirname, 'auth/account-suspended.html'),
      },
    },
  },
})
