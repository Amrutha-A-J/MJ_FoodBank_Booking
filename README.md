# MJ FoodBank Booking

Booking and volunteer management for the Moose Jaw Food Bank. This monorepo includes:

- [MJ_FB_Backend](MJ_FB_Backend) – Node.js/Express API.
- [MJ_FB_Frontend](MJ_FB_Frontend) – React single-page app.
- [docs](docs/) with setup notes and a [Timesheets guide](docs/timesheets.md).
  - Leave request API under `/api/v1/leave/requests` for staff leave, supporting
  vacation, sick, or personal requests (one personal day per quarter) with optional reasons.
  Admins can view requests for a specific staff member via
  `/api/v1/timesheets/leave-requests/:staffId` (using the staff ID, not the timesheet ID).
- Password fields include a visibility toggle so users can verify what they type.
- Booking confirmation emails include links to public pages for cancelling or rescheduling
  bookings at `/cancel/:token` and `/reschedule/:token`.
- Donor Management → Mail Lists groups monetary donors into tiers ($1–$100, $101–$500,
  $501–$1,000, $1,001–$10,000, $10,001–$30,000) and lets staff email each group a
  summary of families, children, and pounds served. Month defaults to the previous month
  when unspecified.
- Donor Management → Donors lists existing donors and lets staff edit donor details.
- Admin Settings → Donor tab manages test email addresses used for Mail Lists
  testing, and the Mail Lists page provides a Send test emails button to email
  each tier to the configured addresses.
- Admin Settings → Maintenance lets admins schedule downtime and enable maintenance mode, displaying upcoming or active maintenance notices to clients. During downtime, visitors see an overlay with the Moose Jaw Food Bank logo. Staff can still sign in during maintenance to turn it off, but all other logins and API requests return a 503. Ops can override the database toggle by setting `MAINTENANCE_MODE` to `true` (or `false` to force normal operation) and listing comma-separated IPs in `MAINTENANCE_ALLOW_IPS` to keep trusted addresses online during a forced outage.
- Public cancel and reschedule pages include the client bottom navigation for quick access
  to other sections.
- Email templates display times in 12-hour AM/PM format.
- Sunshine bag recipients are tracked separately and excluded from total client counts.
  - Pantry stats can be recomputed for all historical data via `POST /api/v1/pantry-aggregations/rebuild`.
  - Past blocked slots are cleared nightly, with `/api/v1/blocked-slots/cleanup` available for admins to trigger a manual cleanup.
- Clients and volunteers see blocked slots as fully booked; reasons are visible only to staff.
- Staff deliveries management queue tracks each delivery request from submission through completion, including status updates (Pending, Approved, Scheduled, Completed, Cancelled), scheduled drop-off times, and completion notes mirrored in the client Delivery History.
- All users sign in at a consolidated `/login` page using their client ID or email and password. The page offers contact and password reset guidance and notes that staff and volunteers also sign in here. Community partners now coordinate bookings by contacting staff instead of logging in directly.
- The login page automatically surfaces passkey prompts via WebAuthn on supported devices.
- A privacy notice prompts for consent after login; once agreed, it isn't shown again.
- The privacy policy page includes contact information for account deletion requests and is accessible without logging in; a link is available on the login screen and in the profile menu.
- Password reset dialog prompts clients to enter their client ID and explains that a reset link will be emailed.
- Input fields feature larger touch targets on mobile devices for easier tapping.
- Staff dashboards include a Volunteer Coverage card; click a role to see which volunteers are on duty.
- Staff dashboard charts pull pantry monthly aggregates to show total orders and adult/child breakdowns.

- Staff with `aggregations` or `donor_management` access see an **Aggregations** navigation item with **Pantry Aggregations** and **Warehouse Aggregations** pages for reporting.

Staff can reach **Timesheets** at `/timesheet` and **Leave Management** at
`/leave-requests` from the profile menu once logged in. Admin users also see
**Timesheets** at `/admin/timesheet` and **Leave Requests** at
`/admin/leave-requests` under the Admin menu for reviewing submissions. Admins can
retrieve any staff timesheet's day entries through the API at
`GET /timesheets/:id/days` and list periods via `GET /timesheets`. The interface
shows the current and next four pay periods so staff can enter hours in advance.

## Staff Access Roles

Staff accounts may include any of the following access roles:

