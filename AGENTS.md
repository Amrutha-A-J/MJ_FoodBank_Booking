# Development Guide

## Pull Request Guidelines

- Ensure tests are added or updated for any code changes and run the relevant test suites after each task.
- Keep recurring-booking tests current in both the backend and frontend whenever this feature changes.
- Update this `AGENTS.md` file and the repository `README.md` to reflect any new instructions or user-facing changes.
- The `clients` table uses `client_id` as its primary key; do not reference an `id` column for clients.
- The backend requires Node.js 18+ for native `fetch`; the `node-fetch` polyfill has been removed and earlier versions are not supported.
- Booking emails are sent through Brevo; configure `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, and `BREVO_FROM_NAME` in the backend environment.
- Email queue retries failed sends with exponential backoff and persists jobs in the `email_queue` table so retries survive restarts. Configure `EMAIL_QUEUE_MAX_RETRIES` and `EMAIL_QUEUE_BACKOFF_MS` to adjust retry behavior.
- Password setup token expiry is configurable via `PASSWORD_SETUP_TOKEN_TTL_HOURS` (default 24 hours).
- Use the `sendTemplatedEmail` utility to send Brevo template emails by providing a `templateId` and `params` object.
- `POST /auth/resend-password-setup` regenerates password setup links using `generatePasswordSetupToken`; requests are rate limited per email or client ID.
- Coordinator notification addresses for volunteer booking updates live in `MJ_FB_Backend/src/config/coordinatorEmails.json`.
- Staff or agency users can create bookings for unregistered individuals via `POST /bookings/new-client`; staff may review or delete these records through `/new-clients` routes.
- The pantry schedule's **Assign User** modal includes a **New client** option; selecting it lets staff enter a name (with optional email and phone) and books the slot via `POST /bookings/new-client`. These bookings appear on the schedule as `[NEW CLIENT] Name`.
- The `new_clients.email` field is nullable; `POST /bookings/new-client` accepts requests without an email address.
- A daily reminder job (`src/utils/bookingReminderJob.ts`) runs at server startup and emails clients about next-day bookings using the `enqueueEmail` queue. It now uses `node-cron` to run at `0 9 * * *` Regina time and exposes `startBookingReminderJob`/`stopBookingReminderJob`.
- A volunteer shift reminder job (`MJ_FB_Backend/src/utils/volunteerShiftReminderJob.ts`) runs at server startup and emails volunteers about next-day shifts using the same queue. It also uses `node-cron` with the same schedule and exposes `startVolunteerShiftReminderJob`/`stopVolunteerShiftReminderJob`.

## Testing

- For changes in `MJ_FB_Backend`, run `npm test` from the `MJ_FB_Backend` directory.
- For changes in `MJ_FB_Frontend`, run `npm test` from the `MJ_FB_Frontend` directory.
- Tests polyfill `global.fetch` with `undici` in a `beforeAll`; keep this setup for compatibility.
- Tests for invitation and password setup flows live in `MJ_FB_Backend/tests/passwordResetFlow.test.ts`; run `npm test tests/passwordResetFlow.test.ts` when working on these features.

- Volunteers can earn badges. Use `GET /volunteers/me/stats` to retrieve badges and
  `POST /volunteers/me/badges` to manually award one. The stats endpoint also returns
  lifetime volunteer hours, hours served in the current month, total completed shifts,
  and the current consecutive-week streak. It includes a `milestone` flag when total
  shifts reach 5, 10, or 25 so the frontend can display a celebration banner.
  The response also includes `milestoneText`, `familiesServed`, `poundsHandled`,
  and current-month totals `monthFamiliesServed` and `monthPoundsHandled`
  so the dashboard can show appreciation messages.
- Volunteer leaderboard available via `GET /volunteer-stats/leaderboard` returning
  `{ rank, percentile }` for the current volunteer without exposing names.
- Group volunteer statistics via `GET /volunteer-stats/group` return total
  volunteer hours, weekly and monthly food pounds handled, distinct families
  served in the current month, along with current-month hours and a
  configurable goal for dashboard progress.

- `GET /slots` returns an empty array with a 200 status on holidays.
- Agencies can retrieve holiday dates via `GET /holidays` to disable bookings on those days.
- Milestone badge awards queue a thank-you card email and expose a downloadable card link via `/stats`.
- Volunteers see a random appreciation message on login.
- The volunteer dashboard rotates encouragement messages when no milestone is reached.
- The volunteer dashboard shows a monthly contribution line chart of shift counts.
- Self-service client registration with email OTP verification is implemented but currently disabled.

## Project Layout

### Backend (`MJ_FB_Backend`)
- Node.js + Express API written in TypeScript.
- `controllers/` – business logic for each resource, grouped by domain (e.g., volunteer, warehouse, admin).
- `routes/` – REST endpoints wiring, organized by matching domain directories.
- `models/` and `db.ts` – PostgreSQL access.
- `middleware/` – shared Express middleware (authentication, validation, etc.).
- `schemas/`, `types/`, and `utils/` – validation, shared types, and helpers.
- The database schema is managed via TypeScript migrations in `src/migrations` using `npm run migrate`. The command logs each migration's success or failure to the console.
- Booking statuses include `'visited'`; staff can mark bookings as `no_show` or `visited` via `/bookings/:id/no-show` and `/bookings/:id/visited`.
- The pantry schedule's booking dialog allows staff to mark a booking as visited while recording cart weights to create a client visit.
- The Manage Booking dialog shows the client's name, profile link, and current-month visit count.
- Creating a client visit will automatically mark the client's approved booking on that date as visited.
- `/bookings/history?includeVisits=true` merges walk-in visits (`client_visits`) with booking history.
- Agencies can filter booking history for multiple clients and paginate results via `/bookings/history?clientIds=1,2&limit=10&offset=0`.
- Staff can create, update, or delete slots and adjust their capacities via `/slots` routes.
- `PUT /slots/capacity` updates the `max_capacity` for all slots.

### Frontend (`MJ_FB_Frontend`)
- React app built with Vite.
- Build requires `VITE_API_BASE` to be set in `MJ_FB_Frontend/.env`.
- `pages/` define top-level views and are organized into feature-based directories (booking, staff, volunteer-management, warehouse-management, etc.).
- `components/` provide reusable UI elements; use `FeedbackSnackbar` for notifications. The dashboard UI lives in `components/dashboard`.
- `api/` wraps server requests.
- `utils/`, `types.ts`, and theming files manage helpers, typings, and Material UI themes.
- Administrative pages enable staff to manage volunteer master roles and edit volunteer role slots.
- Volunteer Settings provides separate dialogs for creating sub-roles (with an initial shift) and for adding or editing shifts.
- Deleting sub-roles and shifts prompts confirmation dialogs to prevent accidental removal.
- Users complete initial password creation at `/set-password` using a token from the setup email.
- After setting a password, users are redirected to the login page for their role.
- Volunteer role start and end times use a native time picker; `saveRole` expects `HH:MM:SS` strings.
- Staff can assign clients to agencies from the Harvest Pantry → Agency Management page via the **Add Client to Agency** tab, which includes agency search, client listing, and removal confirmations.
  Initially, the page shows only agency search; selecting an agency reveals a two-column layout with client search on the left and the agency's client list on the right.
- Agencies can book appointments for their associated clients from the Agency → Book Appointment page. Clients load once and display only after entering a search term, with filtering performed client-side to avoid long lists.
- Agency navigation provides Dashboard, Book Appointment, and Booking History pages, all protected by `AgencyGuard`.
- Agencies can view pantry slot availability and manage bookings—including creating, cancelling, and rescheduling—for their linked clients.
- Volunteer navigation includes a **Recurring Bookings** submenu for managing repeating shifts; keep related documentation up to date.

## Development Guidelines

- Preserve the separation between controllers, routes, models, and middleware in the backend.
- Use Zod schemas for validation and keep TypeScript types in sync.
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Document new environment variables in the repository README and `.env.example` files.
- Use `write-excel-file` for spreadsheet exports instead of `sheetjs` or `exceljs`.
- App-level settings such as cart tare and surplus weight multipliers live in the `app_config` table. Cart tare is editable via the Admin → App Configurations page, while bread/can weight multipliers are managed under Admin → Warehouse Settings. Fetch these values from the backend rather than hard-coding or using environment variables.
- The frontend requires a live internet connection; offline caching or offline-first optimizations must not be added.

## UI Rules & Design System (Global)

### Tech & Theme
- Library: Material UI v5 only (no Tailwind).
- Theme: Use the app’s `ThemeProvider` theme (primary `#941818`, Golos font, rounded corners). Never hard-code colors, spacing, or fonts—pull from the theme.
- Typography: Default to theme typography. Section titles use `subtitle1`/`h5` with bold as defined in theme.
 - Typography: Default to theme typography. Page and form titles use uppercase `h4`/`h5` variants with a slightly lighter font weight.

