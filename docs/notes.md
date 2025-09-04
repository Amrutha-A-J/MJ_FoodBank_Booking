# Booking notes

Clients can enter a **client note** when booking an appointment. The client note is stored with the booking and appears in staff dialogs when managing client bookings or volunteer shifts.

Staff can add a **staff note** when recording client visits in the pantry schedule. Staff notes are stored with the visit.

Staff and agency users can include staff notes in booking history responses by adding `includeStaffNotes=true` to `/bookings/history` and filter visit history by note text using the `notes` query parameter.

## Environment variables

This feature does not require any additional environment variables.

## Localization

Add the following translation strings to locale files:

- `help.client.booking_appointments.steps.2`
- `client_note_label`
- `staff_note_label`
- `visits_with_staff_notes_only`

Document any new translation keys here when extending note functionality.
