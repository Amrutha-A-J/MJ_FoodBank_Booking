# Email Templates

This document catalogs Brevo email templates used by the backend and the
parameters supplied to each template.

| Template reference | Purpose | Params | Used in |
| ------------------- | ------- | ------ | ------- |
| `PASSWORD_SETUP_TEMPLATE_ID` | Account invitations and password reset emails | `link`, `token` | `authController.ts`, `agencyController.ts`, `admin/staffController.ts`, `admin/adminStaffController.ts`, `volunteerController.ts`, `userController.ts` |
| `BOOKING_CONFIRMATION_TEMPLATE_ID` | Booking approval confirmations for clients | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `outlookCalendarLink`, `type` | `bookingController.ts` |
| `BOOKING_REMINDER_TEMPLATE_ID` | Next-day booking reminders for clients | `body`, `cancelLink`, `rescheduleLink`, `type` | `bookingReminderJob.ts` |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Volunteer shift confirmation emails | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `outlookCalendarLink`, `type` | `volunteerBookingController.ts` |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID` | Volunteer shift reminder emails | `body`, `cancelLink`, `rescheduleLink`, `type` | `volunteerShiftReminderJob.ts` |

Brevo templates can reference these `params.*` values to display links and other
dynamic content. The `body` parameter includes the booking date with the weekday and time range.

Cancellation, no-show, volunteer notification, and agency client update emails have been discontinued.

## Volunteer booking confirmation and reminder emails

- **Template ID variables:** `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID`, `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the shift.
  - `cancelLink` (string) – link for the recipient to cancel their shift.
  - `rescheduleLink` (string) – link allowing rescheduling.
  - `googleCalendarLink` (string) – URL to add the shift to Google Calendar.
  - `outlookCalendarLink` (string) – URL to add the shift to Outlook Calendar.
  - `type` (string) – booking type, e.g., `volunteer shift`.

Recurring volunteer bookings also reuse the reminder template so volunteers receive cancel and reschedule links.


