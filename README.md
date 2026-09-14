# ZTP — Zero Trust Platform (Frontend)

Enterprise security-dashboard frontend. Stack: **Vite + Tailwind CSS v4 + jQuery + Heroicons**, no CDN dependencies — everything is installed via npm.

## Getting started

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL for your backend
npm run dev             # http://localhost:5173
npm run build            # production build to /dist
npm run preview          # preview the production build
```

`/` is the public landing page. Auth screens live under `/auth/*.html`, the authenticated app under `/admin/*.html` and `/account/*.html` (see "Areas" below). `.env` is gitignored — never commit real API URLs/secrets; `.env.example` is the tracked template.

## API Client

See **`API_ENDPOINTS.md`** for the full list of endpoints every page needs, and its "What's live right now" section for exactly what's actually wired up vs. still mock data — **login, logout, session-check (`/auth/me`), `GET`/`PATCH` on Users, `PATCH .../bulk-suspend`, `PATCH .../unlock`, `GET` on Roles, and the Dashboard are live.** Everything else is still `mock-*.js`.

`src/js/core/api-client.js` is the fetch wrapper the rest of the app's placeholder `setTimeout`s are standing in for:

```js
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from './js/core/api-client.js'

try {
  const users = await apiGet('/admin/users')
  await apiPatch(`/admin/users/${id}`, { status: 'Suspended' })
} catch (err) {
  if (err instanceof ApiError && err.status === 401) { /* ... */ }
}
```

- **Base URL**: `VITE_API_BASE_URL`, confirmed as `http://localhost:8080/api` locally (see `.env.example`) — already includes `/api`, so paths passed to `apiRequest()` shouldn't repeat it.
- **Auth is cookie-based** (`credentials: 'include'`), not a token read from JS — see the security note below for why.
- **CSRF — confirmed, not optional**: the backend sets an `XSRF-TOKEN` cookie and expects it echoed back as `X-XSRF-TOKEN` on every mutating request (Laravel Sanctum-style). `api-client.js` calls `GET /csrf-token` automatically the first time a mutating request is made in a session — nothing else needs to think about it.
- **Timeouts**: every request aborts after `DEFAULT_TIMEOUT_MS` (15s) via `AbortController`.
- **Errors**: any non-2xx response, network failure, or timeout throws `ApiError` with `.status` and `.data`.
- **Response envelope isn't consistent across endpoints — confirmed, not assumed.** `login` and `auth/me` return their data flat; `admin/dashboard` wraps it in `{ data: {...}, message, success, timestamp }`. `apiRequest()` doesn't auto-unwrap anything — each call site does it explicitly when needed (see `admin/dashboard.js` for the pattern: `const { data } = await apiGet(...)`). **Check which shape a new endpoint actually uses before wiring it up** — don't assume either pattern.

`src/js/pages/auth/login.js`, `src/js/pages/admin/users.js`, and `src/js/pages/admin/dashboard.js` are the three pages worth reading for the pattern (try/catch around the call, `ApiError` branching, toast or inline error on failure) before wiring up the next one. `login.js` reads `user.role` (confirmed: `"SUPER_ADMIN"` | `"SECURITY_NETWORK_ADMIN"` | `"USER"`) to decide where to send someone via `homePathForRole()`. The multi-stage login flow integrates both device checks (`deviceVerificationRequired`) and two-factor checks (`twoFactorRequired`) dynamically based on responses, with redirections to intermediate gating screens before completing the session.

## Security

Four things are baked in now:

