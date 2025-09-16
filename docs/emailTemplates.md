# Email Templates

This document catalogs Brevo email templates used by the backend and the
parameters supplied to each template.

| Template reference | Purpose | Params | Used in |
| ------------------- | ------- | ------ | ------- |
| `PASSWORD_SETUP_TEMPLATE_ID` | Account invitations and password reset emails | `link`, `token`, `clientId`, `role`, `loginLink` | `authController.ts`, `agencyController.ts`, `admin/staffController.ts`, `admin/adminStaffController.ts`, `volunteerController.ts`, `userController.ts` |
| `BOOKING_CONFIRMATION_TEMPLATE_ID` | Booking approval confirmations for clients | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` | `bookingController.ts` |
| `BOOKING_REMINDER_TEMPLATE_ID` | Next-day booking reminders for clients | `body`, `cancelLink`, `rescheduleLink`, `type` | `bookingReminderJob.ts` |
| `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID` | Volunteer shift confirmation emails | `body`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` | `volunteerBookingController.ts` |
| `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID` | Volunteer shift reminder emails | `body`, `cancelLink`, `rescheduleLink`, `type` | `volunteerShiftReminderJob.ts` |
| `CLIENT_RESCHEDULE_TEMPLATE_ID` | Booking reschedule notifications for clients | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` | `bookingController.ts` |
| `VOLUNTEER_RESCHEDULE_TEMPLATE_ID` | Volunteer shift reschedule emails | `oldDate`, `oldTime`, `newDate`, `newTime`, `cancelLink`, `rescheduleLink`, `googleCalendarLink`, `appleCalendarLink`, `type` | `volunteerBookingController.ts` |
| `DELIVERY_REQUEST_TEMPLATE_ID` | Delivery request notifications for staff | `orderId`, `clientId`, `clientName`, `address`, `phone`, `email`, `itemList`, `createdAt` | `deliveryOrderController.ts` |

Client and volunteer reschedule notifications share Brevo template ID **10**.

Brevo templates can reference these `params.*` values to display links and other
dynamic content. The `body` parameter includes the booking date with the weekday and time range.

Calendar emails also attach an ICS file so recipients can download the event directly.
If `ICS_BASE_URL` is configured, the `appleCalendarLink` points to the hosted `.ics`
file; otherwise it falls back to a base64 `data:` URI.

Cancellation, no-show, volunteer notification, and agency client update emails have been discontinued.

## Delivery request notifications

- **Template ID variable:** `DELIVERY_REQUEST_TEMPLATE_ID`
- **Params:**
  - `orderId` (number) – database ID for the delivery order.
  - `clientId` (number) – client identifier recorded with the order.
  - `clientName` (string) – shopper name assembled from their client profile; blank when not available.
  - `address` (string) – delivery address submitted on the form.
  - `phone` (string) – phone number supplied by the client.
  - `email` (string) – contact email for scheduling follow-up.
  - `itemList` (string) – newline-delimited summary grouped by category, e.g.
    ```
    Bakery
    - Whole Wheat Bread x2
    - White Bread x1

    Produce
    - Carrot Bundle x1
    ```
  - `createdAt` (ISO 8601 string) – submission timestamp for the request.

Operations staff receive the email at the address configured under **Admin → Settings → Pantry → Delivery**.

## Volunteer booking confirmation and reminder emails

- **Template ID variables:** `VOLUNTEER_BOOKING_CONFIRMATION_TEMPLATE_ID`, `VOLUNTEER_BOOKING_REMINDER_TEMPLATE_ID`
- **Params:**
  - `body` (string) – message body describing the shift.
  - `cancelLink` (string) – link for the recipient to cancel their shift.
  - `rescheduleLink` (string) – link allowing rescheduling.
  - `googleCalendarLink` (string) – URL to add the shift to Google Calendar.
  - `appleCalendarLink` (string) – URL to add the shift to Apple Calendar.
  - `type` (string) – booking type, e.g., `volunteer shift`.

Recurring volunteer bookings also reuse the reminder template so volunteers receive cancel and reschedule links.


