# MJ FoodBank Booking

Booking and volunteer management for the Moose Jaw Food Bank. This monorepo includes:

- [MJ_FB_Backend](MJ_FB_Backend) – Node.js/Express API.
- [MJ_FB_Frontend](MJ_FB_Frontend) – React single-page app.
- [docs](docs/) with setup notes and a [Timesheets guide](docs/timesheets.md).
- Leave request API under `/api/leave/requests` for staff leave, supporting
  vacation, sick, or personal requests (one personal day per quarter) with optional reasons.
  Admins can view requests for a specific staff member via
  `/api/timesheets/leave-requests/:staffId`.
- Password fields include a visibility toggle so users can verify what they type.

Staff can reach **Timesheets** at `/timesheet` and **Leave Management** at
`/leave-requests` from the profile menu once logged in. Admin users also see
**Timesheets** at `/admin/timesheet` and **Leave Requests** at
`/admin/leave-requests` under the Admin menu for reviewing submissions. Admins can
retrieve any staff timesheet's day entries through the API at
`GET /timesheets/:id/days` and list periods via `GET /timesheets`.

## Staff Access Roles

Staff accounts may include any of the following access roles:

- `pantry`
- `volunteer_management`
- `warehouse`
- `admin`
- `other`
- `payroll_management`
- `donation_entry` – volunteer-only access for the warehouse donation log

This repository uses Git submodules for the backend and frontend components. After cloning, pull in the submodules and install their dependencies.

## Node Version

Requires **Node.js 22+**. The repo includes a `.nvmrc` file and installation is engine‑strict, so use the pinned version:

```bash
nvm install   # installs the version listed in .nvmrc
nvm use
```

Run all backend and frontend tests on this runtime to match production behavior.

To compile the backend for production, run:

```bash
cd MJ_FB_Backend
npm run build
```

The generated JavaScript lands in `MJ_FB_Backend/dist/` and the script prints a confirmation when complete.

## Database SSL

