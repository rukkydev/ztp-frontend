/**
 * This file is no longer used by admin/dashboard.js — that page calls
 * the real GET /admin/dashboard now. Kept as documentation of the
 * CONFIRMED real response shape (unwrapped from the envelope:
 * { data: {...}, message, success, timestamp }):
 *
 *   stats: only 4 fields exist backend-side — totalUsers, activeUsers,
 *   suspendedUsers, lockedAccounts. There is no threat count, security
 *   score, failed-login count, or network status; the frontend doesn't
 *   invent numbers for concepts the backend has no data for.
 *
 *   resources / detectionTimeline: confirmed null in the real
 *   response — neither is implemented backend-side yet.
 *
 *   recentActivity: real audit-log events, not the {iconName, tone,
 *   text, time} shape used elsewhere in the app — dashboard.js maps
 *   `eventType` to an icon/tone itself.
 */
export function getDashboardData() {
  return {
    stats: {
      totalUsers: 5,
      activeUsers: 5,
      suspendedUsers: 0,
      lockedAccounts: 0,
    },
    resources: null,
    detectionTimeline: null,
    recentActivity: [
      {
        id: 74,
        actorUserId: 1,
        actorUsername: 'adaeze',
        eventType: 'LOGIN_SUCCESS',
        description: 'User logged in',
        ipAddress: '0:0:0:0:0:0:0:1',
        createdAt: '2026-08-13T22:45:56',
      },
      {
        id: 71,
        actorUserId: null,
        actorUsername: 'simonholm022@gmail.com',
        eventType: 'LOGIN_FAILED',
        description: 'Failed login attempt',
        ipAddress: '0:0:0:0:0:0:0:1',
        createdAt: '2026-08-13T14:43:40',
      },
      {
        id: 67,
        actorUserId: 1,
        actorUsername: 'adaeze@example.com',
        eventType: 'ACCOUNT_UNLOCKED',
        description: 'Unlocked account: jsmith',
        ipAddress: null,
        createdAt: '2026-08-13T01:57:28',
      },
      {
        id: 64,
        actorUserId: 2,
        actorUsername: 'jsmith',
        eventType: 'ACCOUNT_LOCKED',
        description: 'Account locked after 5 failed attempts',
        ipAddress: '127.0.0.1',
        createdAt: '2026-08-13T01:55:46',
      },
    ],
  }
}
