# ZTP — API Endpoints Needed

Every endpoint the frontend currently expects, derived directly from what each page actually calls (or stands in for with a commented placeholder — see `src/js/pages/**`). Paths are relative to `VITE_API_BASE_URL` (`src/js/core/api-config.js`), **which is confirmed to already include `/api`** — so `POST /auth/login` in this doc means `POST http://localhost:8080/api/auth/login` against the local backend, not `.../api/auth/login` appended again.

**Backing mock file** in each table below points to the `mock-*.js` file whose return shape is exactly what that endpoint's response body should match — that's the fastest way to see the expected JSON without reading the page source.

**Status column** (✅ / ⬜) reflects what's actually wired to a live call in the frontend right now, not just "the backend built it." A backend endpoint being ready doesn't get marked ✅ here until the frontend is actually calling it — see "What's live right now" below for the current cut.

---

## Conventions

**Auth.** Every endpoint except the ones under "Auth (public)" requires an authenticated session. The frontend sends cookies (`credentials: 'include'`), not a bearer token — see the Security section of `README.md`.

**CSRF — confirmed, not optional.** Every mutating request (POST/PUT/PATCH/DELETE) must carry the `X-XSRF-TOKEN` header, echoing back the value of the `XSRF-TOKEN` cookie the backend sets (Laravel Sanctum-style double-submit). `GET /csrf-token` is what sets that cookie in the first place — `api-client.js` calls it automatically the first time any mutating request is made in a session, so nothing in a page's own code needs to call it directly. A mutating request sent without ever having triggered that bootstrap will fail CSRF validation.

**List endpoints** (tables — Users, Devices, Sessions, Alerts, Threats, Activity Logs, Anomalies, Reports, Roles) all take the same shape of query params today, since `data-table.js` filters/sorts/paginates client-side against a full dataset:

| Param | Example | Notes |
|---|---|---|
| — | — | Currently none are sent — the frontend fetches the full list once and does search/sort/filter/paginate client-side. |

That's fine at small scale but **won't scale** past a few hundred rows per table. When wiring these up for real, the recommended change on both ends is to move search/sort/filter/pagination server-side and add:

| Param | Example | Maps to |
|---|---|---|
| `q` | `q=jordan` | the table's search box |
| `sort`, `dir` | `sort=lastActive&dir=desc` | clicking a sortable column |
| `page`, `pageSize` | `page=2&pageSize=8` | the pagination footer |
| one param per filter key | `status=Active`, `role=Admin` | each `filters[]` entry on that page |
| a `dateRange` filter's key, `_from`/`_to` | `timestamp_from=2026-07-01&timestamp_to=2026-07-15` | Activity Logs' date-range filter specifically |

If server-side pagination is implemented, the response shape becomes `{ data: [...], total, page, pageSize }` instead of a bare array, and `createDataTable()`'s `data`/`setData()` usage needs a small update to match. **Both `GET /admin/users` and `GET /admin/roles` are wired defensively right now** — the frontend accepts either a bare array or `{ data: [...] }` since which one the real endpoint returns wasn't confirmed. Confirm it and this note (plus the defensive unwrapping code) can come out.

**Error shape.** `api-client.js`'s `ApiError` reads `data.message` for the error text, so error responses should be `{ "message": "human-readable string" }` at minimum, with any additional structured data alongside it (`ApiError.data` carries the whole body).

---

## What's live right now

