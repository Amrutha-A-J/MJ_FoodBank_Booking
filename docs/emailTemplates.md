# Email Templates

This document catalogs Brevo email templates used by the backend and the
parameters supplied to each template.

| Template reference | Purpose | Params | Used in |
| ------------------- | ------- | ------ | ------- |
| `PASSWORD_SETUP_TEMPLATE_ID` | Account invitations and password reset emails | `link`, `token` | `authController.ts`, `agencyController.ts`, `admin/staffController.ts`, `admin/adminStaffController.ts`, `volunteerController.ts`, `userController.ts` |
| `BOOKING_CONFIRMATION_TEMPLATE_ID` | Booking approval confirmations for clients | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `outlookCalendarLink`, `type` | `bookingController.ts` |
| `BOOKING_REMINDER_TEMPLATE_ID` | Next-day booking reminders for clients | `body`, `cancelLink`, `rescheduleLink`, `type` | `bookingReminderJob.ts` |
| `templateId: 1` | Booking cancellations and reschedules | `body`, `type` | `bookingController.ts` |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Volunteer shift confirmation emails | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `outlookCalendarLink`, `type` | `volunteerBookingController.ts` |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID` | Volunteer shift reminder emails | `body`, `cancelLink`, `rescheduleLink`, `type` | `volunteerShiftReminderJob.ts` |
| `templateId: 0` | Volunteer booking notifications (cancellations, coordinator notices, recurring bookings) | `subject`, `body` | `volunteerBookingController.ts` |
| `VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID` | Nightly coordinator alerts for volunteer no-shows | `ids` | `volunteerNoShowCleanupJob.ts` |
| `templateId: 1` | Agency membership additions or removals | `body` | `agencyController.ts` |
| `BADGE_MILESTONE_TEMPLATE_ID` | Milestone badge emails with downloadable card | `body`, `cardUrl` | `badgeUtils.ts` |

Brevo templates can reference these `params.*` values to display links and other
dynamic content.

## Booking status emails

- **Template ID variable:** `BOOKING_STATUS_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the booking status update.
  - `type` (string) – booking type, e.g., `shopping appointment`.

No-show emails are no longer sent.

## Volunteer booking confirmation and reminder emails

- **Template ID variables:** `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID`, `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the shift.
  - `cancelLink` (string) – link for the recipient to cancel their shift.
  - `rescheduleLink` (string) – link allowing rescheduling.
  - `googleCalendarLink` (string) – URL to add the shift to Google Calendar.
  - `outlookCalendarLink` (string) – URL to add the shift to Outlook Calendar.
  - `type` (string) – booking type, e.g., `volunteer shift`.

## Volunteer booking notification emails

- **Template ID variable:** `VOLUNTEER_BOOKING_NOTIFICATION_TEMPLATE_ID`
- **Params:**
  - `subject` (string) – email subject.
  - `body` (string) – message body describing the update.

## Volunteer no-show notification emails

- **Template ID variable:** `VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID`
- **Params:**
  - `ids` (string) – comma-separated volunteer booking IDs marked as no-show.

## Agency client update emails

- **Template ID variable:** `AGENCY_CLIENT_UPDATE_TEMPLATE_ID`
- **Used in:**
  - `MJ_FB_Backend/src/controllers/agencyController.ts` (`addClientToAgency`, `removeClientFromAgency`)
- **Params:**
  - `body` (string) – message describing the client added to or removed from the agency.

## Milestone badge emails

- **Template ID variable:** `BADGE_MILESTONE_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the milestone.
  - `cardUrl` (string) – link to download the badge card.