- **XSS via backend data.** Every page in this app builds HTML as strings and injects it with jQuery's `.html()`. That's fine for text the app itself authors, but any value that could come from a backend — a name, an email, a log message, an alert title — is a stored-XSS vector the moment mock data becomes real data, unless it's escaped first. `src/js/utils/sanitize.js` exports `escapeHTML()`, and it's already wired into the shared components so most of the app is covered without every page having to remember to call it: `badge.js`, `toast.js`, `alert.js`, `modal.js` (title + `confirmDialog` message), `stat-card.js`, `activity-feed.js`, `resource-list-item.js`, `topbar.js`'s user name/role, and `data-table.js`'s default cell renderer (any column *without* a custom `render()`). A column or component *with* a custom `render()` is responsible for escaping whatever raw row data it interpolates itself — `admin/devices.js`'s Device column, the Activity Logs details modal, and the Roles & Permissions modal are the examples of that in the codebase. When adding a new page: if you're about to write `${someValue}` into a template and `someValue` didn't come from a string literal you wrote, wrap it in `escapeHTML()`.
- **Auth tokens never live in JS-readable storage.** No `localStorage`, no `sessionStorage`, no plain JS variable holding a session token — see the API Client section above. This only holds if the backend actually issues sessions as httpOnly cookies; a backend that returns a token in the response body for the frontend to store defeats it regardless of what the frontend does.
- **CSRF is enforced, not just documented.** The header/cookie pair above isn't a "change this for your backend" placeholder anymore — it's the actual confirmed values, and `api-client.js` handles the bootstrap call automatically so a mutating request can't accidentally go out without it.
- **Persistent Device Tracking (`X-Device-Id`).** To satisfy Zero Trust requirements, a persistent browser UUID is generated once per user environment, stored in `localStorage`, and automatically appended as an `X-Device-Id` header to every API request. This identifies trusted environments and governs the device check login gating.
- **Every protected page verifies its own session — and role — before rendering anything.** Until recently, none of them did — any `/admin/*` or `/account/*` URL rendered immediately regardless of whether there was a valid session, which was a real gap in an app whose whole premise is "never trust, always verify." `src/js/core/auth-guard.js` exports `requireAuth()`, called as the first line of all 17 protected pages' entry points, before the shell mounts:
  - **Session check** (`GET /auth/me`, confirmed): any failure — 401, network error, timeout — redirects to `/auth/login.html`, and the call never resolves, so nothing written after the `await` runs.
  - **Role check**, admin pages only: `requireAuth({ allowedRoles: ADMIN_ROLES })` (`src/js/config/roles.js`) additionally redirects to `/auth/access-denied.html` if the authenticated session's role isn't `SUPER_ADMIN` or `SECURITY_NETWORK_ADMIN` — so a `USER`-role session hitting an `/admin/*` URL directly gets turned away, not just hidden from nav. `/account/*` pages call `requireAuth()` with no role restriction, since any authenticated role manages their own account.

  Auth screens and the two public pages (landing, docs) don't call `requireAuth()` at all, deliberately — calling it there would be a redirect loop.

What the frontend still can't do: enforce input validation (client-side checks in `form-field.js` etc. are UX, not security — the backend must validate everything again) or rate-limit requests.

## Areas

The app is split into three authenticated areas plus two public pages, each its own set of Vite entry pages:

- **`/index.html`** — the public landing page. Hero + "What ZTP monitors" feature grid, "Sign in" / "View documentation" as the two paths in. Not part of the authenticated app, so no sidebar — just `public-nav.js` (brand + Docs link + Sign in button), shared with `/docs.html`.
- **`/docs.html`** — project overview for anyone browsing the frontend: tech stack, the three areas explained, a full directory linking every page that exists, and an explicit "this is all placeholder data" callout.
- **`/admin/*.html`** — for staff managing the platform: Dashboard, Users, Devices, Sessions, Alerts, Threats, Activity Logs, Network Monitoring, Anomaly Detection, Reports, Roles & Permissions, Settings. Every page from the system prompt's Dashboard Pages list is now built. Full sidebar nav (`js/config/admin-navigation.js`), gated to `SUPER_ADMIN`/`SECURITY_NETWORK_ADMIN` roles via `requireAuth({ allowedRoles: ADMIN_ROLES })`.
- **`/account/*.html`** — for a signed-in person managing their own access: Overview, Profile, My Devices, My Sessions, Notification Settings. Lighter sidebar nav (`js/config/account-navigation.js`), open to any authenticated role.
- **`/auth/*.html`** — shared by both: Login, Forgot Password, Reset Password, Verify Device, Two-Factor, Session Expired, Unauthorized, Access Denied. No sidebar — the person isn't authenticated yet, or is being told they can't proceed.

