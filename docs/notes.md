# Booking notes

Clients can include an optional note when booking an appointment. The note is stored with the booking and appears in staff dialogs when managing client bookings or volunteer shifts. This is returned as `client_note` in booking history.

Staff can add notes when recording client visits in the pantry schedule. These notes are stored with the visit and returned as `staff_note`.

Staff and agency users can include staff visit notes in booking history responses by adding `includeStaffNotes=true` to `/bookings/history` and filter visit history by note text using the `notes` query parameter. Client notes are always included.

## Environment variables

This feature does not require any additional environment variables.

## Localization

Add the following translation strings to locale files:

- `help.client.booking_appointments.steps.2`
- `note_label`
- `note_prefix`
- `client_note`
- `staff_note`

Document any new translation keys here when extending note functionality.