### Layout
- Grid: Use `Grid` with `spacing={2}` for page layout; prefer 12-column responsive layouts.
- Cards: Group related content in `Card` (or `Paper`) with the themed light border and subtle shadow. Avoid “floating” elements.
- Responsive: Ensure components work on xs→xl. Hide non-critical details on small screens, not critical actions.

### Components & Patterns
- Buttons: `size="small"`, `variant="contained"` for primary actions, outlined/text for secondary/tertiary. No ALL CAPS; `textTransform: 'none'`.
- Lists: `List` + `ListItem` for short, actionable sets.
- Tables: Use dense row height; keep actions in a trailing column; keep columns ≤ 7 on desktop.
- Forms: Use `TextField`, `Select`, `Checkbox`, `Radio` from MUI. Label every field; show helper text for constraints. Validate on blur and on submit; show inline errors and a top summary only if multiple errors exist.
- Form containers: Wrap forms in a container centered horizontally and vertically within the viewport.
- Feedback: Use the shared `FeedbackSnackbar` for success/info/error; avoid custom alerts. Keep messages short and specific.
- Loading: Prefer skeletons for cards/lists; use `CircularProgress` inline for button-level waits; never block entire pages without a reason.
- Empty States: Show a short explainer + primary action (e.g., “No bookings yet — Book an appointment”).
- Icons: Use `@mui/icons-material`. Pair icons with labels (accessibility + clarity).

