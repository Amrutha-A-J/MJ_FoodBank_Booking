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
The booking flow relies on the following PostgreSQL tables:

```sql
CREATE TABLE IF NOT EXISTS slots (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    max_capacity integer NOT NULL,
    UNIQUE (start_time, end_time)
);

CREATE TABLE IF NOT EXISTS staff (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    role varchar(50) NOT NULL CHECK (role IN ('staff', 'admin')),
    email varchar(255) NOT NULL UNIQUE,
    password varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS breaks (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    day_of_week integer NOT NULL,
    slot_id integer NOT NULL,
    reason text,
    UNIQUE (day_of_week, slot_id),
    FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

CREATE TABLE IF NOT EXISTS blocked_slots (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    date date NOT NULL,
    slot_id integer NOT NULL,
    reason text,
    UNIQUE (date, slot_id),
    FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

CREATE TABLE IF NOT EXISTS holidays (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    date date NOT NULL UNIQUE,
    reason text
);

CREATE TABLE IF NOT EXISTS users (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    first_name text,
    last_name text,
    email text UNIQUE,
    phone text,
    password text NOT NULL,
    client_id bigint NOT NULL UNIQUE CHECK (client_id >= 1 AND client_id <= 9999999),
    role text NOT NULL CHECK (role IN ('shopper', 'delivery')),
    bookings_this_month integer DEFAULT 0,
    booking_count_last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    user_id integer,
    slot_id integer,
    status text NOT NULL CHECK (status = ANY (ARRAY['submitted', 'approved', 'rejected', 'preapproved', 'cancelled'])),
    request_data text,
    date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_staff_booking boolean DEFAULT false,
    reschedule_token text,
    FOREIGN KEY (slot_id) REFERENCES public.slots(id),
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS volunteer_master_roles (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name text NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteer_roles (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name text NOT NULL,
    category_id integer NOT NULL REFERENCES public.volunteer_master_roles(id)
);

CREATE TABLE IF NOT EXISTS volunteer_slots (
    slot_id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    role_id integer NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    max_volunteers integer NOT NULL,
    is_wednesday_slot boolean DEFAULT false,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS volunteers (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    username text NOT NULL UNIQUE,
    password text NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteer_trained_roles (
    volunteer_id integer NOT NULL,
    role_id integer NOT NULL,
    category_id integer NOT NULL REFERENCES public.volunteer_master_roles(id),
    PRIMARY KEY (volunteer_id, role_id),
    FOREIGN KEY (volunteer_id) REFERENCES public.volunteers(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES public.volunteer_roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS volunteer_bookings (
    id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    volunteer_id integer NOT NULL,
    slot_id integer NOT NULL,
    date date NOT NULL,
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reschedule_token text,
    FOREIGN KEY (slot_id) REFERENCES public.volunteer_slots(slot_id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES public.volunteers(id) ON DELETE CASCADE
);
```
