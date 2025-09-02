# Booking notes

Clients can include an optional note when booking an appointment. The note is stored with the booking and appears in staff dialogs when managing client bookings or volunteer shifts.

Staff can add notes when recording client visits in the pantry schedule. These notes are stored with the visit.

Staff and agency users can include visit notes in booking history responses by adding `includeVisitNotes=true` to `/bookings/history` and filter visit history by note text using the `notes` query parameter.

## Environment variables

This feature does not require any additional environment variables.

## Localization

Add the following translation strings to locale files:

- `help.client.booking_appointments.steps.2`
- `note_label`
- `note_prefix`

Document any new translation keys here when extending note functionality.