| Endpoint | Frontend usage | Notes |
|---|---|---|
| `GET /csrf-token` | Auto-bootstrapped by `api-client.js` before any mutating request | Sets `XSRF-TOKEN` cookie. |
| `POST /auth/login` | `auth/login.html` | Multi-stage: checks `deviceVerificationRequired` and `twoFactorRequired`. |
| `POST /auth/verify-device` | `auth/verify-device.html` | Device authorization step `{ email, code, rememberDevice }`. |
| `POST /auth/verify-device/resend` | `auth/verify-device.html` | Resend device verification code `{ email }`. |
| `POST /auth/2fa/verify` | `auth/two-factor.html` | Submit 2FA code `{ email, code }`. |
| `POST /auth/2fa/resend` | `auth/two-factor.html` | Resend 2FA code `{ email }`. |
| `POST /auth/forgot-password` | `auth/forgot-password.html` | Request password reset link `{ email }`. Always returns 200. |
| `POST /auth/reset-password` | `auth/reset-password.html` | Submit new password with reset token `{ token, newPassword }`. |
| `POST /auth/logout` | Topbar "Log out" button | Clears session. |
| `GET /auth/me` | `requireAuth()`, called by all protected pages | Returns user object `{ id, username, email, role, createdAt }`. |
| `GET /admin/dashboard` | `admin/dashboard.html` | Real `stats` and `recentActivity`. `AUDIT_VIEW` permission. |
| `GET /admin/users` | `admin/users.html` | Fetch user list. `USER_VIEW` permission. |
| `GET /admin/users/{id}` | `admin/users.html` | Single user detail. `USER_VIEW` permission. |
| `POST /admin/users` | `admin/users.html` | Create user `{ username, email, password, role }`. `USER_MANAGE` permission. |
| `PATCH /admin/users/{id}` | `admin/users.html` | Update user status/fields. `USER_MANAGE` permission. |
| `PATCH /admin/users/bulk-suspend` | `admin/users.html` | Bulk suspend `{ ids: [...] }`. `USER_MANAGE` permission. |
| `PATCH /admin/users/{id}/unlock` | `admin/users.html` | Unlock locked account. `USER_UNLOCK` permission. |
| `GET /admin/devices` | `admin/devices.html` | Fetch devices `{ data: [...] }`. `USER_VIEW` permission. |
| `PATCH /admin/devices/{id}` | `admin/devices.html` | Update device status (Trusted/Blocked). `USER_MANAGE` permission. |
| `PATCH /admin/devices/bulk-block` | `admin/devices.html` | Bulk block devices `{ ids: [...] }`. `USER_MANAGE` permission. |
| `GET /admin/sessions` | `admin/sessions.html` | Fetch sessions `{ data: [...] }`. `USER_VIEW` permission. |
| `DELETE /admin/sessions/{id}` | `admin/sessions.html` | Revoke session. `USER_MANAGE` permission. |
| `DELETE /admin/sessions/bulk` | `admin/sessions.html` | Bulk sign out sessions `{ ids: [...] }`. `USER_MANAGE` permission. |
| `GET /admin/roles` | `admin/roles-permissions.html` | Role list and permissions. `ROLE_MANAGE` permission. |
| `PATCH /admin/roles/{id}` | `admin/roles-permissions.html` | Update role permissions `{ permissionIds: [...] }`. `ROLE_MANAGE` permission. |
| `GET /admin/activity-logs` | `admin/activity-logs.html` | Paginated audit trail. `AUDIT_VIEW` permission. |
| `GET /admin/activity-logs/{id}` | `admin/activity-logs.html` | Activity log details. `AUDIT_VIEW` permission. |
| `GET /admin/settings` | `admin/settings.html` | Fetch platform settings. `SETTINGS_MANAGE` permission. |
| `PATCH /admin/settings` | `admin/settings.html` | Update settings `{ general, security }`. `SETTINGS_MANAGE` permission. |
| `GET /admin/alerts` | `admin/alerts.html` | Auto-generated security alerts `{ id, title, description, severity, status, userId, username, createdAt }`. `THREAT_MANAGE` permission. |
| `PATCH /admin/alerts/{id}` | `admin/alerts.html` | Resolve single alert `{ status: "Resolved" }`. `THREAT_MANAGE` permission. |
| `PATCH /admin/alerts/bulk-resolve` | `admin/alerts.html` | Bulk resolve alerts `{ ids: [...] }`. `THREAT_MANAGE` permission. |
| `GET /admin/threats` | `admin/threats.html` | Auto-generated threats `{ id, title, description, severity, status, userId, username, createdAt }`. `THREAT_MANAGE` permission. |
| `PATCH /admin/threats/{id}` | `admin/threats.html` | Mitigate single threat `{ status: "Mitigated" }`. `THREAT_MANAGE` permission. |
| `PATCH /admin/threats/bulk-mitigate` | `admin/threats.html` | Bulk mitigate threats `{ ids: [...] }`. `THREAT_MANAGE` permission. |
| `GET /admin/reports` | `admin/reports.html` | Generated compliance/security/usage reports. |
| `POST /admin/reports` | `admin/reports.html` | Trigger background report generation `{ category, type, format }`. |
| `GET /admin/reports/{id}` | `admin/reports.html` | Poll report status until `"Ready"` or `"Failed"`. |
| `GET /admin/reports/{id}/download` | `admin/reports.html` | Download binary CSV or PDF report file (`credentials: 'include'`). |
| `GET /account/profile` | `account/profile.html` | User profile with `avatarUrl`. Scoped to caller. |
| `PATCH /account/profile` | `account/profile.html` | Update profile details. Scoped to caller. |
| `POST /account/profile/avatar` | `account/profile.html` | Multipart avatar upload. Scoped to caller. |
| `GET /account/security/recovery-phrase/status` | `account/profile.html` | Fetch recovery phrase setup status (`{ data: boolean }`). |
| `POST /account/security/recovery-phrase/generate` | `account/profile.html` | Generate/re-generate 12-word seed phrase (`{ data: "word1 ... word12" }`). |
| `POST /auth/recover-with-phrase` | `auth/forgot-password.html` | Emergency account recovery `{ email, phrase, newPassword }`. |
| `GET /account/devices` | `account/devices.html` | Own devices. Scoped to caller. |
| `DELETE /account/devices/{id}` | `account/devices.html` | Remove own device. Scoped to caller. |
| `GET /account/sessions` | `account/sessions.html` | Own sessions. Scoped to caller. |
| `DELETE /account/sessions/{id}` | `account/sessions.html` | Sign out own session. Scoped to caller. |
| `DELETE /account/sessions` | `account/sessions.html` | Sign out all other sessions. Scoped to caller. |
| `GET /account/notification-preferences` | `account/notification-settings.html` | Retrieve preferences. Scoped to caller. |
| `PATCH /account/notification-preferences` | `account/notification-settings.html` | Update channel preferences. Scoped to caller. |
| `GET /account/notifications` | `account/notifications.html` & Topbar | Fetch list of in-app notifications (`[{ id, eventKey, title, message, read, createdAt }]`). Scoped to caller. |
| `GET /account/notifications/unread-count` | `account/notifications.html` & Topbar | Poll unread notification count (`{ data: { count } }`). Scoped to caller. |
| `PATCH /account/notifications/{id}/read` | `account/notifications.html` & Topbar | Mark single notification as read. Scoped to caller. |
| `PATCH /account/notifications/read-all` | `account/notifications.html` & Topbar | Mark all notifications as read. Scoped to caller. |