### Status & Colors
- Status chips:
  - success = approved/ok,
  - warning = needs attention,
  - error = rejected/failed,
  - default/info = neutral.
- Never hard-code hex values; use theme palette (`success`, `warning`, `error`, `info`).
- Links & Emphasis: Use the theme’s primary color for emphasis and links; do not introduce new accent colors.

- Pantry schedule cells use the following colors:
  - approved → rgb(228,241,228),
  - no_show → rgb(255, 200, 200),
  - visited → rgb(111,146,113),
  - capacity exceeded → theme warning light.

### Interactions
- Affordance: Primary action visible and enabled when valid; disabled state must include a reason (helper text or tooltip).
- Confirmation: Only confirm destructive actions (e.g., Cancel, Reject). Use dialogs with clear verb-first buttons (“Cancel booking”, “Keep booking”).
- Undo: Prefer “Undo” in `FeedbackSnackbar` where safe (e.g., client-side remove before API commit).

### Content Style
- Copy: Plain, concise, second person (“You”).
- Dates/Times: Show local time with clear format (e.g., Tue, Aug 12 · 9:30–10:00). Avoid ambiguity.
- Errors: Actionable and specific (“Slot is full. Pick another time.”), not generic.

### Dashboards (by role)
 - Staff: “Today at a Glance” stats, Pantry Schedule snapshot, Volunteer Coverage, Quick Search, Cancellations, Notices & Events.
 - Volunteer: My Next Shifts, Available in My Roles, Announcements, Quick Actions, Profile & Training.
 - User: Upcoming Appointments, Next Available Slots, Notices, Quick Actions.
 - Each section should be a card with a concise header and an action (e.g., “Review All”, “Open Schedule”).

### Accessibility
- Keyboard: All interactive controls must be focusable; visible focus ring (default MUI is fine).
- ARIA: Use semantic components; add `aria-label` on icon-only buttons.
- Contrast: Rely on theme tokens; don’t reduce contrast below MUI defaults.

