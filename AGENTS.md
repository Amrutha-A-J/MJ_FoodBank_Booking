# Development Guide

## Pull Request Guidelines

- Ensure tests are added or updated for any code changes and run the relevant test suites after each task.
- Use Node.js 22+; run `nvm use` to switch to the pinned version in `.nvmrc`.
- Keep recurring-booking tests current in both the backend and frontend whenever this feature changes.
- API routes are served under `/api/v1`; legacy `/api` paths redirect to `/api/v1`.
- Pantry and volunteer schedules include a Today button and a date picker for jumping directly to specific days.
- Volunteer schedule marks Moose Jaw Food Bank as closed on weekends and holidays, displaying the reason. Gardening and Special Events roles remain bookable every day.
- Volunteer management includes a Volunteer Ranking tab listing top volunteers overall and by department. Volunteer pages offer quick links for Search Volunteer, Volunteer Schedule, Daily Bookings, and Ranking.
- Clients and volunteers see blocked slots as fully booked without the reason; only staff can view blocked slot reasons.
- `/slots/range` returns 90 days of availability by default so the pantry schedule can load slots three months ahead.
- Staff can add existing clients to the app from the pantry schedule's Assign User modal by entering a client ID. The client is created as a shopper with online access disabled and immediately assigned to the selected slot.
- Staff can book appointments for any future date from the pantry schedule; the client-only limit of booking in the current month (and next month only during the final week) does not apply to staff.
- Delivery clients submit grocery requests from the Book Delivery page. Each request enforces per-category item limits configured in Admin → Settings → Pantry and emails the operations inbox using Brevo template `DELIVERY_REQUEST_TEMPLATE_ID`.
- Delivery clients review submissions on the Delivery History page. Keep staff processing steps documented in `docs/delivery.md`.
- A unified `/login` page serves clients, staff, volunteers, and agencies; everyone signs in with their client ID or email and password.
- The login page automatically prompts for passkeys via WebAuthn on supported devices.
- Volunteers see an Install App button on their first visit to volunteer pages when the app isn't already installed. An onboarding modal explains offline use, and installations are tracked.
- Client and volunteer dashboards show an onboarding modal with tips on first visit; a localStorage flag prevents repeat displays.
 - A privacy notice modal prompts for consent after login and stores acknowledgement in the `users` table and localStorage to avoid repeat prompts.
 - The privacy policy is publicly accessible without signing in, and the login page includes a link to it.