| `GET /admin/network-monitoring` | `admin/network-monitoring.html` | Live network telemetry and endpoints status (`{ data: { stats, trafficTimeline, endpoints } }`). `AUDIT_VIEW` permission. |
| `GET /admin/anomaly-detection` | `admin/anomaly-detection.html` | Live ML behavioral anomaly logs and detection metrics (`{ data: { stats, timeline, anomalies } }`). `THREAT_MANAGE` permission. |
| `GET /account/overview` | `account/index.html` | Consolidated user overview metrics (`{ data: { profile, deviceCount, sessionCount, unreadNotifications, hasRecoveryPhrase } }`). Scoped to caller. |

All core frontend pages are now wired to live backend API endpoints, backed by real database state, ML anomaly evaluation, and audit records.

---

## Auth (public — no session required)

| Method | Path | Used by | Request body | Notes | Backing mock file |
|---|---|---|---|---|---|
| GET | `/csrf-token` | ✅ auto-called by `api-client.js` | — | Sets the `XSRF-TOKEN` cookie. See "CSRF — confirmed, not optional" above. | — |
| POST | `/auth/login` | ✅ `auth/login.html` | `{ email, password }` | Returns `{ user, deviceVerificationRequired, twoFactorRequired }`, `user.role` confirmed as `SUPER_ADMIN`/`SECURITY_NETWORK_ADMIN`/`USER` — see "What's live right now" for the full confirmed shape and current redirect behavior. | — |
| POST | `/auth/verify-device` | ✅ `auth/verify-device.html` | `{ email, code, rememberDevice }` | Returns standard envelope `{ data: { user, deviceVerificationRequired, twoFactorRequired }, message, success }` | — |
| POST | `/auth/verify-device/resend` | ✅ `auth/verify-device.html` | `{ email }` | Powers the "Resend code" cooldown button. | — |
| POST | `/auth/2fa/verify` | ✅ `auth/two-factor.html` | `{ email, code }` | Returns `{ data: { user, deviceVerificationRequired, twoFactorRequired }, message, success }` | — |
| POST | `/auth/2fa/resend` | ✅ `auth/two-factor.html` | `{ email }` | Powers the 2FA "Resend code" cooldown button. | — |
| POST | `/auth/forgot-password` | `auth/forgot-password.html` | `{ email }` | Always return a generic success response regardless of whether the email exists — the page's confirmation copy already deliberately doesn't reveal that either way. | — |
| POST | `/auth/reset-password` | `auth/reset-password.html` | `{ token, newPassword }` | `token` comes from the reset-link URL (not currently read by the page — needs a small update to pull it from `location.search` once this is wired up). | — |
| POST | `/auth/logout` | ✅ topbar "Log out" (all authenticated pages) | — | | — |

---