### Do / Don’t
- Do reuse existing shared components (`FeedbackSnackbar`, search inputs, role-aware guards).
- Do keep pages fast; fetch minimal data for first paint, then lazy-load details.
- Don’t inline custom CSS or use non-themed colors.
- Don’t add new design primitives without updating the theme.
- Code Conventions: Co-locate small view components with the page; share reusable pieces in `components/`. Keep pages for data flow & layout; keep business logic in hooks/services.
- All new UI must compile against strict TypeScript and pass existing tests.

## Base Requirements

Clients with internet access submit appointment requests online. Staff then refer to the client database called Link2Feed (an external platform that our app is not connected to). Walk-in visits can now be logged in our system through the `/client-visits` CRUD endpoints backed by the `client_visits` table. Visit counts are refreshed whenever a visit is added, updated, or deleted (see `src/controllers/clientVisitController.ts`). Staff should still check Link2Feed to ensure the client has not already used the food bank twice this calendar month (clients may only visit twice per month).

Staff must also book appointments for clients who do not have internet access. In these cases, the client visits in person to request an appointment, and the staff member clicks on an empty cell in the pantry schedule to assign the client to that slot. Both clients and staff should have the ability to cancel or reschedule appointments.

Similarly, volunteers should be able to log into the app to see which roles require volunteers for a given day. They will only see roles they are trained in, so they do not sign up for areas they are unfamiliar with. Just like client bookings, staff must approve volunteer requests. Staff can also view which volunteers are available on a given day for each role.

## Functional Overview

### Backend
- Express server configures CORS, initializes default slots, and mounts routes for clients, slots, bookings, holidays, blocked slots, breaks, staff, volunteer roles, volunteer bookings, and authentication.
- Booking logic checks slot capacity, enforces monthly visit limits, and sends confirmation emails when a booking is created.
- JWT-based middleware extracts tokens from headers or cookies, verifies them, and loads the matching staff, client, or volunteer record from PostgreSQL.
- A setup script provisions PostgreSQL tables for slots, users (clients), staff, volunteer roles, bookings, breaks, and related data when the server starts.

### Frontend
- The React app manages authentication for shoppers, staff, and volunteers, switching between login components and role-specific navigation/routes such as slot booking, schedule management, and volunteer coordination.
- `BookingUI` provides a calendar view that excludes weekends and holidays, fetches available slots, and submits bookings via the API.
- Staff manage holidays, blocked slots, and staff breaks through `ManageAvailability`, which pulls data from and sends updates to the backend API.
- `PantrySchedule` shows daily pantry availability with holidays, blocked slots, and breaks rendered as non bookable times. Each time block supports up to four shoppers across Slot 1–Slot 4, displaying how many bookings exist per slot. Staff can book appointments for walk-ins and manage existing bookings.
- Volunteers view role-specific schedules and request, cancel, or reschedule bookings through `VolunteerSchedule`. Gardening and special events shifts remain bookable on holidays and weekends, while pantry, warehouse, and administrative roles are disabled when a holiday is set.

## Booking Workflow

### Clients and Staff
- **Clients** book pantry appointments through a calendar; bookings are automatically approved or rejected.
- **Staff** can cancel or reschedule bookings and mark visits. Assigning a client directly to a slot creates an approved booking. Rejections and cancellations require a reason.
- Clients can view a booking history table listing all appointments, each with Cancel and Reschedule options.

- **BookingUI** – renders the calendar shoppers use to view and reserve open time slots.
- **BookingHistory** – lists a shopper's appointments with actions to cancel or reschedule.
- **ManageAvailability** – lets staff maintain holidays, blocked slots, and recurring breaks.
- **PantrySchedule** – primary staff tool to view bookings per time block, book walk-in appointments, and manage client bookings, while marking holidays, blocked slots, and breaks as non bookable entries in the schedule.
- **VolunteerSchedule** and `VolunteerScheduleTable` – list volunteer shifts by role. The number of slot columns matches each role's `max_volunteers` (e.g., pantry shelf stocker shows one slot, while pantry greeter shows multiple). Holidays disable pantry, warehouse, and administrative roles, while gardening and special events remain bookable; breaks and blocked-slot restrictions are ignored. Past days cannot be selected and shifts earlier than the current time are hidden.
- Backend controllers such as `bookingController`, `slotController`, `holidayController`, `blockedSlotController`, `breakController`, `volunteerBookingController`, and `volunteerRoleController` enforce business rules and interact with the database.