`appShellHTML()`, `sidebarHTML()`, and `topbarHTML()` don't know or care which area is using them — every authenticated page just passes its own `navGroups` config. Adding a new area later (if a fourth role ever needs one) is a new nav config file, not new layout code.

**Role-based routing is real now.** `src/js/config/roles.js` has the confirmed role values and `homePathForRole()`; login sends `SUPER_ADMIN`/`SECURITY_NETWORK_ADMIN` to `/admin/dashboard.html` and `USER` to `/account/index.html`. The landing page's "Sign in" button still just goes to `/auth/login.html` — login itself is now where the role-based branch happens, not the landing page.

## Folder structure

```
src/
  styles/
    main.css              # imports Tailwind + fonts + tokens + base, in that order
    tokens.css            # @theme block — every design token lives here
    base.css              # resets, focus states, scrollbars
  js/
    core/
      dom.js              # single import point for jQuery — import $ from here
      api-config.js       # API_BASE_URL (from .env), CSRF cookie/header names, request timeout
      api-client.js        # apiGet/apiPost/apiPatch/apiPut/apiDelete, ApiError — live, see API Client section above
      auth-guard.js         # requireAuth() — session+role check every protected page calls before rendering
    utils/
      icons.js            # inlines Heroicons SVGs from node_modules (no CDN, no <img>)
      sanitize.js         # escapeHTML() — see the Security section above
    config/
      admin-navigation.js    # ADMIN_NAV_GROUPS — sidebar nav for /admin/*
      account-navigation.js  # ACCOUNT_NAV_GROUPS — sidebar nav for /account/*
      roles.js               # ROLES, ADMIN_ROLES, homePathForRole() — confirmed role values
      status-levels.js       # shared info/success/warning/critical icon+color config
      mock-dashboard-data.js # no longer used by the page — kept as reference for the confirmed real GET /admin/dashboard shape
      mock-users-data.js     # placeholder Users table data — swap for a real API call
      mock-admin-devices-data.js  # placeholder org-wide device fleet data
      mock-admin-sessions-data.js # placeholder org-wide active session data
      mock-alerts-data.js         # placeholder Alerts data
      mock-threats-data.js        # placeholder Threats data
      mock-activity-logs-data.js  # placeholder Activity Logs data (real timestamps, for the date-range filter)
      mock-network-monitoring-data.js # placeholder Network Monitoring data
      mock-anomaly-detection-data.js  # placeholder Anomaly Detection data
      mock-reports-data.js        # placeholder Reports data
      mock-roles-data.js          # placeholder role/permission data
      mock-platform-settings.js   # placeholder platform-wide settings
      mock-profile-data.js   # placeholder profile data — swap for a real API call
      mock-account-security-data.js   # placeholder My Devices / My Sessions data
      mock-notification-preferences.js # placeholder Notification Settings data
    components/
      button.js           # buttonHTML() — pass href to render as a styled <a>, initLoadingButtons()
      badge.js             # badgeHTML()
      alert.js             # alertHTML(), initAlertDismiss()
      dropdown.js          # initDropdowns() — generic open/close, powers notif + user menu + table filters
      sidebar.js           # sidebarHTML(), initSidebar() — collapse, mobile drawer, active state
      topbar.js            # topbarHTML() — hamburger, notifications, user menu
      page.js              # pageHeaderHTML(), appShellHTML() — assembles sidebar + topbar + #page-content, for any navGroups config
      modal.js             # modalHTML(), openModal(), closeModal(), initModals(), confirmDialog()
      toast.js             # showToast()
      auth-shell.js        # authShellHTML() — brand + card layout for auth pages
      auth-status.js       # statusContentHTML() — icon+message body for status-only pages
      form-field.js        # textFieldHTML(), selectFieldHTML(), field-error helpers, isValidEmail(), setSubmitting()
      password-field.js    # passwordFieldHTML(), initPasswordToggles()
      otp-input.js         # codeInputHTML(), initCodeInputs(), getCodeValue()
      stat-card.js         # statCardHTML() — KPI tile with optional trend indicator
      progress-widget.js   # progressRowHTML(), progressCardHTML() — CPU/Memory-style gauges
      activity-feed.js     # activityFeedHTML() — Recent Activity list
      timeline-chart.js    # timelineChartHTML() — hand-rolled SVG bar chart, no charting lib
      search-bar.js        # searchBarHTML()
      data-table.js        # createDataTable() — search/sort/filter/paginate/bulk-select/empty/loading
      resource-list-item.js # resourceListItemHTML(), resourceListCardHTML() — shared row layout for devices/sessions lists
      toggle-switch.js     # toggleSwitchHTML() — on/off switch for settings pages
      public-nav.js        # publicNavHTML() — top nav for the landing page and docs, shared
    pages/
      admin/
        dashboard.js        # /admin/dashboard.html — shell + Dashboard Overview widgets
        users.js             # /admin/users.html — shell + createDataTable() instance
        devices.js           # /admin/devices.html — org-wide device fleet table
        sessions.js          # /admin/sessions.html — org-wide active session table
        alerts.js            # /admin/alerts.html — severity/status table, bulk resolve
        threats.js           # /admin/threats.html — severity/status table, bulk mitigate
        activity-logs.js     # /admin/activity-logs.html — audit trail with the date-range filter
        network-monitoring.js # /admin/network-monitoring.html — widgets + endpoint list
        anomaly-detection.js  # /admin/anomaly-detection.html — widgets + flagged-anomaly table
        reports.js            # /admin/reports.html — table + simulated "Generate report" flow
        roles-permissions.js # /admin/roles-permissions.html — role table + permissions-viewer modal
        settings.js          # /admin/settings.html — platform config forms, no table
      account/
        overview.js          # /account/index.html — quick stats + links into the rest of the area
        profile.js           # /account/profile.html — shell + profile view/edit
        devices.js            # /account/devices.html — My Devices list
        sessions.js           # /account/sessions.html — My Sessions list
        notification-settings.js # /account/notification-settings.html — toggle preferences
      auth/
        login.js, forgot-password.js, reset-password.js, verify-device.js,
        two-factor.js, session-expired.js, unauthorized.js, access-denied.js
      landing.js            # /index.html — public landing page
      docs.js               # /docs.html — project overview + page directory
admin/
  dashboard.html, users.html, devices.html, sessions.html, alerts.html, threats.html,
  activity-logs.html, network-monitoring.html, anomaly-detection.html, reports.html,
  roles-permissions.html, settings.html
account/
  index.html, profile.html, devices.html, sessions.html, notification-settings.html
auth/
  login.html, forgot-password.html, reset-password.html, verify-device.html,
  two-factor.html, session-expired.html, unauthorized.html, access-denied.html
index.html            # public landing page (see "Areas" above)
docs.html              # project overview / page directory (see "Areas" above)
```

