# Backend Development Guide

## Testing

- Run `npm test` from the `MJ_FB_Backend` directory for backend changes.
- Always run tests through `npm test` so `.env.test` and `tests/setupTests.ts` load environment variables, polyfill `global.fetch` with `undici`, and mock the database.
- Tests for invitation and password setup flows live in `tests/passwordResetFlow.test.ts`; run `npm test tests/passwordResetFlow.test.ts` when working on these features.
- To customize the mocked database in backend tests, import `../tests/utils/mockDb`, which mocks `../src/db` and exports the mocked `pool` for custom query behavior.
- Calendar link utilities live in `src/utils/calendarLinks.ts`; ensure tests in `tests/calendarLinks.test.ts` cover changes.


## Environment

- Requires Node.js 22+ for native `fetch`; development is pinned via `.nvmrc`, and `.npmrc` sets `engine-strict=true` to prevent using other Node versions. GitHub Actions reads `.nvmrc` to keep CI builds and tests on the same runtime.
- API routes are versioned under `/api/v1`; requests to `/api` are redirected.
- The `clients` table uses `client_id` as its primary key; do not reference an `id` column for clients.
- The `volunteers` table no longer includes a `username` column, and `email` must be unique though it can be null.

## Email & Jobs

- Booking emails are sent through Brevo; configure `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, and `BREVO_FROM_NAME`.
- Booking confirmation and reminder emails include Cancel and Reschedule links generated from each booking's reschedule token.
- Email queue retries failed sends with exponential backoff and persists jobs in the `email_queue` table so retries survive restarts. Configure `EMAIL_QUEUE_MAX_RETRIES` and `EMAIL_QUEUE_BACKOFF_MS` to adjust retry behavior.
- Password setup token expiry is configurable via `PASSWORD_SETUP_TOKEN_TTL_HOURS` (default 24 hours).
- Use the `sendTemplatedEmail` utility to send Brevo template emails by providing a `templateId` and `params` object.
- Delivery requests notify the operations inbox via `sendTemplatedEmail` using the Brevo template configured by `DELIVERY_REQUEST_TEMPLATE_ID`.
- `POST /auth/resend-password-setup` regenerates password setup links using `generatePasswordSetupToken`; requests are rate limited per email or client ID.
- Profile pages send a password reset link without requiring current or new password fields.
- Coordinator notification addresses for volunteer booking updates live in `src/config/coordinatorEmails.json`.
- Staff or agency users can create bookings for unregistered individuals via `POST /bookings/new-client`; staff may review or delete these records through `/new-clients` routes.
- The `new_clients.email` field is nullable; `POST /bookings/new-client` accepts requests without an email address.
- A daily reminder job (`src/utils/bookingReminderJob.ts`) emails clients about next-day bookings using the `enqueueEmail` queue. It runs nightly at 7:00 PM Regina time via `node-cron` (`0 19 * * *`) and exposes `startBookingReminderJob`/`stopBookingReminderJob`.
- A volunteer shift reminder job (`src/utils/volunteerShiftReminderJob.ts`) emails volunteers about next-day shifts on the same schedule. It runs nightly at 7:00 PM Regina time and exposes `startVolunteerShiftReminderJob`/`stopVolunteerShiftReminderJob`.
 - A nightly no-show cleanup job (`src/utils/noShowCleanupJob.ts`) uses `node-cron` with `0 19 * * *` Regina time to mark past approved bookings as `no_show` and does not run on server startup. It exposes `startNoShowCleanupJob`/`stopNoShowCleanupJob`.
 - A nightly volunteer no-show cleanup job (`src/jobs/volunteerNoShowCleanupJob.ts`) uses `node-cron` with `0 19 * * *` Regina time to mark past approved volunteer bookings as `no_show` and does not run on server startup. It logs results and waits `VOLUNTEER_NO_SHOW_HOURS` (default `24`) after each shift before auto-marking.
- Failures in these cleanup jobs trigger alerts via Telegram when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` are configured. Alerts include a timestamp and stack trace for easier debugging.
- API requests that result in 5xx responses also trigger Telegram alerts including the HTTP method, path, timestamp, and stack trace when these environment variables are set.
- A nightly retention job (`src/utils/bookingRetentionJob.ts`) removes `bookings` and `volunteer_bookings` older than one year and aggregates volunteer stats into the `volunteers` table.
- An expired token cleanup job (`src/utils/expiredTokenCleanupJob.ts`) runs nightly at 3:00 AM Regina time to delete `password_setup_tokens` and `client_email_verifications` rows with `expires_at` more than 10 days ago. It exposes `startExpiredTokenCleanupJob`/`stopExpiredTokenCleanupJob`.
- A daily password token cleanup job (`src/utils/passwordTokenCleanupJob.ts`) runs at server startup and uses `node-cron` with `0 1 * * *` Regina time to delete used or expired password setup tokens. It exposes `startPasswordTokenCleanupJob`/`stopPasswordTokenCleanupJob`.
- A nightly email queue cleanup job (`src/utils/emailQueueCleanupJob.ts`) runs at 3:00 AM Regina time to remove `email_queue` rows with `next_attempt` older than `EMAIL_QUEUE_MAX_AGE_DAYS` days. It logs the remaining queue size and warns when it exceeds `EMAIL_QUEUE_WARNING_SIZE`.
- A yearly log cleanup job (`src/utils/logCleanupJob.ts`) runs every Jan 31 to aggregate the previous year's warehouse and sunshine bag logs then purge those old records from the live tables.
- A nightly blocked slot cleanup job (`src/jobs/blockedSlotCleanupJob.ts`) runs at 2:00 AM Regina time to delete past non-recurring blocked slots. It exposes `startBlockedSlotCleanupJob`/`stopBlockedSlotCleanupJob` and can be triggered manually via `POST /blocked-slots/cleanup`.