The backend trusts the AWS RDS certificate chain stored at
`MJ_FB_Backend/certs/rds-global-bundle.pem`. Override this path with the
`PG_CA_CERT` environment variable if the bundle is located elsewhere.
`PG_HOST` should reference the Lightsail endpoint DNS name rather than an IP
address so hostname verification succeeds.

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
TIMESHEET_APPROVER_EMAILS=admin1@example.com,admin2@example.com # optional
```

Booking confirmation and reminder templates can surface "Add to Calendar" buttons by referencing
`{{ params.googleCalendarLink }}` and `{{ params.outlookCalendarLink }}` in the Brevo templates.
The backend supplies these URLs automatically; no extra environment variables are required.

Staff submit leave through `/api/leave/requests` with `startDate`, `endDate`,
`type` (`vacation`, `sick`, or `personal` – limited to one personal day per quarter), and optional `reason`; admins approve or reject
via `/api/leave/requests/:id/approve` and `/api/leave/requests/:id/reject`.

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

## Help Page Updates

Keep the Help page current whenever user-facing features change. Update
`MJ_FB_Frontend/src/pages/help/content.ts` whenever you add or modify a
route or UI element so users see accurate guidance.

Before merging a pull request, confirm the following:

- [ ] Added or changed a user-facing route or UI element?
- [ ] Updated `src/pages/help/content.ts` with the new information?
- [ ] Viewed the Help page to ensure the change appears?

## Features

- Appointment booking workflow for clients with automatic approval and rescheduling.
- Bookings support an optional **client note** field. Clients can add a note during booking, and staff see it in booking dialogs. Client notes are stored and returned via `/bookings` endpoints.
- Client visit records include an optional **staff note** field. Staff users automatically see these notes via `/bookings/history`, while agency users can retrieve them by adding `includeStaffNotes=true`.
- Help page offers role-specific guidance with real-time search and a printable view. Admins can view all help topics, including client and volunteer guidance.
- Staff or agency users can create bookings for unregistered clients via `/bookings/new-client`; the email field is optional, so bookings can be created without an email address. Staff can list or delete these pending clients through `/new-clients` routes and the Client Management **New Clients** tab.
- Volunteer role management and scheduling restricted to trained areas; volunteers can only book shifts in roles they are trained for.
- Volunteer management groups volunteer search, creation, and review under a **Volunteers** submenu. Its **Pending Reviews** tab shows the current week with `no_show` shifts and today's overdue `approved` bookings, allowing staff to mark them `completed` or `no_show`.
- Staff can manage recurring volunteer shift series from the **Recurring Shifts** page under Volunteer Management.
- Only staff can update volunteer trained roles; volunteers may view but not modify their assigned roles from the dashboard.
- Daily reminder jobs queue emails for next-day bookings and volunteer shifts using the backend email queue. Each job now runs via `node-cron` at `0 9 * * *` Regina time and exposes start/stop functions.
- Booking confirmation and reminder emails include Cancel and Reschedule buttons so users can manage their appointments directly from the message.
- A nightly cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved bookings as `no_show`.
- A nightly volunteer no-show cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved volunteer bookings as `no_show` after `VOLUNTEER_NO_SHOW_HOURS` (default `24`) hours and emails coordinators about the changes.
- Coordinator notification emails for volunteer booking changes are configured via `MJ_FB_Backend/src/config/coordinatorEmails.json`.
- Milestone badge awards send a template-based thank-you card via email and expose the card link through the stats endpoint.
- Reusable Brevo email utility allows sending templated emails with custom properties and template IDs.
- Backend email queue retries failed sends with exponential backoff and persists jobs in an `email_queue` table so retries survive restarts. The maximum retries and initial delay are configurable.
- Accounts for clients, volunteers, staff, and agencies are created without passwords; a one-time setup link directs them to `/set-password` for initial password creation.
- After setting a password, users are redirected to the login page for their role.
- `POST /auth/resend-password-setup` reissues this link when the original token expires. Requests are rate limited by email or client ID.
- Volunteers see a random appreciation message on each login with a link to download their card when available.
- Volunteers also see rotating encouragement messages on the dashboard when no milestone is reached.
- Volunteer dashboard hides shifts already booked by the volunteer and shows detailed error messages from the server when requests fail.
- Conflicting volunteer shift requests return a 409 with both the attempted and existing shift details; resolve conflicts via `POST /volunteer-bookings/resolve-conflict` (body: `{ existingBookingId, keep, roleId?, date? }`; `roleId` and `date` are required only when keeping the new booking).
- Volunteer schedule prevents navigating to past dates and hides shifts that have already started.
- Staff assigning volunteers can override a full role via a confirmation prompt, which increases that slot's `max_volunteers`.
- Volunteer badges are calculated from activity and manually awardable. Manual awards are issued via `POST /volunteers/me/badges`. `GET /volunteers/me/stats` returns earned badges along with lifetime hours, this month's hours, total completed shifts, and current streak. Only shifts marked as `completed` contribute to hours and shift totals; `approved` or `no_show` shifts are ignored. The endpoint also flags milestones at 5, 10, and 25 shifts so the dashboard can show a celebration banner.
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
- Booking requests are automatically approved; the submitted state has been removed.
- Booking confirmations display "Shift booked"; the volunteer dashboard shows only approved bookings.
- Booking history endpoint `/bookings/history` accepts `includeVisits=true` to include walk-in visits in results.
- When `includeStaffNotes=true` or the requester is staff, `/bookings/history` returns both `client_note` and `staff_note` for each entry.
- Agencies can supply `clientIds`, `limit`, and `offset` to `/bookings/history` for multi-client, paginated booking history.
- Agencies can list bookings for their linked clients via `/bookings?clientIds=1,2`.
- **Volunteer Recurring Bookings** let volunteers schedule repeating shifts with start and end dates, choose daily, weekly, or weekday patterns, and cancel individual occurrences or the remaining series.
- Staff can create recurring volunteer booking series for volunteers via `POST /volunteer-bookings/recurring/staff` and list active series with `GET /volunteer-bookings/recurring/volunteer/:volunteer_id`.
- Recurring volunteer bookings and recurring blocked slots handled by [volunteerBookingController](MJ_FB_Backend/src/controllers/volunteer/volunteerBookingController.ts) and [recurringBlockedSlots routes](MJ_FB_Backend/src/routes/recurringBlockedSlots.ts). Volunteers can create new series and manage existing ones from separate tabs on the **Recurring Bookings** page.
- Donor and event management modules ([donorController](MJ_FB_Backend/src/controllers/donorController.ts), [eventController](MJ_FB_Backend/src/controllers/eventController.ts)) with multi-day events supported via start and end dates.
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
- Slot listing endpoint `/slots` (accessible to shoppers, delivery, staff, agency, and volunteer users) returns an empty array and 200 status on holidays. Each slot includes an `overbooked` flag when approved bookings exceed `max_capacity`, and the `available` count never goes below zero.
- Staff can add or remove holidays from the Manage Availability page, which persists changes to the backend.
- Holiday listings via `GET /holidays` are available to agencies so booking interfaces can disable those dates.

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

| Variable                                     | Description                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PG_HOST`                                    | PostgreSQL host                                                                                                                           |
| `PG_PORT`                                    | PostgreSQL port                                                                                                                           |
| `PG_USER`                                    | PostgreSQL username                                                                                                                       |
| `PG_PASSWORD`                                | PostgreSQL password                                                                                                                       |
| `PG_DATABASE`                                | PostgreSQL database name                                                                                                                  |
| `JWT_SECRET`                                 | Secret used to sign JWT tokens for clients, staff, volunteers, and agencies. Generate a strong random value, e.g., `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET`                         | Secret used to sign refresh JWT tokens for all roles. Use a different strong value from `JWT_SECRET`.                                     |
| `FRONTEND_ORIGIN`                            | Allowed origins for CORS and base URL for password setup links (comma separated; empty entries are ignored)                               |
| `PORT`                                       | Port for the backend server (defaults to 4000)                                                                                            |
| `BREVO_API_KEY`                              | Brevo API key for transactional emails                                                                                                    |
| `BREVO_FROM_EMAIL`                           | Email address used as the sender                                                                                                          |
| `BREVO_FROM_NAME`                            | Optional sender name displayed in emails                                                                                                  |
| `EMAIL_ENABLED`                              | Set to 'true' to enable email sending (default false)                                                |
| `EMAIL_QUEUE_MAX_RETRIES`                    | Max retry attempts for failed email jobs (default 5)                                                                                      |
| `EMAIL_QUEUE_BACKOFF_MS`                     | Initial backoff delay in ms for email retries (default 1000)                                                                              |
| `PASSWORD_SETUP_TEMPLATE_ID`                 | Brevo template ID for invitation and password setup emails (default 6) |
| `BOOKING_CONFIRMATION_TEMPLATE_ID`           | Brevo template ID for booking confirmation emails                     |
| `BOOKING_REMINDER_TEMPLATE_ID`               | Brevo template ID for booking reminder emails                         |
| `BOOKING_STATUS_TEMPLATE_ID`                | Brevo template ID for booking status emails (cancellations, reschedules, no-shows) |
| `AGENCY_CLIENT_UPDATE_TEMPLATE_ID`         | Brevo template ID for agency client update emails                               |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Brevo template ID for volunteer booking confirmations                 |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID`     | Brevo template ID for volunteer shift reminder emails                 |
| `PASSWORD_SETUP_TOKEN_TTL_HOURS`             | Hours until password setup tokens expire (default 24)                 |

See [docs/emailTemplates.md](docs/emailTemplates.md) for a list of email templates and parameters.

### Invitation flow

New clients, volunteers, staff, and agencies are created without passwords. The backend generates a one-time token and emails a setup link using the Brevo template defined by `PASSWORD_SETUP_TEMPLATE_ID`. The link points to `/set-password` on the first origin listed in `FRONTEND_ORIGIN`.
After setting a password, users are redirected to the login page for their role.

### Agency setup

1. **Create an agency** – as staff, call `POST /agencies` with the agency details:

   ```bash
   curl -X POST http://localhost:4000/api/agencies \
     -H "Authorization: Bearer <staff-token>" \
    -H "Content-Type: application/json" \
    -d '{"name":"Sample Agency","email":"agency@example.com","contactInfo":"123-4567"}'
   ```

````

 The endpoint emails a password setup link and returns the new agency ID. You can also create one directly in SQL if needed:

 ```bash
 node -e "console.log(require('bcrypt').hashSync('secret123', 10))"
 psql -U $PG_USER -d $PG_DATABASE \
   -c "INSERT INTO agencies (name,email,password) VALUES ('Sample Agency','agency@example.com','<hashed-password>');"