## Database Model

The booking flow uses the following PostgreSQL tables. **PK** denotes a primary key and **FK** a foreign key.

- **slots** – PK `id`; unique `(start_time, end_time)`; referenced by `bookings.slot_id`, `breaks.slot_id`, and `blocked_slots.slot_id`.
- **staff** – PK `id`; unique `email`; `role` constrained to `staff` or `admin`.
- **users** – PK `id`; unique `email` and `client_id` (1–9,999,999); `role` is `shopper` or `delivery`; referenced by `bookings.user_id`.
- **client_email_verifications** – PK `id`; unique `client_id`; FK `client_id` → `clients.id`; stores `email`, `otp_hash`, and `expires_at` for verifying client emails.
- **bookings** – PK `id`; FK `user_id` → `users.id`; FK `slot_id` → `slots.id`; `status` in `approved|rejected|cancelled|no_show|expired|visited`; includes `reschedule_token`.
- **client_visits** – PK `id`; FK `client_id` → `clients.client_id`; records `date`, `is_anonymous` (default `false`), `weight_with_cart`, `weight_without_cart`, and `pet_item` counts.
- **breaks** – PK `id`; unique `(day_of_week, slot_id)`; FK `slot_id` → `slots.id`.
- **blocked_slots** – PK `id`; unique `(date, slot_id)`; FK `slot_id` → `slots.id`.
- **recurring_blocked_slots** – PK `id`; unique `(day_of_week, week_of_month, slot_id)`; FK `slot_id` → `slots.id`; defines weekly/monthly slot blocks with a `reason`.
- **holidays** – PK `id`; unique `date`.
- **volunteer_master_roles** – PK `id`.
- **volunteer_roles** – PK `id`; FK `category_id` → `volunteer_master_roles.id`.
- **volunteer_slots** – PK `slot_id`; FK `role_id` → `volunteer_roles.id` (cascade); tracks `max_volunteers`, `is_wednesday_slot`, `is_active`.
- **volunteers** – PK `id`; unique `username`.
- **volunteer_trained_roles** – composite PK `(volunteer_id, role_id)`; FK `volunteer_id` → `volunteers.id` (cascade); FK `role_id` → `volunteer_roles.id` (cascade); FK `category_id` → `volunteer_master_roles.id`.
- **volunteer_bookings** – PK `id`; FK `volunteer_id` → `volunteers.id` (cascade); FK `slot_id` → `volunteer_slots.slot_id` (cascade); `status` in `approved|rejected|cancelled|no_show|expired`; includes `reschedule_token`.
- **volunteer_recurring_bookings** – PK `id`; FK `volunteer_id` → `volunteers.id` (cascade); FK `slot_id` → `volunteer_slots.slot_id` (cascade); includes `start_date`, optional `end_date`, `pattern` (`daily|weekly`), `days_of_week` array, and an `active` flag.

## Volunteer Management

Volunteer management coordinates role-based staffing for the food bank.

### Role Categories (`volunteer_master_roles`)
1. Pantry
2. Warehouse
3. Gardening
4. Administration
5. Special Events

### Subroles (`volunteer_roles`)
1. Food Sorter (Warehouse)
2. Production Worker (Warehouse)
3. Driver Assistant (Warehouse)
4. Loading Dock Personnel (Warehouse)
5. General Cleaning & Maintenance (Warehouse)
6. Reception (Pantry)
7. Greeter / Pantry Assistant (Pantry)
8. Stock Person (Pantry)
9. Gardening Assistant (Gardening)
10. Event Organizer (Special Events)
11. Event Resource Specialist (Special Events)
12. Volunteer Marketing Associate (Administration)
13. Client Resource Associate (Administration)
14. Assistant Volunteer Coordinator (Administration)
15. Volunteer Office Administrator (Administration)

