# Email Templates

This document catalogs Brevo email templates used by the backend and the parameters passed to each template.

## Password setup email

- **Template ID variable:** `PASSWORD_SETUP_TEMPLATE_ID` (exposed as `config.passwordSetupTemplateId`)
- **Used in:**
  - `MJ_FB_Backend/src/controllers/authController.ts` (`requestPasswordReset`, `resendPasswordSetup`)
  - `MJ_FB_Backend/src/controllers/agencyController.ts` (`createAgency`)
  - `MJ_FB_Backend/src/controllers/admin/staffController.ts` (`createStaff`)
  - `MJ_FB_Backend/src/controllers/admin/adminStaffController.ts` (`createStaff`)
  - `MJ_FB_Backend/src/controllers/volunteer/volunteerController.ts` (`createVolunteer`, `createVolunteerShopperProfile`)
  - `MJ_FB_Backend/src/controllers/userController.ts` (`createUser`)
- **Params:**
  - `link` (string) – one-time URL to the `/set-password` page that lets the recipient create or reset their password.
  - `token` (string) – raw token value for templates that build the link internally.

## Booking confirmation and reminder emails

- **Template ID variables:** `BOOKING_CONFIRMATION_TEMPLATE_ID`, `BOOKING_REMINDER_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the booking.
  - `cancelLink` (string) – link for the recipient to cancel their booking.
  - `rescheduleLink` (string) – link allowing rescheduling.
  - `googleCalendarLink` (string) – URL to add the booking to Google Calendar.
  - `outlookCalendarLink` (string) – URL to add the booking to Outlook Calendar.

Brevo templates can reference these `params.*` values to display actionable links such as “Add to Google Calendar” or “Add to Outlook Calendar”.

## Booking status emails

- **Template ID variable:** `BOOKING_STATUS_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the booking status update.
  - `type` (string) – booking type, e.g., `shopping appointment`.

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

