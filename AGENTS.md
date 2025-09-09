# Development Guide

## Pull Request Guidelines

- Ensure tests are added or updated for any code changes and run the relevant test suites after each task.
- Use Node.js 22+; run `nvm use` to switch to the pinned version in `.nvmrc`.
- Keep recurring-booking tests current in both the backend and frontend whenever this feature changes.
- The pantry schedule receives live updates through an SSE endpoint at `/bookings/stream`.
- Pantry and volunteer schedules include a date picker for jumping directly to specific days.
- `/slots/range` returns 90 days of availability by default so the pantry schedule can load slots three months ahead.
- Staff can add existing clients to the app from the pantry schedule's Assign User modal by entering a client ID. The client is created as a shopper with online access disabled and immediately assigned to the selected slot.
- A unified `/login` page serves clients, staff, volunteers, and agencies; everyone signs in with their client ID or email and password.
- Volunteers see an Install App button on their first visit to volunteer pages with an onboarding modal about offline use; installations are tracked.
- Update this `AGENTS.md` file and the repository `README.md` to reflect any new instructions or user-facing changes.
- Provide translations only for client-visible pages (e.g., client dashboard, navbar and submenus, profile, booking, booking history). Internal or staff-only features should remain untranslated unless explicitly requested. Document these translation strings in `docs/` and update `MJ_FB_Frontend/public/locales` when client-visible text is added.
- Pantry visits track daily sunshine bag weights and client counts via the `sunshine_bag_log` table.
- Sunshine bag, surplus, pig pound, and outgoing donation logs roll up into monthly aggregates and raw log entries older than one year are purged every Jan 31.
- Anonymous pantry visits display "(ANONYMOUS)" after the client ID and their family size is excluded from the summary counts.
- Bulk pantry visit imports use the `POST /client-visits/import` endpoint (also available at `/visits/import`) and overwrite existing visits when client/date duplicates are found; see `docs/pantryVisits.md` for sheet naming and dry-run options.
- Client visits enforce a unique client/date combination; attempts to record a second visit for the same client and day return a 409 error.
- Booking notes consist of **client notes** (entered when booking) and **staff notes** (recorded during visits). Staff users automatically receive staff notes in booking history responses, while agency users can include them with `includeStaffNotes=true`.
- Keep `docs/timesheets.md` current with setup steps, API usage, payroll CSV export details, UI screenshots, and translation keys whenever the timesheet feature changes.
- A cron job seeds pay periods for the upcoming year every **Nov 30** using `seedPayPeriods`.
- Expired password setup and email verification tokens are purged nightly once they are more than 10 days past `expires_at`.
- Nightly no-show cleanup jobs mark past bookings and volunteer shifts as `no_show` and alert a Telegram channel (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALERT_CHAT_ID`) on failure.
- API requests that return a 5xx error send a Telegram alert with the HTTP method and path when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID` are configured.
- Stale email queue entries older than `EMAIL_QUEUE_MAX_AGE_DAYS` are purged nightly and the job logs the queue size, warning when it exceeds `EMAIL_QUEUE_WARNING_SIZE`.
- Maintain database health: set database-level autovacuum thresholds, schedule manual `VACUUM ANALYZE` during low-traffic windows, plan quarterly `REINDEX` or `pg_repack` runs for heavily updated tables, and monitor table bloat metrics. Record these tasks in ops docs.
- Deployments are performed manually; follow the steps in the repository `README.md` under "Deploying to Azure".
- Always document new environment variables in the repository README and `.env.example` files.
- Implement all database schema changes via migrations in `MJ_FB_Backend/src/migrations`; do not modify `src/setupDatabase.ts` for schema updates.
- Volunteers sign in with their email address instead of a username, and volunteer emails must be unique (email remains optional).
- Use `write-excel-file` for spreadsheet exports instead of `sheetjs` or `exceljs`.
- Use the shared `PasswordField` component for any password input so users can toggle visibility.
- Text input fields default to `size="medium"` to improve tap targets on small screens.
- Passwords must be at least 8 characters and include uppercase, lowercase, and special characters; numbers are optional.
- Clients reset passwords by entering their client ID and receive an email with a link to finish the reset.
- Password setup emails mention the user's role and include a direct link to the appropriate login page. The password setup page displays a role-specific login reminder and button.
- Staff can delete client and volunteer accounts from their respective management pages; update help content when these features change.

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

Client and volunteer reschedule emails currently use Brevo template ID **10**.

Cancellation, no-show, volunteer booking notification, and agency membership emails are no longer sent.

Calendar emails attach an ICS file so users can download the event. Set `ICS_BASE_URL`
to host these files publicly; otherwise `appleCalendarLink` falls back to a base64
`data:` URI.

Cancel and reschedule links in booking emails point to public pages at `/cancel/:token` and `/reschedule/:token`.