- Update this `AGENTS.md` file and the repository `README.md` to reflect any new instructions or user-facing changes.
- Pantry visits track daily sunshine bag weights and client counts via the `sunshine_bag_log` table. Sunshine bag recipients are recorded separately and excluded from total client counts.
- Sunshine bag, surplus, pig pound, and outgoing donation logs roll up into monthly aggregates and raw log entries older than one year are purged every Jan 31.
- Anonymous pantry visits display "(ANONYMOUS)" after the client ID and their family size is excluded from the summary counts.
- Client visits enforce a unique client/date combination; attempts to record a second visit for the same client and day return a 409 error.
- Booking notes consist of **client notes** (entered when booking) and **staff notes** (recorded during visits). Staff users automatically receive staff notes in booking history responses, while agency users can include them with `includeStaffNotes=true`.
- Keep `docs/timesheets.md` current with setup steps, API usage, payroll CSV export details, and UI screenshots whenever the timesheet feature changes.
- A cron job seeds pay periods for the upcoming year every **Nov 30** using `seedPayPeriods`.
- Expired password setup and email verification tokens are purged nightly once they are more than 10 days past `expires_at`.
- Expired password setup links show an error instead of the password form and prompt the user to request a new link.
- Nightly no-show cleanup jobs mark past bookings and volunteer shifts as `no_show` and alert a Telegram channel (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALERT_CHAT_ID`) on failure; alerts include a timestamp and stack trace.
- API requests that return a 5xx error send a Telegram alert with the HTTP method, path, timestamp, and stack trace when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` are configured.
- Telegram alerts are sent when clients or volunteers create, cancel, or reschedule bookings.
- Stale email queue entries older than `EMAIL_QUEUE_MAX_AGE_DAYS` are purged nightly and the job logs the queue size, warning when it exceeds `EMAIL_QUEUE_WARNING_SIZE`.
- Maintain database health: set database-level autovacuum thresholds, schedule manual `VACUUM ANALYZE` during low-traffic windows, plan quarterly `REINDEX` or `pg_repack` runs for heavily updated tables, and monitor table bloat metrics. Record these tasks in ops docs.
- Deployments are performed manually; follow the steps in the repository `README.md` under "Deploying to Azure".
- Always document new environment variables in the repository README and `.env.example` files.
- Implement all database schema changes via migrations in `MJ_FB_Backend/src/migrations`; do not modify `src/setupDatabase.ts` for schema updates.
- Volunteers sign in with their email address instead of a username, and volunteer emails must be unique (email remains optional).
- Use `write-excel-file` for spreadsheet exports instead of `sheetjs` or `exceljs`.
- Use the shared `PasswordField` component for any password input so users can toggle visibility.
- Text input fields default to `size="medium"` to improve tap targets on small screens.
- Buttons default to `size="medium"`; use `size="small"` only when space is constrained.
- Passwords must be at least 8 characters and include uppercase, lowercase, and special characters; numbers are optional.
- Clients reset passwords by entering their client ID and receive an email with a link to finish the reset.
- Password setup emails mention the user's role and include a direct link to the appropriate login page. The password setup page includes a login button without any role-specific reminder text.
- Profile pages let clients and volunteers toggle email reminders from `/users/me/preferences`.
- Staff can delete client and volunteer accounts from their respective management pages; update help content when these features change.
- Donation management pages are accessible to staff with donor_management access and admins.
- Admin settings include a Donor tab for managing test email addresses used when sending donor mail lists.
- Donor donation log allows editing, deleting, and searching recorded donations by donor email, name, or amount.
- Donor Management → Donors lists existing donors and lets staff edit donor details.
- Aggregations pages are accessible to staff with aggregations or donor_management access.

See `MJ_FB_Backend/AGENTS.md` for backend-specific guidance and `MJ_FB_Frontend/AGENTS.md` for frontend-specific guidance.

## Email templates

| Template reference | Purpose | Params |
| ------------------- | ------- | ------ |
| `PASSWORD_SETUP_TEMPLATE_ID` | Account invitations and password reset emails | `link`, `token`, `clientId`, `role`, `loginLink` |
| `BOOKING_CONFIRMATION_TEMPLATE_ID` | Booking approval confirmations for clients | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `BOOKING_REMINDER_TEMPLATE_ID` | Next-day booking reminders for clients | `body`, `cancelLink`, `rescheduleLink`, `type` |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Volunteer shift confirmation emails | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID` | Volunteer shift reminder emails | `body`, `cancelLink`, `rescheduleLink`, `type` |
| `CLIENT_RESCHEDULE_TEMPLATE_ID` | Booking reschedule notifications for clients | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `VOLUNTEER_RESCHEDULE_TEMPLATE_ID` | Volunteer shift reschedule emails | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` |
| `DELIVERY_REQUEST_TEMPLATE_ID` | Delivery request notifications for staff | `orderId`, `clientId`, `clientName`, `address`, `phone`, `email`, `itemList`, `createdAt` |
| `DONOR_TEMPLATE_ID_*` | Monetary donor emails for tiered amounts ($1–$100, $101–$500, $501–$1,000, $1,001–$10,000, $10,001–$30,000) | `firstName`, `amount`, `families`, `adults`, `children`, `pounds`, `month`, `year` |

Client and volunteer reschedule emails currently use Brevo template ID **10**.

Cancellation, no-show, volunteer booking notification, and agency membership emails are no longer sent.

Calendar emails attach an ICS file so users can download the event. Set `ICS_BASE_URL`
to host these files publicly; otherwise `appleCalendarLink` falls back to a base64
`data:` URI.

Cancel and reschedule links in booking emails point to public pages at `/cancel/:token` and `/reschedule/:token`.
