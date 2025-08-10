# Repository Instructions

- For changes in `MJ_FB_Backend`, run `npm test` from the `MJ_FB_Backend` directory.
- For changes in `MJ_FB_Frontend`, run `npm test` from the `MJ_FB_Frontend` directory.

## Application Structure
- `MJ_FB_Backend`: Node.js + Express API written in TypeScript.
  - `controllers/` contain business logic for each resource.
  - `routes/` expose REST endpoints and connect to controllers.
  - `models/` and `db.ts` manage PostgreSQL access.
  - `middleware/` holds reusable Express middleware (authentication, validation, etc.).
  - `schemas/`, `types/`, and `utils/` centralize validation, shared types, and helpers.
- `MJ_FB_Frontend`: React app built with Vite.
  - `pages/` define top-level views.
  - `components/` provide reusable UI elements like `FeedbackSnackbar` for user notifications.
  - `api/` wraps server requests.
  - `utils/`, `types.ts`, and theming files manage helpers, typings, and Material UI themes.

## Functional Overview
### Backend
- The Express server configures CORS, initializes default slots, and mounts route modules for users, slots, bookings, holidays, blocked slots, breaks, staff, volunteer roles and bookings, and authentication before starting the service
- Booking logic checks slot capacity, enforces monthly visit limits, and sends confirmation emails when a booking is created
- JWT-based middleware extracts tokens from headers or cookies, verifies them, and loads the matching staff, user, or volunteer record from PostgreSQL
- A setup script provisions PostgreSQL tables for slots, users, staff, volunteer roles, bookings, breaks, and related data when the server starts

### Frontend
- The React app manages authentication for shoppers, staff, and volunteers, switching between login components and role-specific navigation/routes such as slot booking, schedule management, and volunteer coordination
- `SlotBooking` provides a calendar view that excludes weekends and holidays, fetches available slots, and submits bookings via the API
- Staff manage holidays, blocked slots, and staff breaks through `ManageAvailability`, which pulls data from and sends updates to the backend API
- `PantrySchedule` shows daily pantry availability with holidays, blocked slots, and breaks rendered as non bookable times.
- Volunteers view role-specific schedules and request, cancel, or reschedule bookings through `VolunteerSchedule`. Gardening and special events shifts remain bookable on holidays and weekends, while pantry, warehouse, and administrative roles are disabled when a holiday is set; break and blocked-slot restrictions are ignored.
- Reusable Material UI components include a responsive `Navbar` and a `FeedbackSnackbar` for consistent UI and notifications

## Basic Requirements
- Preserve the separation between controllers, routes, models, and middleware in the backend.
- Use Zod schemas for validation and keep TypeScript types in sync.
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Document new environment variables in the repository README and `.env.example` files.

## User and Staff Functionality
- **Users** are clients of the Moose Jaw Food Bank who book pantry appointments through a React calendar. Selecting a day and time slot creates a record in `bookings` with status `submitted` (pending).
- **Staff** are employees with elevated roles who manage these bookings:
  - Pending bookings appear on the staff Pending page with Approve and Reject buttons.
  - The Pantry schedule's Schedule view marks pending slots with a light orange background and approved slots in green.
  - Staff can assign a user directly to a slot for instant approval, or click any booked slot to cancel or reschedule it (cancellation requires a reason).
  - Pending appointments can be rejected or rescheduled by clicking them; rejections require a reason.
- Users can view a booking history table listing all pending and approved appointments, each with Cancel and Reschedule options.

### Booking Components
- **SlotBooking** renders the calendar shoppers use to view and reserve open time slots.
- **BookingHistory** lists a shopper's pending and approved appointments with actions to cancel or reschedule.
- **PendingBookings** and the schedule view in the staff dashboard show each slot's status and provide Approve/Reject/Reschedule controls.
- **ManageAvailability** lets staff maintain holidays, blocked slots, and recurring breaks.
- **PantrySchedule** marks holidays, blocked slots, and breaks as non bookable entries in the staff schedule.
- **VolunteerSchedule** and `VolunteerScheduleTable` list volunteer shifts by role. Holidays disable pantry, warehouse, and administrative roles, while gardening and special events remain bookable; breaks and blocked slots are ignored.
- Backend controllers such as `bookingController`, `slotController`, `holidayController`, `blockedSlotController`, `breakController`, `volunteerBookingController`, and `volunteerRoleController` enforce business rules and interact with the database.
- Routes in `holidays.ts`, `blockedSlots.ts`, `breaks.ts`, `volunteerBookings.ts`, `volunteerRoles.ts`, and `roles.ts` expose REST endpoints for managing availability and volunteer coordination.