## API Reference

### Auth
- `POST /auth/request-password-reset` → 204 No Content.
- `POST /auth/change-password` → 204 No Content (auth required).

### Clients
- `POST /users/login` → `{ token, role, name, bookingsThisMonth? }`
- `POST /users` → `{ message: 'Client created' }`
- `GET /users/search?search=query` → `[ { id, name, email, phone, client_id } ]`
- `GET /users/me` → `{ id, firstName, lastName, email, phone, clientId, role, bookingsThisMonth }`

### Staff
- `GET /staff/exists` → `{ exists: boolean }`
- `POST /staff` → `{ message: 'Staff created' }`

### Slots
- `GET /slots?date=YYYY-MM-DD` → `[ { id, startTime, endTime, maxCapacity, available } ]`
- `GET /slots/all` → `[ { id, startTime, endTime, maxCapacity } ]`

### Bookings
- `POST /bookings` → `{ message: 'Booking created', bookingsThisMonth, rescheduleToken }`
- `GET /bookings?clientIds=1,2` → `[ { id, status, date, user_id, slot_id, is_staff_booking, reschedule_token, user_name, user_email, user_phone, client_id, bookings_this_month, start_time, end_time } ]` (agencies must specify `clientIds` linked to them)
- `GET /bookings/history` → `[ { id, status, date, slot_id, reason, start_time, end_time, created_at, is_staff_booking, reschedule_token } ]`
- `POST /bookings/:id/decision` → `{ message: 'Booking approved'|'Booking rejected' }`
- `POST /bookings/:id/cancel` → `{ message: 'Booking cancelled' }`
- `POST /bookings/reschedule/:token` → `{ message: 'Booking rescheduled', rescheduleToken }`
- `POST /bookings/preapproved` → `{ message: 'Walk-in booking created', rescheduleToken }`
- `POST /bookings/staff` → `{ message: 'Booking created for client', rescheduleToken }`

### Holidays
- `GET /holidays` → `[ { date, reason } ]`
- `POST /holidays` → `{ message: 'Added' }`
- `DELETE /holidays/:date` → `{ message: 'Removed' }`

### Blocked Slots
- `GET /blocked-slots?date=YYYY-MM-DD` → `[ { slotId, reason } ]`
- `POST /blocked-slots` → `{ message: 'Added' }`
- `DELETE /blocked-slots/:date/:slotId` → `{ message: 'Removed' }`

### Recurring Blocked Slots (`src/routes/recurringBlockedSlots.ts`)
- `GET /recurring-blocked-slots` → `[ { id, dayOfWeek, weekOfMonth, slotId, reason } ]`
- `POST /recurring-blocked-slots` `{ dayOfWeek, weekOfMonth, slotId, reason }` → `{ message: 'Added' }`
- `DELETE /recurring-blocked-slots/:id` → `{ message: 'Removed' }`

### Breaks
- `GET /breaks` → `[ { dayOfWeek, slotId, reason } ]`
- `POST /breaks` → `{ message: 'Added' }`
- `DELETE /breaks/:day/:slotId` → `{ message: 'Removed' }`

### Roles
- `GET /roles` → `[ { categoryId, categoryName, roleId, roleName } ]`
- `GET /roles/:roleId/shifts` → `[ { shiftId, startTime, endTime, maxVolunteers } ]`

### Volunteers
- `POST /volunteers/login` → `{ token, role: 'volunteer', name }`
- `POST /volunteers` → `{ id }`
- `GET /volunteers/search?search=query` → `[ { id, name, trainedAreas } ]`
- `PUT /volunteers/:id/trained-areas` → `{ id, roleIds }`