## Admin

### Dashboard — `admin/dashboard.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/admin/dashboard` | ✅ **Live.** Envelope-wrapped: `{ data: { stats, resources, detectionTimeline, recentActivity }, message, success, timestamp }`. Confirmed real `stats` is just `{ totalUsers, activeUsers, suspendedUsers, lockedAccounts }` — no threat count, security score, or network status exist backend-side; the page doesn't show any. `resources`/`detectionTimeline` are confirmed `null` (not implemented) — placeholder cards, not invented numbers. | `mock-dashboard-data.js` (kept accurate as reference, no longer actually used by the page) |

### Users — `admin/users.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/users` | — | ✅ | `mock-users-data.js` |
| POST | `/admin/users` | user fields | "Add user" button — currently a no-op placeholder. | — |
| PATCH | `/admin/users/{id}` | e.g. `{ status: "Suspended" }` | ✅ Row-level Suspend. | — |
| PATCH | `/admin/users/bulk-suspend` | `{ ids: [...] }` | ✅ "Suspend selected" bulk action. | — |
| PATCH | `/admin/users/{id}/unlock` | — | ✅ Row-level Unlock, shown for any user with `status: "Locked"` — a status value the frontend didn't previously model, added specifically for this. | — |
| GET / PATCH | `/admin/users/{id}` | user fields | Row-level Edit — currently just shows a toast, no form exists yet. | — |

### Devices — `admin/devices.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/devices` | — | ✅ Confirmed shape: `{ data: [ { id, userId, userAgent, ipAddress, status, lastSeenAt, createdAt } ] }`. | `mock-admin-devices-data.js` |
| PATCH | `/admin/devices/{id}` | `{ status: "Blocked" \| "Trusted" }` | ✅ Row-level Block/Unblock. | — |
| PATCH | `/admin/devices/bulk-block` | `{ ids: [...] }` | simulated via parallel PATCH requests. | — |

### Sessions — `admin/sessions.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/sessions` | — | ✅ Confirmed shape: `{ data: [ { sessionId, username, lastRequest } ] }`. | `mock-admin-sessions-data.js` |
| DELETE | `/admin/sessions/{sessionId}` | — | ✅ Row-level Sign out. Takes effect on subsequent request. | — |
| DELETE | `/admin/sessions/bulk` | `{ ids: [...] }` | simulated via parallel DELETE requests. | — |

### Alerts — `admin/alerts.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/alerts` | — | | `mock-alerts-data.js` |
| PATCH | `/admin/alerts/{id}` | `{ status: "Resolved" }` | Row-level Resolve. | — |
| PATCH | `/admin/alerts/bulk-resolve` | `{ ids: [...] }` | Bulk "Resolve selected". | — |

### Threats — `admin/threats.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/threats` | — | | `mock-threats-data.js` |
| PATCH | `/admin/threats/{id}` | `{ status: "Mitigated" }` | Row-level "Mark mitigated". | — |
| PATCH | `/admin/threats/bulk-mitigate` | `{ ids: [...] }` | Bulk "Mitigate selected". | — |

### Activity Logs — `admin/activity-logs.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/admin/activity-logs` | Read-only audit trail — no write endpoints. This is the page that most needs server-side filtering (see Conventions above) once log volume is real: `status`, plus a date-range pair (`timestamp_from`/`timestamp_to`) for the date-range filter specifically. | `mock-activity-logs-data.js` |
| GET | `/admin/activity-logs/{id}` | Powers "View details." Only needed as a separate call if the list endpoint doesn't already return every field the modal shows (currently it does, in the mock — the modal reads fields already present on the row). | — |

### Network Monitoring — `admin/network-monitoring.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/admin/network-monitoring` | Returns `{ stats, trafficTimeline, endpoints }`. | `mock-network-monitoring-data.js` |

Consider a short-poll or WebSocket/SSE update for this page specifically — "live" network stats going stale until a manual refresh is the one place on the site where that gap will be most noticeable.

### Anomaly Detection — `admin/anomaly-detection.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/anomaly-detection` | — | Returns `{ stats, timeline, anomalies }`. | `mock-anomaly-detection-data.js` |
| PATCH | `/admin/anomalies/{id}` | `{ status: "Confirmed" \| "Dismissed" }` | Row-level Confirm/Dismiss. | — |