````

2. **Assign clients to the agency** – authenticate as staff or the
   agency and call the API:

   ```bash

   ```

# As staff assigning client 42 to agency 1

curl -X POST http://localhost:4000/api/agencies/add-client \
 -H "Authorization: Bearer <token>" \
 -H "Content-Type: application/json" \
 -d '{"agencyId":1,"clientId":42}'

# As the agency itself

curl -X POST http://localhost:4000/api/agencies/add-client \
 -H "Authorization: Bearer <agency-token>" \
 -H "Content-Type: application/json" \
 -d '{"agencyId":1,"clientId":42}'

````

 In these examples, `clientId` is the public identifier from the `clients`
 table (`clients.client_id`), which also serves as the table's primary key.

A client may be linked to only one agency at a time. If the client is
already associated with another agency, the request returns a `409 Conflict`
response containing that agency's name. Supplying a `clientId` that doesn't
exist results in a `404 Not Found` error.

 Remove a client with
 `DELETE /agencies/:id/clients/:clientId` (use `me` for the authenticated agency).

 List clients for an agency with
 `GET /agencies/:id/clients` (use `me` for the authenticated agency).

### Password Requirements

All API endpoints that create or change passwords enforce the following rules:
- Minimum length of 8 characters
- Must include uppercase, lowercase, numeric, and special characters
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
VITE_API_BASE=/api
```

or

```
VITE_API_BASE=http://localhost:4000/api
```

The build will fail if this variable is missing.

Refer to the submodule repositories for detailed configuration and environment variables.

The backend surplus tracking feature uses two optional environment variables to
set default multipliers; values are editable in the Admin → Settings → Warehouse tab
and cached on the server:

- `BREAD_WEIGHT_MULTIPLIER` (default `10`)
- `CANS_WEIGHT_MULTIPLIER` (default `20`)

The volunteer no-show cleanup job waits `VOLUNTEER_NO_SHOW_HOURS` (default `24`) hours after a shift before marking it as `no_show`.

### Frontend features

- Pages are organized into feature-based directories (e.g., booking, staff, volunteer-management, warehouse-management).
- A language selector lets users switch languages on the login, forgot password, set password, client dashboard, book appointment, booking history, profile, and help pages.
- Profile pages provide a button to email a password reset link instead of changing passwords directly.
- A shared dashboard component lives in `src/components/dashboard`.
- Staff dashboard dates display weekday, month, day, and year (e.g., 'Tue, Jan 2, 2024').
- Includes a reusable `FeedbackSnackbar` component for concise user notifications.
- Booking confirmations include links to add appointments to Google Calendar or download an ICS file.
- Warehouse dashboard aggregates donations and shipments in real time, so manual rebuilds are no longer needed.
- Warehouse Aggregations page provides yearly totals and supports exporting them via `/warehouse-overall/export`.
- Page and form titles render in uppercase with a lighter font weight for clarity.
- Admin staff creation page provides a link back to the staff list for easier navigation.
- Admin navigation includes a Settings page with Pantry, Warehouse, and Volunteer tabs.
- The Settings page's Pantry tab lets staff configure a cart tare value and one max booking capacity used for all pantry times.
- Pantry schedule cells use color coding: rgb(228,241,228) for approved, rgb(255, 200, 200) for no-show, rgb(111,146,113) for visited, and the theme's warning light for capacity exceeded.
- Filled pantry schedule slots display the client's ID in parentheses, or show `[NEW CLIENT] Name` when booked for an unregistered individual.
- Staff can book new clients directly from the pantry schedule's **Assign User** modal by checking **New client** and entering a name (email and phone optional).
- Agencies can book appointments for their associated clients via the Agency → Book Appointment page. Clients load once and appear only after entering a search term, avoiding long lists. The page hides the client list after a selection and uses a single “Book Appointment” heading for clarity.
- Agencies can view slot availability and cancel or reschedule bookings for their clients using the standard booking APIs.
- Agency navigation offers Dashboard, Book Appointment, Booking History, Clients, and Schedule pages, all behind an `AgencyGuard`.
- Agency profile page shows the agency's name, email, and contact info with editable fields and sends password reset links via email.
- Agency navigation offers Dashboard, Book Appointment, and Booking History pages, all behind an `AgencyGuard`.
- Staff can add agencies, assign clients, and book appointments for those clients through the Harvest Pantry → Agency Management page. The **Add Client to Agency** tab initially shows only agency search; selecting an agency reveals a client search column and the agency's client list with Book buttons for scheduling on their behalf.
- Staff can enter pay period timesheets with daily hour categories, request vacation leave, and submit periods for approval with admin review and processing.
- Pantry pages include quick links for Pantry Schedule, Record a Visit, and Search Client.
- Pantry Visits page includes a search field to filter visits by client name or ID.
- Pantry Visits can log daily sunshine bag weights, shown in the summary above the visit table.
- Anonymous Pantry Visits show "(ANONYMOUS)" after the client ID and their family size is excluded from summary counts.
- Pantry Visits support bulk importing visits from spreadsheets via `POST /client-visits/import` (also `/visits/import`) and overwrite existing visits on client/date conflicts (see `docs/pantryVisits.md`).
- Pantry Visits reject attempts to record more than one visit per client on the same day.
- Pantry Visits allow selecting any date to view visits beyond the current week.

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