Every page is one self-contained file: it imports `main.css`, mounts the shell with its own nav config, mounts its own content, and self-executes at the bottom. No shared entry point, no router — this matches the vanilla JS + jQuery stack. Components are plain functions that return HTML strings (`xHTML(opts)`), plus a small `initX()` behavior wire-up where needed (dismiss, loading state, focus trap). Keep new components and pages in this same shape.

## Design tokens (`src/styles/tokens.css`)

- **Radius:** 10px, globally. Always use the `rounded-lg` utility — every button, card, input, table, modal, dropdown, badge, and alert should use it and nothing else. Any other `rounded-*` in a PR is worth a second look.
- **Color:** Indigo (`primary-*`) is the only accent, used sparingly — active nav, primary buttons, key actions, charts, focus rings. Everything else is `neutral-*` (a slightly cool gray, not pure gray). Status colors (`success`, `warning`, `critical`, `info`) are desaturated on purpose so they read as instrumentation, not decoration.
- **Shadows:** near-flat (`--shadow-subtle`, `--shadow-overlay`). Sections are separated with 1px `neutral-200` borders, not elevation. `--shadow-overlay` is reserved for things that must detach from the page (modals, dropdowns, popovers).
- **Font:** Inter, self-hosted via `@fontsource/inter` — no Google Fonts CDN link.

## Icons