### Volunteer Roles
- `GET /volunteer-roles/mine?date=YYYY-MM-DD` → `[ { id, role_id, name, start_time, end_time, max_volunteers, category_id, category_name, is_wednesday_slot, booked, available, status, date } ]`
- `POST /volunteer-roles` (requires `roleId` or `name` + `categoryId`) → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active, category_name }`
- `GET /volunteer-roles` (`?includeInactive=true` to include inactive shifts) → `[ { id, role_id, category_id, name, max_volunteers, category_name, shifts } ]`
- `PUT /volunteer-roles/:id` → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active, category_name }`
- `PATCH /volunteer-roles/:id` → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active }`
- `DELETE /volunteer-roles/:id` → `{ message: 'Deleted' }`

### Volunteer Master Roles
- `GET /volunteer-master-roles` → `[ { id, name } ]`
- `POST /volunteer-master-roles` → `{ id, name }`
- `PUT /volunteer-master-roles/:id` → `{ id, name }`
- `DELETE /volunteer-master-roles/:id` → `{ message: 'Master role deleted' }` (removes associated `volunteer_roles` and `volunteer_slots`)
- `POST /volunteer-roles/restore` → `{ message: 'Volunteer roles restored' }` (staff only; resets roles, shifts, and training links)

### Volunteer Bookings
- `POST /volunteer-bookings` → `{ id, role_id, volunteer_id, date, status, reschedule_token, status_color }` (409 returns `{ attempted, existing }` on overlap)
- `POST /volunteer-bookings/staff` → `{ id, role_id, volunteer_id, date, status, reschedule_token, status_color }`
- `POST /volunteer-bookings/resolve-conflict` `{ existingBookingId, roleId, date, keep }` → `{ kept, booking }`
- `GET /volunteer-bookings/mine` → `[ { id, role_id, volunteer_id, date, status, reschedule_token, start_time, end_time, role_name, category_name, status_color } ]`
- `GET /volunteer-bookings/volunteer/:volunteer_id` → `[ { id, role_id, volunteer_id, date, status, reschedule_token, start_time, end_time, role_name, category_name, status_color } ]`
- `GET /volunteer-bookings` → `[ { id, status, role_id, volunteer_id, date, reschedule_token, start_time, end_time, role_name, category_name, volunteer_name, status_color } ]`
- `GET /volunteer-bookings/:role_id` → `[ { id, status, role_id, volunteer_id, date, reschedule_token, start_time, end_time, role_name, category_name, volunteer_name, status_color } ]`
- `PATCH /volunteer-bookings/:id` → `{ id, role_id, volunteer_id, date, status, status_color }`
- `POST /volunteer-bookings/reschedule/:token` → `{ message: 'Volunteer booking rescheduled', rescheduleToken }`

Volunteer booking statuses include `completed`, and cancellations must include a reason.

### Volunteer Recurring Bookings (`src/routes/volunteer/volunteerBookings.ts`)
- `POST /volunteer-bookings/recurring` `{ roleId, startDate, endDate, pattern, daysOfWeek }` → `{ recurringId, successes, skipped }`
- `GET /volunteer-bookings/recurring` → `[ { id, role_id, start_date, end_date, pattern, days_of_week } ]`
- `DELETE /volunteer-bookings/recurring/:id?from=YYYY-MM-DD` → `{ message: 'Recurring bookings cancelled' }`
- `PATCH /volunteer-bookings/:id/cancel` → `{ id, role_id, volunteer_id, date, status }`

### Agencies (`src/routes/agencies.ts`)
- `GET /agencies/:id/clients` → `[ clientId ]`
- `POST /agencies/add-client` `{ agencyId, clientId }` → `204` (404 if client not found)
- `DELETE /agencies/:id/clients/:clientId` → `204`
- `POST /agencies` `{ name, email, password, contactInfo? }` → `{ id }` (staff only)
- A client may be linked to only one agency at a time; adding a client already
  associated with another agency returns a `409` with that agency's name.
  `clientId` refers to the public identifier (`clients.client_id`).
- Agency users can view and update their own profile via `GET/PATCH /users/me`.
  The response includes `firstName` (agency name), `email`, and `phone`
  (contact info).
  Authenticated agency users may substitute `me` for `:id` in the above client
  routes (e.g. `GET /agencies/me/clients`).

### Donors (`src/routes/donors.ts`)
- `GET /donors?search=name` → `[ { id, name } ]`
- `POST /donors` `{ name }` → `{ id, name }`
- `GET /donors/:id` → `{ id, name, totalLbs, lastDonationISO }`
- `GET /donors/:id/donations` → `[ { id, date, weight } ]`
- `GET /donors/top?year=YYYY&limit=N` → `[ { name, totalLbs, lastDonationISO } ]`

### Events (`src/routes/events.ts`)
- `GET /events` → `{ today: [event], upcoming: [event], past: [event] }`
- `POST /events` `{ title, details, category, date, staffIds?, visibleToVolunteers?, visibleToClients? }` → `{ id }`
- `DELETE /events/:id` → `{ message: 'Deleted' }`

### Warehouse Management
- `/warehouse-overall` routes provide yearly summaries of donations, surplus, pig pound, and outgoing donations.
- `GET /warehouse-overall?year=YYYY` lists monthly aggregates, and `GET /warehouse-overall/export?year=YYYY` exports it as a spreadsheet. Aggregates update in real time; manual rebuilds are no longer needed.
- Frontend pages under `/warehouse-management/*` (Dashboard, Donation Log, Track Pigpound, Track Outgoing Donations, Track Surplus, Aggregations) surface these warehouse features.

## Slot API

`/slots` returns each slot with an `overbooked` flag when approved bookings exceed `max_capacity`, and `available` values are never negative.

`GET /volunteer-roles` returns all volunteer roles with their active shifts by default. Append `?includeInactive=true` to include inactive shifts:

```
[
  {
    "id": <role_id>,
    "category_id": <category_id>,
    "name": "<role name>",
    "max_volunteers": 3,
    "category_name": "<category>",
    "shifts": [
      {
        "id": <slot_id>,
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "is_wednesday_slot": false,
        "is_active": true
      },
      ...
    ]
  },
  ...
]
```

`id` represents the role ID; each shift object uses its own `id` for the slot identifier.

`GET /volunteer-roles/mine?date=YYYY-MM-DD` returns each slot the logged-in volunteer is trained for:

```
[
  {
    "id": <slot_id>,
    "role_id": <role_id>,
    "name": "<role name>",
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "max_volunteers": 3,
    "category_id": <category_id>,
    "category_name": "<category>",
    "is_wednesday_slot": false,
    "booked": 1,
    "available": 2,
    "status": "available",
    "date": "2024-01-15"
  },
  ...
]
```

## Components & Workflow

- **VolunteerSchedule** lets volunteers choose a role from a dropdown and view a grid of shifts. Columns correspond to slot numbers and rows show shift times (e.g. 9:30–12:00, 12:30–3:30). Cells display *Booked* or *Available* and clicking an available cell creates a request in `volunteer_bookings`. Past dates are disabled and same-day shifts that have already started are omitted.
- The Volunteer Dashboard's **Available in My Roles** list excludes shifts the volunteer has already requested or booked and shows server-provided error messages when a booking attempt fails.
- Volunteers can view their trained roles on the dashboard but cannot update them; staff manage trained areas through the volunteer search interface.
- Shift booking confirmations display "Shift booked" since bookings are auto-approved and the submitted state has been removed; the volunteer dashboard lists only approved bookings.
- Volunteer and pantry schedules follow the same grid logic. The y‑axis lists shift times and the x‑axis lists sequential slot numbers up to each shift's `max_volunteers`. When a volunteer requests a shift, the booking is immediately approved and occupies the first open slot.
- **BookingHistory** shows a volunteer's upcoming bookings with Cancel and Reschedule options.
- **CoordinatorDashboard** is the staff view using `VolunteerScheduleTable`. Staff see volunteer names for booked cells and can cancel or reschedule bookings. Staff can also search volunteers, assign them to roles, and update trained areas.
- The volunteer search page shows the selected volunteer's profile and role editor alongside their booking history in a two-column card layout.
- Role selection in the volunteer search role editor uses a simple dropdown without search.
- These workflows rely on `volunteer_slots`, `volunteer_roles`, `volunteer_master_roles`, `volunteer_bookings`, `volunteers`, and `volunteer_trained_roles`. Training records in `volunteer_trained_roles` restrict which roles a volunteer can book.