## Delivery

- Delivery categories and items live under `/delivery/categories`. Admin users can create, edit, or delete categories and the associated items; each category's `max_items` limit is enforced when orders are created.
- `POST /delivery/orders` accepts requests from delivery clients and staff, normalizes duplicate selections, validates category limits, and records the address, phone, and optional email for the order.
- After persisting an order, the controller sends a Brevo email (see `DELIVERY_REQUEST_TEMPLATE_ID`) summarizing the request so staff can schedule the delivery.
- `GET /delivery/orders/history` returns a client's orders. Delivery users retrieve their own history, while staff must pass a `clientId` query parameter to fetch on behalf of a client.

## Project Layout

- Node.js + Express API written in TypeScript.
- `controllers/` – business logic for each resource, grouped by domain (e.g., volunteer, warehouse, admin).
- `routes/` – REST endpoints wiring, organized by matching domain directories.
- `models/` and `db.ts` – PostgreSQL access.
- `middleware/` – shared Express middleware (authentication, validation, etc.).
- `schemas/`, `types/`, and `utils/` – validation, shared types, and helpers.
- The database schema is managed via TypeScript migrations in `src/migrations`. The backend runs pending migrations automatically on startup and logs each applied migration name. You can also run them manually with `npm run migrate`.
- Do not modify `src/setupDatabase.ts` for schema changes; create migrations instead.
- Booking statuses include `'visited'`; staff can mark bookings as `no_show` or `visited` via `/bookings/:id/no-show` and `/bookings/:id/visited`.
- The pantry schedule's booking dialog allows staff to mark a booking as visited while recording cart weights and notes to create a client visit.
- The Manage Booking dialog shows the client's name, profile link, and current-month visit count.
- Bookings accept optional notes; clients may include a message during booking, and staff see it in Manage Booking and Manage Volunteer Shift dialogs.
- Creating a client visit will automatically mark the client's approved booking on that date as visited.
- `/bookings/history?includeVisits=true` merges walk-in visits (`client_visits`) with booking history.
- Staff users automatically receive staff notes from `/bookings/history`; agency users may append `includeStaffNotes=true` to retrieve them.
- Visit history can be filtered by note text using the `notes` query parameter on `/bookings/history`.
- Agencies can filter booking history for multiple clients and paginate results via `/bookings/history?clientIds=1,2&limit=10&offset=0`.
- Staff can create, update, or delete slots and adjust their capacities via `/slots` routes.
- `PUT /slots/capacity` updates the `max_capacity` for all slots.

## Acceptance Tests

For timesheet and leave features, confirm the following before merging:

- [ ] Stat holidays auto-fill expected hours and lock editing.
- [ ] OT shortfalls draw from the bank and report remaining balance.
- [ ] Leave requests can be submitted, approved, and lock the day.
- [ ] Email notifications send using configured Brevo settings.

- Volunteers can earn badges. Use `GET /volunteers/me/stats` to retrieve badges, `POST /volunteers/me/badges` to manually award one, and `DELETE /volunteers/me/badges/:badgeCode` to remove one. The stats endpoint also returns lifetime volunteer hours, hours served in the current month, total completed shifts, and the current consecutive-week streak. It includes a `milestone` flag when total shifts reach 5, 10, or 25 so the frontend can display a celebration banner. The response also includes `milestoneText`, `familiesServed`, `poundsHandled`, and current-month totals `monthFamiliesServed` and `monthPoundsHandled` so the dashboard can show appreciation messages. Only shifts marked as `completed` contribute to these hours and shift counts; `approved` or `no_show` statuses are ignored.
- Volunteer leaderboard available via `GET /volunteer-stats/leaderboard` returning `{ rank, percentile }` for the current volunteer without exposing names.
- Staff can view top volunteers via `GET /volunteer-stats/ranking` with an optional `roleId` query parameter to filter by role.
- Staff can query `GET /volunteer-stats/no-show-ranking` for a list of volunteers with high no-show rates to surface in management dashboards.
- Group volunteer statistics via `GET /volunteer-stats/group` return total volunteer hours, weekly and monthly food pounds handled, distinct families served in the current month, along with current-month hours and a configurable goal for dashboard progress.
- `GET /slots` returns an empty array with a 200 status on holidays.
- Agencies can retrieve holiday dates via `GET /holidays` to disable bookings on those days.
- Milestone badge awards queue a thank-you card email and expose a downloadable card link via `/stats`.
- Volunteers see a random appreciation message on login.
- The volunteer dashboard rotates encouragement messages when no milestone is reached.
- The volunteer dashboard shows a monthly contribution line chart of shift counts.
- Self-service client registration with email OTP verification is implemented but currently disabled.

## Development Guidelines

- Preserve the separation between controllers, routes, models, and middleware in the backend.
- Use Zod schemas for validation and keep TypeScript types in sync.