### Reports — `admin/reports.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/reports` | — | | `mock-reports-data.js` |
| POST | `/admin/reports` | `{ type }` | "Generate report" — should return the new report row immediately with `status: "Processing"`, matching what the page already renders optimistically. | — |
| GET | `/admin/reports/{id}` | — | Needed for the frontend to poll until `status` flips to `"Ready"` (currently simulated with a `setTimeout`) — or switch to a push mechanism (SSE/WebSocket) if generation can take a while. | — |
| GET | `/admin/reports/{id}/download` | — | Should respond with the actual file (or a signed URL to one), not JSON. | — |

### Roles & Permissions — `admin/roles-permissions.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/admin/roles` | ✅ Powers both the table and the "View permissions" modal (the modal just reads a field already present on the row). | `mock-roles-data.js` |
| PATCH | `/admin/roles/{id}` | Backend-ready, but **no frontend UI calls it yet.** Editing the permission matrix is a bigger feature than viewing it (see `README.md`) — this row exists so whoever builds that editor knows the endpoint's already there. | — |

### Settings — `admin/settings.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/admin/settings` | — | ✅ **Live.** Returns `{ general: { orgName, supportEmail }, security: { sessionTimeout, toggles: [...] } }`. | `mock-platform-settings.js` |
| PATCH | `/admin/settings` | `{ general: { orgName, supportEmail }, security: { sessionTimeout, toggles: [...] } }` | ✅ **Live.** One "Save settings" button submits changes. | — |

---

## Account

### Overview — `account/index.html`

| Method | Path | Notes |
|---|---|---|
| — | — | Currently composed client-side from the Profile, Devices, Sessions, and Notification Preferences endpoints below (four calls). A dedicated `GET /account/overview` returning just the four numbers shown would save three round trips if this page's load time matters. |

### Profile — `account/profile.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/account/profile` | — | ✅ **Live.** Loads user profile. | `mock-profile-data.js` |
| PATCH | `/account/profile` | `{ fullName, email, phone, jobTitle, department }` | ✅ **Live.** "Save changes" in edit mode. | — |
| POST | `/account/profile/avatar` | multipart file | The camera/"change photo" button — currently a labeled placeholder with no upload flow at all. | — |

### My Devices — `account/devices.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/account/devices` | ✅ Confirmed shape: `{ data: [ { id, userId, userAgent, ipAddress, status, lastSeenAt, createdAt } ] }`. Scoped to signed-in person. | `mock-account-security-data.js` (`getMyDevices`) |
| DELETE | `/account/devices/{id}` | ✅ "Remove" — server-side checks reject removing the current active device. | — |

### My Sessions — `account/sessions.html`

| Method | Path | Notes | Backing mock file |
|---|---|---|---|
| GET | `/account/sessions` | ✅ Confirmed shape: `{ data: [ { sessionId, username, lastRequest } ] }`. Scoped to signed-in person. | `mock-account-security-data.js` (`getMySessions`) |
| DELETE | `/account/sessions/{sessionId}` | ✅ Row-level "Sign out." | — |
| DELETE | `/account/sessions` | ✅ "Sign out all other sessions" — excludes the caller's active session. | — |

### Notification Settings — `account/notification-settings.html`

| Method | Path | Request body | Notes | Backing mock file |
|---|---|---|---|---|
| GET | `/account/notification-preferences` | — | ✅ **Live.** Returns `{ email: [...], push: [...] }` with `eventKey`, `label`, `checked`. | `mock-notification-preferences.js` |
| PATCH | `/account/notification-preferences` | `{ email: [{ eventKey, checked }], push: [{ eventKey, checked }] }` | ✅ **Live.** Saves channel toggle changes. | — |

---

## Landing (`/index.html`) and Docs (`/docs.html`)

No endpoints. The landing page's "live status strip" currently reads local mock data directly rather than calling an authenticated admin endpoint from a public page — that's deliberate, not an oversight. If it should show real numbers, expose a small public summary endpoint (e.g. `GET /public/status` → `{ securityScore, uptime, activeUsers }`) rather than pointing it at `/admin/dashboard`, which requires a session this page doesn't have.

---

## Summary count

- **Auth:** 7 endpoints (all public) — 3 live (`csrf-token`, `login`, `logout`)
- **Cross-cutting:** `GET /auth/me` — ✅ confirmed and live, required by every protected page
- **Admin:** 12 pages → ~35 endpoints — 6 live (Users ×4, Roles read, Dashboard)
- **Account:** 4 pages (Overview has none of its own) → ~9 endpoints — 5 live (Devices ×2, Sessions ×3)
- **Public:** 0 required, 1 optional (landing page stats) — 0 live

**19 of ~51 endpoints are actually wired to a live call right now.** Everything else in this document is a spec for what to build next, not a status report on what exists — see "What's live right now" near the top for the current, accurate cut.