Heroicons is installed as an npm package, not a CDN or icon font. `src/js/utils/icons.js` inlines the raw SVG (via Vite's `import.meta.glob`) so icons inherit `currentColor` and can be sized with Tailwind classes.

```js
import { icon } from './js/utils/icons.js'
$('#slot').html(await icon('shield-check'))               // 24px outline (default)
$('#slot').html(await icon('bell', { variant: 'solid', size: 20 }))
```

Bundled sets: `24/outline`, `24/solid`, `20/solid`. Add another glob in `icons.js` if a new set is genuinely needed.

## Layout (sidebar + topbar + page container)

- **Sidebar** (`sidebar.js`) — grouped nav driven entirely by whichever nav config the page passes in (`ADMIN_NAV_GROUPS` or `ACCOUNT_NAV_GROUPS`). Desktop collapse state persists in `localStorage`. Below the `lg` breakpoint it becomes an off-canvas drawer.
- **Topbar** (`topbar.js`) — mobile menu button, notifications, user menu (Profile → `/account/profile.html`, Settings, Log out). Log out calls `POST /auth/logout` for real and redirects regardless of whether it succeeds — wired once at module scope, not per-page, so every page that mounts the shell gets it automatically (see the comment in `topbar.js` if adding something similar).
- **Page container** (`page.js`) — `appShellHTML({ navGroups, currentPage, pageTitle })` builds the sidebar + topbar + a `#page-content` mount point; `pageHeaderHTML()` renders the breadcrumb/title/description/actions row every page should open with.

## Modal + toast system

- **Modal** (`modal.js`) — `modalHTML()` for declarative modals; `openModal(id)` / `closeModal(id)` with focus management. `initModals()` wires close/backdrop/Escape globally — call it once per page.
- **Confirmation dialogs** (`confirmDialog()`) — for destructive actions. Builds and injects its own modal, returns a promise:

  ```js
  const ok = await confirmDialog({
    title: 'Revoke access?',
    message: 'This user will be signed out of every session immediately.',
    confirmLabel: 'Revoke access',
    tone: 'danger',
  })
  if (ok) { /* proceed */ }
  ```

- **Toasts** (`toast.js`) — `showToast({ level, title, message, duration })`. `duration: 0` for something that must be dismissed manually.

## Auth screens

| Page | URL | Behavior |
|---|---|---|
| Login | `/auth/login.html` | Email + password → Device check / 2FA check redirection based on requirements |
| Forgot Password | `/auth/forgot-password.html` | Email form → "check your email" confirmation state |
| Reset Password | `/auth/reset-password.html` | New/confirm password with a live strength checklist |
| Verify Device | `/auth/verify-device.html` | 6-digit OTP code, resend cooldown → redirect to 2FA or home |
| Two-Factor Authentication | `/auth/two-factor.html` | 6-digit authenticator code → complete session and redirect to role home |
| Session Expired | `/auth/session-expired.html` | Message + "Sign in again" |
| Unauthorized | `/auth/unauthorized.html` | Not signed in → "Go to sign in" |
| Access Denied | `/auth/access-denied.html` | Insufficient permissions → back to the dashboard |

Shared building blocks: `auth-shell.js`, `auth-status.js`, `form-field.js`, `password-field.js`, `otp-input.js`. **None of these pages call a real API** — every "submit" is a `setTimeout` standing in for a request, clearly commented in each file.

## Admin: Dashboard Overview (`/admin/dashboard.html`)

**Live** — `GET /admin/dashboard`, envelope-wrapped (see API Client above). Four stat cards (Total Users, Active Users, Suspended Users, Locked Accounts) — that's the entire confirmed `stats` shape; there's no threat count, security score, or network status backend-side, and the page doesn't invent any. `resources` and `detectionTimeline` are confirmed `null` (neither is implemented backend-side yet) — each renders a small placeholder card saying so rather than either hiding the section or showing fake numbers. Recent Activity maps real audit events (`eventType` like `LOGIN_SUCCESS`/`LOGIN_FAILED`/`ACCOUNT_LOCKED`/`ACCOUNT_UNLOCKED`) to an icon and tone, with an unstyled fallback for any `eventType` the frontend doesn't recognize yet, and a relative-time formatter for `createdAt` (which comes back timezone-less — see the comment in `dashboard.js` for the caveat that implies). "Refresh" re-fetches everything; its click handler is delegated on `#page-content` rather than bound to the button directly, since the button itself gets recreated on every refresh.

`js/config/mock-dashboard-data.js` is no longer used by this page — it's kept updated as documentation of the confirmed real response shape, since the shape turned out to be very different from what was originally guessed at (see the comment at the top of that file).

## Tables + Admin: Users (`/admin/users.html`)

`data-table.js` is a generic, client-side data table: debounced search, sortable columns, single-select filter dropdowns, pagination, bulk row selection with a contextual action bar, an optional per-row actions menu, and empty/loading states.

```js
import { createDataTable } from './js/components/data-table.js'

const table = await createDataTable({
  container: '#users-table',
  columns: [{ key: 'name', label: 'Name', sortable: true }],
  data: rows,
  rowKey: 'id',
  searchableKeys: ['name', 'email'],
  filters: [{ key: 'status', label: 'Status', options: ['Active', 'Suspended'] }],
  bulkActions: [{ label: 'Suspend selected', tone: 'danger', onClick: (selectedRows) => { /* ... */ } }],
  rowActionsHTML: (row) => `<button class="js-row-edit">Edit</button>`,
})

table.setData(newRows)   // swap the dataset (e.g. after a real fetch)
table.setLoading(true)   // shows skeleton rows while data is in flight
```

Filter dropdowns and row-action menus reuse the same `.js-dropdown` markup contract as the topbar, so `initDropdowns()` handles them automatically. **`/admin/users.html` is the one table on real data** — `GET /admin/users`, with row-level Suspend and bulk "Suspend selected" both calling real `PATCH` endpoints through `confirmDialog()` + `showToast()`, plus a row-level Unlock action (`PATCH /admin/users/{id}/unlock`) for any user with `status: "Locked"`. Every other table on the site is still `mock-*.js`.

**Filter types:** the default filter (`options: [...]`) is a single-select dropdown. Add `type: 'dateRange'` for a from/to date picker instead:

```js
filters: [
  { key: 'status', label: 'Status', options: ['Success', 'Failed'] },      // select (default)
  { key: 'timestamp', label: 'Date', type: 'dateRange' },                   // from/to date picker
]
```

For `dateRange`, the column's field must hold a real date the row can be compared against (an ISO string or anything `new Date(...)` parses) — it doesn't have to be what's displayed in the cell. `/admin/activity-logs.html` is the example: each row has both `timestamp` (real ISO datetime, used for sorting and the date-range filter) and `timestampDisplay` (the friendly string the `timestamp` column actually renders via its `render()` function). The date-range panel has its own Apply/Clear buttons rather than closing on a single click like the select-style filters, since picking a range is a two-field action — clicks inside that panel are stopped from bubbling to the global "click closes all dropdowns" handler so typing/picking a date doesn't dismiss it prematurely.

## Account: Overview (`/account/index.html`)

The landing page for the account area — four quick-stat cards (My Devices, Active Sessions, Two-Factor Auth status, Notifications On) built from the same `mock-account-security-data.js` / `mock-profile-data.js` / `mock-notification-preferences.js` the other account pages use, plus a card of links into Profile, My Devices, My Sessions, and Notification Settings. Nothing new here beyond `statCardHTML()` already built for the Admin Dashboard — reused as-is.

## Account: Profile (`/account/profile.html`)

One page, two states — a view mode and an inline edit mode toggled by the "Edit profile" button, rather than a separate edit-profile page. That keeps the two in sync by construction (same fields, same layout) instead of maintaining a duplicate form elsewhere. View mode shows the avatar (initials, since there's no photo upload backend yet — the camera button is a labeled placeholder), name, role, contact/work details, and a read-only two-factor status. Edit mode is a validated form (name and email required, matching `form-field.js`'s pattern from the auth screens) that saves back into an in-memory copy of the profile and shows a success toast — `js/config/mock-profile-data.js` is what a real PATCH request would replace.

## Account: My Devices, My Sessions, Notification Settings

- **My Devices** (`/account/devices.html`) and **My Sessions** (`/account/sessions.html`) both use `resource-list-item.js` (`resourceListItemHTML()` + `resourceListCardHTML()`) — a shared row layout (icon, title, meta line, optional badge, trailing action) rather than the full `data-table.js`. A person typically has a handful of devices/sessions, not hundreds, so search/sort/pagination would be more chrome than the content needs; the admin-wide device/session fleets use `data-table.js` instead (see below). Removing a device or signing out a session goes through `confirmDialog()` (danger tone) + `showToast()`, same pattern as everywhere else destructive actions happen. Sessions also has a bulk "Sign out all other sessions" action in the page header, hidden when there's nothing else to sign out of. Data: `mock-account-security-data.js`, with `isCurrent` marking the device/session in use right now.
- **Notification Settings** (`/account/notification-settings.html`) introduces `toggle-switch.js` (`toggleSwitchHTML()`) — a labeled on/off switch backed by a real checkbox for accessibility, styled as a track+thumb instead of a checkbox. Email and Push preference groups, one "Save preferences" button that commits every toggle at once (rather than saving per-toggle, so a person can review several changes before committing). Data: `mock-notification-preferences.js`.

**None of these three save anything real yet** — each has a clearly commented placeholder where the DELETE/PATCH request goes once the backend exists.

## Admin: Devices, Sessions

Org-wide fleets, both `createDataTable()` instances connected to **live backend endpoints** (`GET /admin/devices`, `PATCH /admin/devices/{id}`, `GET /admin/sessions`, and `DELETE /admin/sessions/{sessionId}`). 
- **Devices:** Displays dynamic device user agent information parsed on the fly into client-friendly OS and device icons, along with the device's actual IP address and status (Trusted, Blocked, or Pending). Users can trust or block specific devices.
- **Sessions:** Displays the authenticated users' active sessions. In compliance with security standards, the raw `sessionId` is visually masked and truncated. Sign-out requests are executed immediately but take effect when the target user initiates their next API request (triggering a 401). Bulk actions are executed in parallel across the respective row-level endpoints.

## Account: Devices, Sessions

Self-service security controls for the logged-in user, wired to **live backend endpoints** (`GET /account/devices`, `DELETE /account/devices/{id}`, `GET /account/sessions`, and `DELETE /account/sessions/{sessionId}`).
- **My Devices:** Shows the user's registered devices. The active device is identified by comparing `device.id` to the browser's persistent `ztp_device_id` (UUID), hiding the "Remove" action for the device currently in use. Non-active devices can be removed (revoking their trusted status).
- **My Sessions:** Lists active sessions for the logged-in account with masked Session IDs. The current session is flagged as active and cannot be individually terminated from the UI. Users can revoke other sessions individually or terminate all other sessions in bulk using the "Sign out all other sessions" action (which calls `DELETE /account/sessions` to sign out all sessions except the active one).

## Admin: Alerts, Threats

Two more `createDataTable()` instances, same shape as Devices/Sessions: severity/status badges, filters, bulk resolve/mitigate through `confirmDialog()` (mitigate asks for confirmation since marking a threat "Mitigated" is meant to follow actual remediation, not substitute for it — the dialog's message says so), per-row action that disappears once resolved (a plain `<span>` instead of a dropdown, since there's nothing left to do to a resolved alert). Data: `mock-alerts-data.js` (32 rows), `mock-threats-data.js` (24 rows).

## Admin: Activity Logs — the date-range filter in practice

The audit trail: Timestamp, User, Action, Resource, IP, Status, plus a "View details" row action that reuses the same single-stable-modal pattern as Roles & Permissions. No bulk actions or destructive row actions — it's a log, not something to mutate. This is the page the date-range filter (documented above, under Tables) was built for: filter by Status *and* by a Date range together, sortable by the real timestamp while displaying a friendly formatted one. Data: `mock-activity-logs-data.js` (60 rows spread across the last 30 days).

## Admin: Network Monitoring, Anomaly Detection

Both mix widgets with something else, rather than being pure dashboard-style or pure table-style:

- **Network Monitoring** — 4 stat cards (Uptime, Throughput In/Out, Latency) + a traffic timeline chart (`timelineChartHTML()`, same SVG approach as the Dashboard's Detection Timeline) + a Monitored Endpoints list using `resource-list-item.js` (a handful of endpoints, not hundreds — same reasoning as My Devices/My Sessions for why it's a list, not a table).
- **Anomaly Detection** — 4 stat cards (Detected Today, Detection Rate, Avg. Risk Score, Auto-Resolved) + a timeline chart + a `createDataTable()` of flagged anomalies (risk score rendered as a badge whose tone shifts neutral → warning → critical past 50/70), with Confirm/Dismiss row actions.

Data: `mock-network-monitoring-data.js`, `mock-anomaly-detection-data.js`.

## Admin: Reports

A `createDataTable()` of generated reports (Name, Type, Generated At/By, Status, Size) with a "Generate report" button in the page header. Clicking it inserts a new row with status "Processing" via `table.setData()`, then flips it to "Ready" after a delay to simulate the report finishing — the same in-memory-only pattern as everywhere else, just demonstrating that `setData()` works for insertions too, not only status edits. Data: `mock-reports-data.js`.

## Admin: Roles & Permissions

A `createDataTable()` of roles (Role, Description, Users, Permissions count) with a "View permissions" row action that opens a modal listing that role's permissions as a read-only checklist. The modal is built once per page load (`modalHTML()` appended to `#page-content`, `id="role-permissions-modal"`) and its body/title get swapped via jQuery before `openModal()` on each click, rather than building a fresh modal per role the way `confirmDialog()` does — there's only ever one permissions modal open at a time, so one stable element is simpler than the promise-per-call pattern. **The list is live** (`GET /admin/roles`, with a toast + empty table on failure). Editing the underlying permission matrix isn't built — that's a meaningfully bigger feature (which permissions exist, how they're grouped, what a diff/save flow looks like) than "view what a role can do," and wasn't asked for, even though `PATCH /admin/roles/{id}` exists backend-side and is ready whenever that editor gets built.

## Admin: Settings

Pure forms, no table — General (org name, support email) and Security Policy (four `toggleSwitchHTML()` toggles + a `selectFieldHTML()` session-timeout dropdown, a new addition to `form-field.js` alongside `textFieldHTML()`), one "Save settings" button for the whole page. Same validated-form pattern as the auth screens and Profile's edit mode. Data: `mock-platform-settings.js`.

## Landing (`/index.html`) and Docs (`/docs.html`)

The only two pages outside the three authenticated areas. Both use `public-nav.js` (brand mark, Docs link, Sign in button) instead of the sidebar/topbar shell — nobody's authenticated on either page.

- **Landing** is a hero ("Never trust. Always verify.") + a six-item "What ZTP monitors" feature grid, one per major capability already built (monitoring, threats, access, devices/sessions, logging, reporting). The status strip under the hero CTAs isn't invented marketing copy — it pulls real numbers out of `mock-dashboard-data.js` and `mock-network-monitoring-data.js` (security score, uptime, active users), the same values the actual Dashboard and Network Monitoring pages show, so the landing page can't drift out of sync with what the product actually displays.
- **Docs** is a project overview for anyone browsing the frontend: tech stack, the three areas explained in plain terms, and a full directory linking every page that exists (`PAGE_DIRECTORY` in `docs.js` — add a page there when a new one is built), plus an explicit callout that everything is placeholder data. It's the in-browser counterpart to this README, written for someone clicking around rather than reading source.

`buttonHTML()` gained an `href` option for this work — pass it and the function renders a real `<a>` with identical classes instead of a `<button>`, so a "Sign in" call-to-action doesn't end up as an invalid button-nested-in-anchor.

## What's next

Every page named in the system prompt now exists: all 8 auth screens, all 12 `/admin/*` pages, the `/account/*` area (Overview, Profile, My Devices, My Sessions, Notification Settings), and a landing page + docs to tie it together. What's genuinely left is depth, not breadth — real API calls in place of every `mock-*.js` file and commented placeholder, the role-permission *editing* flow (noted above), and real routing/session handling in place of the landing page's static "Sign in" link (noted under "Areas"). None of that needs new building blocks; it's wiring the pages already built to a real backend.