- `pantry`
- `volunteer_management`
- `warehouse`
- `admin`
- `donor_management`
- `payroll_management`
- `aggregations`
- `donation_entry` – volunteer-only access for the warehouse donation log

This repository uses Git submodules for the backend and frontend components. After cloning, pull in the submodules and install their dependencies.

## Volunteer Creation

Create volunteers from the Volunteers page. Check **Online Access** to send an email invitation; the email field becomes required when enabled.
Volunteers sign in with their email address instead of a username, and volunteer emails must be unique, though providing an email remains optional for volunteers without online access.

## Node Version

Requires **Node.js 22+**. The repo includes a `.nvmrc` file and installation is engine‑strict, so use the pinned version:

```bash
nvm install   # installs the version listed in .nvmrc
nvm use
```

Run all backend and frontend tests on this runtime to match production behavior.

To verify both backend and frontend compile successfully, run the root build script:

```bash
npm run build
```

To compile the backend for production, run:

```bash
cd MJ_FB_Backend
npm run build
```

The generated JavaScript lands in `MJ_FB_Backend/dist/` and the script prints a confirmation when complete.

## Database SSL

The backend trusts the AWS RDS certificate chain stored at
`MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem`. Override this path with the
`PG_CA_CERT` environment variable if the bundle is located elsewhere. The server
logs an error and exits on startup if the bundle is missing. `PG_HOST` should
reference the Lightsail endpoint DNS name rather than an IP address so hostname
verification succeeds.

## Database Maintenance

- Configure autovacuum thresholds so vacuum and analyze run proactively:
  ```sql
  ALTER DATABASE mj_fb_db
    SET autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_analyze_scale_factor = 0.05,
        autovacuum_vacuum_threshold = 50,
        autovacuum_analyze_threshold = 50;
  ```