### Database Tables
The booking flow uses the following PostgreSQL tables. **PK** denotes a primary key and **FK** a foreign key.

- **slots** – PK `id`; unique `(start_time, end_time)`; referenced by `bookings.slot_id`, `breaks.slot_id`, and `blocked_slots.slot_id`.
- **staff** – PK `id`; unique `email`; `role` constrained to `staff` or `admin`.
- **users** – PK `id`; unique `email` and `client_id` (1–9,999,999); `role` is `shopper` or `delivery`; referenced by `bookings.user_id`.
- **bookings** – PK `id`; FK `user_id` → `users.id`; FK `slot_id` → `slots.id`; `status` in `submitted|approved|rejected|preapproved|cancelled`; includes `reschedule_token`.
- **breaks** – PK `id`; unique `(day_of_week, slot_id)`; FK `slot_id` → `slots.id`.
- **blocked_slots** – PK `id`; unique `(date, slot_id)`; FK `slot_id` → `slots.id`.
- **holidays** – PK `id`; unique `date`.
- **volunteer_master_roles** – PK `id`.
- **volunteer_roles** – PK `id`; FK `category_id` → `volunteer_master_roles.id`.
- **volunteer_slots** – PK `slot_id`; FK `role_id` → `volunteer_roles.id` (cascade); tracks `max_volunteers`, `is_wednesday_slot`, `is_active`.
- **volunteers** – PK `id`; unique `username`.
- **volunteer_trained_roles** – composite PK `(volunteer_id, role_id)`; FK `volunteer_id` → `volunteers.id` (cascade); FK `role_id` → `volunteer_roles.id` (cascade); FK `category_id` → `volunteer_master_roles.id`.
- **volunteer_bookings** – PK `id`; FK `volunteer_id` → `volunteers.id` (cascade); FK `slot_id` → `volunteer_slots.slot_id` (cascade); `status` in `pending|approved|rejected|cancelled`; includes `reschedule_token`.

## Volunteer Management
Volunteer management coordinates role-based staffing for the food bank.


#### Role categories and subroles

`volunteer_master_roles` defines major categories:

- 1 Pantry
- 2 Warehouse
- 3 Gardening
- 4 Administration
- 5 Special Events

`volunteer_roles` lists subroles and their category IDs:

- 1 Food Sorter (category 2)
- 2 Production Worker (category 2)
- 3 Driver Assistant (category 2)
- 4 Loading Dock Personnel (category 2)
- 5 General Cleaning & Maintenance (category 2)
- 6 Reception (category 1)
- 7 Greeter / Pantry Assistant (category 1)
- 8 Stock Person (category 1)
- 9 Gardening Assistant (category 3)
- 10 Event Organizer (category 5)
- 11 Event Resource Specialist (category 5)
- 12 Volunteer Marketing Associate (category 4)
- 13 Client Resource Associate (category 4)
- 14 Assistant Volunteer Coordinator (category 4)
- 15 Volunteer Office Administrator (category 4)
### API Endpoints

#### Auth
- `POST /auth/request-password-reset` → 204 No Content.
- `POST /auth/change-password` → 204 No Content (auth required).

#### Users
- `POST /users/login` → `{ token, role, name, bookingsThisMonth? }`
- `POST /users` → `{ message: 'User created' }`
- `GET /users/search?search=query` → `[ { id, name, email, phone, client_id } ]`
- `GET /users/me` → `{ id, firstName, lastName, email, phone, clientId, role, bookingsThisMonth }`

#### Staff
- `GET /staff/exists` → `{ exists: boolean }`
- `POST /staff` → `{ message: 'Staff created' }`

#### Slots
- `GET /slots?date=YYYY-MM-DD` → `[ { id, startTime, endTime, maxCapacity, available } ]`
- `GET /slots/all` → `[ { id, startTime, endTime, maxCapacity } ]`

#### Bookings
- `POST /bookings` → `{ message: 'Booking created', bookingsThisMonth, rescheduleToken }`
- `GET /bookings` → `[ { id, status, date, user_id, slot_id, is_staff_booking, reschedule_token, user_name, user_email, user_phone, client_id, bookings_this_month, start_time, end_time } ]`
- `GET /bookings/history` → `[ { id, status, date, slot_id, reason, start_time, end_time, created_at, is_staff_booking, reschedule_token } ]`
- `POST /bookings/:id/decision` → `{ message: 'Booking approved'|'Booking rejected' }`
- `POST /bookings/:id/cancel` → `{ message: 'Booking cancelled' }`
- `POST /bookings/reschedule/:token` → `{ message: 'Booking rescheduled', rescheduleToken }`
- `POST /bookings/preapproved` → `{ message: 'Preapproved booking created', rescheduleToken }`
- `POST /bookings/staff` → `{ message: 'Booking created for user', rescheduleToken }`

#### Holidays
- `GET /holidays` → `[ { date, reason } ]`
- `POST /holidays` → `{ message: 'Added' }`
- `DELETE /holidays/:date` → `{ message: 'Removed' }`

#### Blocked Slots
- `GET /blocked-slots?date=YYYY-MM-DD` → `[ { slotId, reason } ]`
- `POST /blocked-slots` → `{ message: 'Added' }`
- `DELETE /blocked-slots/:date/:slotId` → `{ message: 'Removed' }`

#### Breaks
- `GET /breaks` → `[ { dayOfWeek, slotId, reason } ]`
- `POST /breaks` → `{ message: 'Added' }`
- `DELETE /breaks/:day/:slotId` → `{ message: 'Removed' }`

#### Roles
- `GET /roles` → `[ { categoryId, categoryName, roleId, roleName } ]`
- `GET /roles/:roleId/shifts` → `[ { shiftId, startTime, endTime, maxVolunteers } ]`

#### Volunteers
- `POST /volunteers/login` → `{ token, role: 'volunteer', name }`
- `POST /volunteers` → `{ id }`
- `GET /volunteers/search?search=query` → `[ { id, name, trainedAreas } ]`
- `PUT /volunteers/:id/trained-areas` → `{ id, roleIds }`

#### Volunteer Roles
- `GET /volunteer-roles/mine/grouped?date=YYYY-MM-DD` → `[ { category_id, category, roles: [ { id, name, slots: [...] } ] } ]`
- `GET /volunteer-roles/mine?date=YYYY-MM-DD` → `[ { id, role_id, name, start_time, end_time, max_volunteers, category_id, category_name, is_wednesday_slot, booked, available, status, date } ]`
- `POST /volunteer-roles` → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active, category_name }`
- `GET /volunteer-roles` → `[ { id, role_id, category_id, name, max_volunteers, category_name, shifts } ]`
- `PUT /volunteer-roles/:id` → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active, category_name }`
- `PATCH /volunteer-roles/:id` → `{ id, role_id, name, start_time, end_time, max_volunteers, category_id, is_wednesday_slot, is_active }`
- `DELETE /volunteer-roles/:id` → `{ message: 'Deleted' }`

#### Volunteer Master Roles
- `GET /volunteer-master-roles` → `[ { id, name } ]`

#### Volunteer Bookings
- `POST /volunteer-bookings` → `{ id, role_id, volunteer_id, date, status, reschedule_token, status_color }`
- `POST /volunteer-bookings/staff` → `{ id, role_id, volunteer_id, date, status, reschedule_token, status_color }`
- `GET /volunteer-bookings/mine` → `[ { id, role_id, volunteer_id, date, status, reschedule_token, start_time, end_time, role_name, category_name, status_color } ]`
- `GET /volunteer-bookings/volunteer/:volunteer_id` → `[ { id, role_id, volunteer_id, date, status, reschedule_token, start_time, end_time, role_name, category_name, status_color } ]`
- `GET /volunteer-bookings` → `[ { id, status, role_id, volunteer_id, date, reschedule_token, start_time, end_time, role_name, category_name, volunteer_name, status_color } ]`
- `GET /volunteer-bookings/:role_id` → `[ { id, status, role_id, volunteer_id, date, reschedule_token, start_time, end_time, role_name, category_name, volunteer_name, status_color } ]`
- `PATCH /volunteer-bookings/:id` → `{ id, role_id, volunteer_id, date, status, status_color }`
- `POST /volunteer-bookings/reschedule/:token` → `{ message: 'Volunteer booking rescheduled', rescheduleToken }`

### Components and Workflow

- **VolunteerSchedule** lets volunteers choose a role from a dropdown and view a grid of shifts. Columns correspond to slot numbers and rows show shift times (e.g. 9:30–12:00, 12:30–3:30). Cells display *Booked* or *Available* and clicking an available cell creates a request in `volunteer_bookings`.
- **BookingHistory** shows a volunteer's pending and upcoming bookings with Cancel and Reschedule options.
- **CoordinatorDashboard** is the staff view using `VolunteerScheduleTable`. Staff see volunteer names for booked cells, approve/reject/reschedule pending requests, and cancel or reschedule approved bookings. Staff can also search volunteers, assign them to roles, and update trained areas.

These workflows rely on `volunteer_slots`, `volunteer_roles`, `volunteer_master_roles`, `volunteer_bookings`, `volunteers`, and `volunteer_trained_roles`. Training records in `volunteer_trained_roles` restrict which roles a volunteer can book.