- A nightly backend job runs `VACUUM (ANALYZE)` on frequently updated tables (`bookings`, `volunteer_bookings`, `email_queue`) at 1 AM Regina time.
- Plan quarterly `REINDEX` or [`pg_repack`](https://reorg.github.io/pg_repack/) runs for heavily updated tables such as `bookings` and `volunteer_bookings`.
- Monitor table bloat using `pg_stat_user_tables` or `pgstattuple` and log maintenance tasks in `mj_food_bank_deploy_ops_cheatsheet.md`.

## Timesheet and Leave Setup

Timesheet features require backend migrations, seeded pay periods, and email
configuration.

1. Run migrations:

```bash
cd MJ_FB_Backend
npm run migrate
```

2. Pay periods are seeded automatically on backend startup via the
   `seedPayPeriods` utility. A cron job runs every **Nov 30** to generate pay
   periods for the upcoming year. Seed a custom range manually if needed:

```bash
node src/utils/payPeriodSeeder.ts START_DATE END_DATE
```

3. Seed timesheets for active staff:

```bash
node src/utils/timesheetSeeder.ts
```

4. Configure Brevo email credentials and optional approver addresses in
   `MJ_FB_Backend/.env`:

```bash
BREVO_API_KEY=your_api_key
BREVO_FROM_EMAIL=noreply@example.com
BREVO_FROM_NAME="MJ Food Bank"
EMAIL_ENABLED=true # set to 'true' to send emails
EMAIL_QUEUE_MAX_AGE_DAYS=30 # remove stuck email jobs after this many days
EMAIL_QUEUE_WARNING_SIZE=100 # warn if queue exceeds this size
TIMESHEET_APPROVER_EMAILS=admin1@example.com,admin2@example.com # optional
```

Booking confirmation, reminder, and reschedule templates can surface "Add to Calendar" buttons by referencing
`{{ params.googleCalendarLink }}` and `{{ params.appleCalendarLink }}` in the Brevo templates.
The backend supplies these URLs automatically; no extra environment variables are required.
Ops alerts include the failing job or API route and are forwarded to a Telegram chat when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` are configured. When set, Telegram also receives a note whenever a client or volunteer creates, cancels, or reschedules a booking.
Calendar emails attach an `.ics` file. If `ICS_BASE_URL` is configured, `appleCalendarLink`
points to the hosted file; otherwise it falls back to a base64 `data:` URI.

Staff submit leave through `/api/v1/leave/requests` with `startDate`, `endDate`,
`type` (`vacation`, `sick`, or `personal` – limited to one personal day per quarter), and optional `reason`; admins approve or reject
via `/api/v1/leave/requests/:id/approve` and `/api/v1/leave/requests/:id/reject`.

Individuals who use the food bank are referred to as clients throughout the application.

The `clients` table uses `client_id` as its primary key. Do not reference an `id` column for clients; always use `client_id` in database queries and API responses.

The backend automatically runs any pending database migrations on startup and logs each applied migration name to the console.
All schema changes must be implemented via migrations in `MJ_FB_Backend/src/migrations`; do not edit `src/setupDatabase.ts` for schema updates.

## Contribution Guidelines

- Use Node.js 22 or later for development; the backend relies on the native `fetch` API.
- The frontend requires a live internet connection; offline caching or offline-first optimizations must not be added.
- Run the relevant backend and frontend test suites via `npm test` after making changes. Tests must be executed with `npm test` so `.env.test` files and `jest.setup.ts` load required environment variables and polyfills.

```bash
npm run test:backend   # backend tests
npm run test:frontend  # frontend tests
```

- Update `AGENTS.md` with new repository instructions.
- Reflect user-facing or setup changes in this `README.md`.
- Document new environment variables in this `README.md` and the relevant `.env.example` files when introducing them.
- Backend tests use `tests/setupTests.ts` to polyfill `global.fetch` with `undici` and mock the database. Environment variables come from `.env.test`, which Jest loads automatically. If you run a test file directly instead of through Jest, manually import `'../setupTests'` so these helpers are initialized.

## Features

- Appointment booking workflow for clients with automatic approval and rescheduling.
- Clients may book only in the current month, or for next month during the final week of this month. Staff booking from the pantry schedule is unrestricted by these date limits.
- Bookings support an optional **client note** field. Clients can add a note during booking, and staff see it in booking dialogs. Client notes are stored and returned via `/bookings` endpoints.
- Client visit records include an optional **staff note** field. Staff users automatically see these notes via `/bookings/history`; other roles never receive staff notes.
- Staff can create bookings for unregistered clients via `/bookings/new-client`; the email field is optional, so bookings can be created without an email address. Staff can list or delete these pending clients through `/new-clients` routes and the Client Management **New Clients** tab.
- Searching for a numeric client ID in Client Management that returns no results shows an **Add Client** shortcut that opens the Add tab with the ID prefilled.
- Volunteer role management and scheduling restricted to trained areas; volunteers can only book shifts in roles they are trained for.
- Staff can manage recurring volunteer shift series from the **Recurring Shifts** page under Volunteer Management.
- Only staff can update volunteer trained roles; volunteers may view but not modify their assigned roles from the dashboard.
- Daily reminder jobs queue emails for next-day bookings and volunteer shifts using the backend email queue. Each job now runs via `node-cron` at `0 9 * * *` Regina time and exposes start/stop functions.
- Booking confirmation and reminder emails include Cancel and Reschedule buttons so users can manage their appointments directly from the message.
- A nightly cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved bookings as `no_show`.
- A nightly volunteer no-show cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved volunteer bookings as `no_show` after `VOLUNTEER_NO_SHOW_HOURS` (default `24`) hours.
- Failures in these nightly cleanup jobs trigger alerts via Telegram when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` are set.
- A nightly retention job deletes `bookings` and `volunteer_bookings` older than one year and rolls their volunteer hours and counts into aggregate fields.
- A nightly token cleanup job runs at `0 3 * * *` Regina time to delete expired password setup and email verification tokens more than 10 days past `expires_at`.
- Milestone badge awards send a template-based thank-you card via email and expose the card link through the stats endpoint.
- Reusable Brevo email utility allows sending templated emails with custom properties and template IDs.
- Backend email queue retries failed sends with exponential backoff and persists jobs in an `email_queue` table so retries survive restarts. The maximum retries and initial delay are configurable.
- Accounts for clients, volunteers, and staff are created without passwords; a one-time setup link directs them to `/set-password` for initial password creation.
- After setting a password, users are redirected to the login page for their role.
- `POST /auth/resend-password-setup` reissues this link when the original token expires. Requests are rate limited by email or client ID.
 - Expired or invalid setup links display an error on the set password page and prompt users to request a new link.
- Volunteers see a random appreciation message on each login with a link to download their card when available.
- Volunteers also see rotating encouragement messages on the dashboard when no milestone is reached.
- Volunteer dashboard hides shifts already booked by the volunteer and shows detailed error messages from the server when requests fail.
- Conflicting volunteer shift requests return a 409 with both the attempted and existing shift details; resolve conflicts via `POST /volunteer-bookings/resolve-conflict` (body: `{ existingBookingId, keep, roleId?, date? }`; `roleId` and `date` are required only when keeping the new booking).
- Volunteer schedule prevents navigating to past dates and hides shifts that have already started.
- Volunteer schedule open slots include a **Sign Up** button for one‑tap booking.
- Staff assigning volunteers can override a full role via a confirmation prompt, which increases that slot's `max_volunteers`.
- Volunteer badges are calculated from activity and manually awardable. Manual awards are issued via `POST /volunteers/me/badges` and can be removed with `DELETE /volunteers/me/badges/:badgeCode`. `GET /volunteers/me/stats` returns earned badges along with lifetime hours, this month's hours, total completed shifts, and current streak. Only shifts marked as `completed` contribute to hours and shift totals; `approved` or `no_show` shifts are ignored. The endpoint also flags milestones at 5, 10, and 25 shifts so the dashboard can show a celebration banner.
- The stats endpoint now provides a milestone message and contribution totals (`familiesServed`, `poundsHandled`) along with current-month figures (`monthFamiliesServed`, `monthPoundsHandled`) so the dashboard can display appreciation.
- Volunteer leaderboard endpoint `GET /volunteer-stats/leaderboard` returns your rank and percentile.
  The volunteer dashboard shows “You're in the top X%!” based on this data.
- Staff can view top volunteers via `GET /volunteer-stats/ranking` with an optional
  `roleId` query parameter to filter by role.
- Staff can retrieve a no-show ranking via `GET /volunteer-stats/no-show-ranking` to highlight
  volunteers who frequently miss booked shifts. The volunteer management dashboard displays this ranking.
- Group volunteer stats endpoint `GET /volunteer-stats/group` aggregates total hours,
  weekly and monthly pounds handled, and distinct families served this month, returning
  current-month hours alongside a configurable goal for dashboard progress.
- Volunteer dashboard now highlights weekly pounds distributed, a progress gauge
  toward the monthly hours goal, a highlight of the month, and rotating
  appreciation quotes.
- Volunteer dashboard includes a line chart showing monthly shift counts and top role contributions to illustrate the contribution trend.
- Volunteer dashboard groups badges, lifetime hours, this month's hours, total shifts, and current streak into a single stats card.
- Volunteer search results display profile details, role editor, and booking history side by side in a card layout.
- Volunteer role assignment uses a simple dropdown without search capability.
- Volunteer bookings are auto-approved with no submitted state and appear immediately on schedules.
- Volunteer booking statuses include `completed`, and cancelling a booking now requires a reason.
- Volunteer interfaces show `completed` or `no_show`; submitting `visited` for a volunteer shift now returns `Use completed instead of visited for volunteer shifts`.
- Admins can manage volunteer master roles, sub-roles, and their shifts from the Settings page's Volunteer tab. Deleting a master role also removes its sub-roles and shifts. Deleting sub-roles and shifts now requires confirmation to avoid accidental removal. Sub-roles are created via a dedicated dialog that captures the sub-role name and initial shift, while additional shifts use a separate dialog.
- Staff can restore volunteer roles and shifts to their original defaults via `POST /volunteer-roles/restore` or the Settings page's Volunteer tab **Restore Original Roles & Shifts** button.
- Walk-in visit tracking (`clientVisits`) via [clientVisitController](MJ_FB_Backend/src/controllers/clientVisitController.ts).
- Staff can mark bookings as no-show or visited through `/bookings/:id/no-show` and `/bookings/:id/visited` endpoints.
- Walk-in bookings created via `/bookings/preapproved` are saved with status `approved` (the `preapproved` status has been removed).
- Staff can record visits directly from a booking in the pantry schedule. Selecting **Visited** in the booking dialog captures cart weights and creates the visit record before marking the booking visited.
- Adding a client visit automatically updates any approved booking for that client on the same date to `visited`.
- The Manage Booking dialog now displays the client's name, a link to their profile, and their visit count for the current month to assist staff decisions.
- Client booking history tables can filter bookings by `visited` and `no_show` statuses.
- Staff can delete visit records from booking history if they were recorded in error; clients cannot remove visits.
- Booking requests are automatically approved; the submitted state has been removed.
- Booking confirmations display "Shift booked"; the volunteer dashboard shows only approved bookings.
- Booking confirmation dialogs prefill notes from the user's profile when available.
- Booking history endpoint `/bookings/history` accepts `includeVisits=true` to include walk-in visits in results.
- When `includeStaffNotes=true` or the requester is staff, `/bookings/history` returns both `client_note` and `staff_note` for each entry.
- Staff can supply `clientIds`, `limit`, and `offset` to `/bookings/history` for multi-client, paginated booking history.
- Staff interfaces can list bookings for multiple linked clients via `/bookings?clientIds=1,2`.
- **Volunteer Recurring Bookings** let volunteers schedule repeating shifts with start and end dates, choose daily, weekly, or weekday patterns, and cancel individual occurrences or the remaining series.
- Staff can create recurring volunteer booking series for volunteers via `POST /volunteer-bookings/recurring/staff` and list active series with `GET /volunteer-bookings/recurring/volunteer/:volunteer_id`.
- Recurring volunteer bookings and recurring blocked slots handled by [volunteerBookingController](MJ_FB_Backend/src/controllers/volunteer/volunteerBookingController.ts) and [recurringBlockedSlots routes](MJ_FB_Backend/src/routes/recurringBlockedSlots.ts). Volunteers can create new series and manage existing ones from separate tabs on the **Recurring Bookings** page.
- Donor and event management modules ([donorController](MJ_FB_Backend/src/controllers/donorController.ts), [eventController](MJ_FB_Backend/src/controllers/eventController.ts)) with multi-day events supported via start and end dates.
- Donation management pages for recording monetary donations require staff to have donor_management or admin access.
- Events are visible to all staff by default; the former "Staff Involved" selector has been removed.
- Self-service client registration with email OTP verification (currently disabled pending further testing).
- Warehouse management pages for donations, surplus, pig pound, and exports using `write-excel-file`.
- Staff can set a cart tare value and a single maximum booking capacity applied to all pantry time slots through the Admin → Settings → Pantry tab or `PUT /slots/capacity`.
- Bread and can surplus weight multipliers are configurable via the Admin → Settings → Warehouse tab.
- Volunteer roles and shifts are managed through the Admin → Settings → Volunteer tab.
- `/volunteer-roles` now returns each role with `id` representing the role ID (the `role_id` field has been removed).
- Creating volunteer role slots (`POST /volunteer-roles`) accepts either an existing `roleId` or a new `name` with `categoryId`.
- Volunteer role start and end times are selected via a native time picker and stored as `HH:MM:SS`.
- Listing volunteer roles (`GET /volunteer-roles`) accepts `includeInactive=true` to return inactive shifts.
- Slot listing endpoint `/slots` (accessible to shoppers, delivery, staff, and volunteer users) returns an empty array and 200 status on holidays. Each slot includes an `overbooked` flag when approved bookings exceed `max_capacity`, and the `available` count never goes below zero.
- Staff can add or remove holidays from the Manage Availability page, which persists changes to the backend.
- Booking interfaces retrieve holiday listings via `GET /holidays` so public pages can disable those dates.

## Clone and initialize submodules

```bash
git clone <repository-url>
cd MJ_FoodBank_Booking
git submodule update --init --recursive
```

## Backend setup (`MJ_FB_Backend`)

Prerequisites:

- Node.js 22 or later and npm (uses the built-in `fetch`; earlier versions are not supported)

Install and run:

```bash
cd MJ_FB_Backend
npm install
npm start   # or npm run dev
```

The database schema is managed via TypeScript migrations in `src/migrations`; run `npm run migrate` to apply them. The command logs each executed migration or any failures to the console so you can track what ran.

### Environment variables

Create a `.env` file in `MJ_FB_Backend` with the following variables. The server fails to start if any required variable is missing.

| Variable                   | Description                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PG_HOST`                  | PostgreSQL host                                                                                                                           |
| `PG_PORT`                  | PostgreSQL port                                                                                                                           |
| `PG_POOL_MAX`              | Max connections in the PostgreSQL pool (default 10)
                                         |
| `PG_USER`                  | PostgreSQL username                                                                                                                       |
| `PG_PASSWORD`              | PostgreSQL password                                                                                                                       |
| `PG_DATABASE`              | PostgreSQL database name                                                                                                                  |
| `JWT_SECRET`               | Secret used to sign JWT tokens for clients, staff, and volunteers. Generate a strong random value, e.g., `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET`       | Secret used to sign refresh JWT tokens for all roles. Use a different strong value from `JWT_SECRET`.                                     |
| `FRONTEND_ORIGIN`          | Allowed origins for CORS and base URL for password setup links (comma separated; empty entries are ignored)                               |
| `PORT`                     | Port for the backend server (defaults to 4000)                                                                                            |
| `BREVO_API_KEY`            | Brevo API key for transactional emails                                                                                                    |
| `BREVO_FROM_EMAIL`         | Email address used as the sender                                                                                                          |
| `BREVO_FROM_NAME`          | Optional sender name displayed in emails                                                                                                  |
| `ICS_BASE_URL`             | Base URL where generated ICS files are hosted (optional; falls back to data URIs)                                                         |
| `EMAIL_ENABLED`            | Set to 'true' to enable email sending (default false)                                                                                     |
| `EMAIL_QUEUE_MAX_RETRIES`  | Max retry attempts for failed email jobs (default 5)                                                                                      |
| `EMAIL_QUEUE_BACKOFF_MS`   | Initial backoff delay in ms for email retries (default 1000)                                                                              |
| `EMAIL_QUEUE_MAX_AGE_DAYS` | Remove pending email jobs older than this many days (default 30)                                                                          |
| `EMAIL_QUEUE_WARNING_SIZE` | Log a warning if the email queue exceeds this size (default 100)                                                                          |
| `DELIVERY_MONTHLY_ORDER_LIMIT` | Maximum delivery orders allowed per client each month (default 2, max 5) |
                                          |
| `TELEGRAM_BOT_TOKEN`       | Telegram bot token used for ops alerts (optional) |
| `TELEGRAM_ALERT_CHAT_ID`   | Telegram chat ID that receives ops alerts (optional) |

| Template reference                           | Purpose                                       | Params                                                                                    |
| -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `PASSWORD_SETUP_TEMPLATE_ID`                 | Account invitations and password reset emails | `link`, `token`, `clientId`, `role`, `loginLink`                                           |
| `BOOKING_CONFIRMATION_TEMPLATE_ID`           | Booking approval confirmations for clients    | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `BOOKING_REMINDER_TEMPLATE_ID`               | Next-day booking reminders for clients        | `body`, `cancelLink`, `rescheduleLink`, `type`                                            |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Volunteer shift confirmation emails           | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID`     | Volunteer shift reminder emails               | `body`, `cancelLink`, `rescheduleLink`, `type`                                            |
| `CLIENT_RESCHEDULE_TEMPLATE_ID`              | Booking reschedule notifications for clients  | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `type`        |
| `VOLUNTEER_RESCHEDULE_TEMPLATE_ID`           | Volunteer shift reschedule emails             | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `type`        |
| `DELIVERY_REQUEST_TEMPLATE_ID`               | Delivery request notifications for staff      | `orderId`, `clientId`, `address`, `phone`, `email`, `itemList`, `createdAt`               |
| `DONOR_TEMPLATE_ID_1_100`                    | Monetary donor emails for $1–$100             | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year`                                   |
| `DONOR_TEMPLATE_ID_101_500`                  | Monetary donor emails for $101–$500           | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year`                                   |
| `DONOR_TEMPLATE_ID_501_1000`                 | Monetary donor emails for $501–$1,000         | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year`                                   |
| `DONOR_TEMPLATE_ID_1001_10000`               | Monetary donor emails for $1,001–$10,000      | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year`                                   |
| `DONOR_TEMPLATE_ID_10001_30000`              | Monetary donor emails for $10,001–$30,000     | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year`                                   |

Cancellation, no-show, and volunteer booking notification emails are no longer sent.

See [docs/emailTemplates.md](docs/emailTemplates.md) for detailed usage notes.

Booking confirmation and reminder email bodies include the weekday and time for clarity.

| `PASSWORD_SETUP_TEMPLATE_ID` | Brevo template ID for invitation and password setup emails (default 6) |
| `BOOKING_CONFIRMATION_TEMPLATE_ID` | Brevo template ID for booking confirmation emails |
| `BOOKING_REMINDER_TEMPLATE_ID` | Brevo template ID for booking reminder emails |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Brevo template ID for volunteer booking confirmations |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID` | Brevo template ID for volunteer shift reminder emails |
| `CLIENT_RESCHEDULE_TEMPLATE_ID` | Brevo template ID for client reschedule emails (default 10) |
| `VOLUNTEER_RESCHEDULE_TEMPLATE_ID` | Brevo template ID for volunteer reschedule emails (default 10) |
| `DELIVERY_REQUEST_TEMPLATE_ID` | Brevo template ID for delivery request notifications (default 16) |
| `DONOR_TEMPLATE_ID_1_100` | Brevo template ID for $1–$100 donor emails (default 11) |
| `DONOR_TEMPLATE_ID_101_500` | Brevo template ID for $101–$500 donor emails (default 12) |
| `DONOR_TEMPLATE_ID_501_1000` | Brevo template ID for $501–$1,000 donor emails (default 13) |
| `DONOR_TEMPLATE_ID_1001_10000` | Brevo template ID for $1,001–$10,000 donor emails (default 14) |
| `DONOR_TEMPLATE_ID_10001_30000` | Brevo template ID for $10,001–$30,000 donor emails (default 15) |
| `PASSWORD_SETUP_TOKEN_TTL_HOURS` | Hours until password setup tokens expire (default 24) |

### Invitation flow

New clients, volunteers, and staff are created without passwords. The backend generates a one-time token and emails a setup link using the Brevo template defined by `PASSWORD_SETUP_TEMPLATE_ID`. The email notes the recipient's role and includes a direct login link. The setup link points to `/set-password` on the first origin listed in `FRONTEND_ORIGIN`.
After setting a password, users are redirected to the login page for their role.

Community partners no longer receive dedicated logins; staff manage partner-assist bookings using the Harvest Pantry tools.

### Password Requirements

All API endpoints that create or change passwords enforce the following rules:
- Minimum length of 8 characters
- Must include uppercase, lowercase, and special characters
Requests with passwords that do not meet these requirements are rejected before hashing.

You can generate a secure `JWT_SECRET` with:

```bash
openssl rand -hex 32
````

**Production note:** The backend issues cookies with the `secure` flag when `NODE_ENV` is not `development`. Ensure that your production deployment uses HTTPS so these cookies are transmitted to clients.

## Frontend setup (`MJ_FB_Frontend`)

Prerequisites:

- Node.js 22 or later and npm

Install and run:

```bash
cd MJ_FB_Frontend
npm install
npm start   # or npm run dev
```

### Environment variables

The frontend requires `VITE_API_BASE` to point to the backend API. Create a `.env` file in `MJ_FB_Frontend` with either a relative or absolute URL:

```
VITE_API_BASE=/api/v1
```

or

```
VITE_API_BASE=http://localhost:4000/api/v1
```

The build will fail if this variable is missing.


Refer to the submodule repositories for detailed configuration and environment variables.

The backend surplus tracking feature uses two optional environment variables to
set default multipliers; values are editable in the Admin → Settings → Warehouse tab
and cached on the server:

- `BREAD_WEIGHT_MULTIPLIER` (default `10`)
- `CANS_WEIGHT_MULTIPLIER` (default `20`)

The volunteer no-show cleanup job waits `VOLUNTEER_NO_SHOW_HOURS` (default `24`) hours after a shift before marking it as `no_show`.
A nightly retention job purges `bookings` and `volunteer_bookings` older than one year and aggregates volunteer statistics.
A daily database bloat monitor job warns when `pg_stat_user_tables.n_dead_tup` exceeds `VACUUM_ALERT_DEAD_ROWS_THRESHOLD` (default `5000`).

### Frontend features

- Pages are organized into feature-based directories (e.g., booking, staff, volunteer-management, warehouse-management).
- Profile pages provide a button to email a password reset link instead of changing passwords directly.
- Profile pages let clients and volunteers opt in or out of email reminders.
- A shared dashboard component lives in `src/components/dashboard`.
- Staff dashboard dates display weekday, month, day, and year (e.g., 'Tue, Jan 2, 2024').
- Staff dashboard includes a pantry visit trend line chart showing monthly totals for clients, adults, and children.
- Includes a reusable `FeedbackSnackbar` component for concise user notifications.
- Volunteers see an Install App button on their first visit to volunteer pages if the app isn't already installed. An onboarding modal explains offline benefits, and installs are tracked. On Android, tapping the button shows Chrome's install prompt; iOS users should use Safari's **Add to Home Screen**.
- Client and volunteer dashboards display onboarding tips on first visit and store a local flag to avoid repeat prompts.
- An Install App button appears when the app is installable and not already installed. On Android, the button opens Chrome's install prompt; iOS users should use Safari's **Add to Home Screen**.
- A Workbox service worker caches built assets plus schedule, booking history, and profile API responses, provides an offline fallback page, and queues offline booking actions for background sync.
- Booking confirmations include links to add appointments to Google Calendar or download an ICS file.
- Warehouse dashboard aggregates donations and shipments in real time, so manual rebuilds are no longer needed.
- Sunshine bag, surplus, pig pound, and outgoing donation logs roll up into monthly summary tables, and raw log entries older than one year are deleted each Jan 31.
- Warehouse Aggregations page provides donor and yearly totals, supports exporting them via `/warehouse-overall/export`, and lets staff manually insert monthly totals for donors and overall statistics.
- Page and form titles render in uppercase with a lighter font weight for clarity.
- Admin staff creation page provides a link back to the staff list for easier navigation.
- Admin navigation includes a Settings page with Pantry, Warehouse, and Volunteer tabs.
- The Settings page's Pantry tab lets staff configure a cart tare value and one max booking capacity used for all pantry times.
- Pantry schedule cells use color coding: rgb(228,241,228) for approved, rgb(255, 200, 200) for no-show, rgb(111,146,113) for visited, and the theme's warning light for capacity exceeded.
- `/slots/range` returns 90 days of slot availability by default so the pantry schedule can load the next three months.
- Filled pantry schedule slots display the client's ID in parentheses, or show `[NEW CLIENT] Name` when booked for an unregistered individual.
- Staff can add existing clients to the app from the pantry schedule's **Assign User** modal by entering a client ID and choosing **Add existing client to the app**, which creates a shopper without online access and assigns the slot.
- Pantry and volunteer schedule pages present a mobile-friendly card layout on extra-small screens.
- Pantry and volunteer schedules include a Today button and a date picker for jumping directly to specific days.
- Volunteer schedule shows Moose Jaw Food Bank as closed on weekends and holidays with a reason, while Gardening and Special Events roles remain available daily.
- Font sizes on mobile screens have been slightly increased for better readability.
- Wednesdays include an additional 6:30–7:00 PM pantry slot.
- Staff manage partner-assisted bookings from the Harvest Pantry tools. The staff-only Add Client tab includes partner search, a client list with removal confirmations, and reveals results only after a partner is selected.
- Partner navigation pages have been retired; staff create, cancel, and review partner appointments on behalf of the clients.
- Staff can enter pay period timesheets with daily hour categories, request vacation leave, and submit periods for approval with admin review and processing.
- Staff can delete client and volunteer accounts from the Client Management and Volunteer Management pages.
- Pantry pages include quick links for Pantry Schedule, Record a Visit, and Search Client.
- Warehouse pages include quick links for Dashboard, Donation Log, Track Surplus, Track Pigpound, Track Outgoing Donations, Aggregations, and Exports.
- Volunteer pages include quick links for Search Volunteer, Volunteer Schedule, Daily Bookings, and Ranking.
- Volunteer Management includes a Volunteer Ranking tab showing top volunteers overall and by department.
- Donation Log lists donations for the selected month using a month picker, defaulting to the current month, and allows editing, deleting, and searching entries by donor email, name, or amount.
- Pantry Visits page includes a search field to filter visits by client name or ID.
- Pantry Visits can log daily sunshine bag weights, shown in the summary above the visit table.
- Anonymous Pantry Visits show "(ANONYMOUS)" after the client ID and their family size is excluded from summary counts.
- Pantry Visits reject attempts to record more than one visit per client on the same day.
- Pantry Visits allow selecting any date to view visits beyond the current week.
- `GET /client-visits/stats?days=n` aggregates daily visit totals for the past `n` days (default 30) returning `{ date, total, adults, children }`.

## Deploying to Azure

The repository includes Dockerfiles for both the backend and frontend so the application can be containerized and run in Azure services such as Azure Web App for Containers or Azure Container Apps.

1. Build and push the images to an Azure Container Registry:

```bash
# Backend
cd MJ_FB_Backend
docker build -t <registry>.azurecr.io/mjfb-backend .
docker push <registry>.azurecr.io/mjfb-backend

# Frontend
cd ../MJ_FB_Frontend
docker build -t <registry>.azurecr.io/mjfb-frontend .
docker push <registry>.azurecr.io/mjfb-frontend
```

2. Create Azure resources (Web App or Container App) pointing to the images.

3. Configure the environment variables in the Azure portal using the provided `.env.example` files. Ensure `JWT_SECRET` is set to a strong value.

This setup prepares the project so it can be hosted on Azure with containerized services.
