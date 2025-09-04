# Booking notes

Clients can enter a **client note** when booking an appointment. The client note is stored with the booking and appears in staff dialogs when managing client bookings or volunteer shifts.

Staff can add a **staff note** when recording client visits in the pantry schedule. Staff notes are stored with the visit.

Staff users automatically receive staff notes in booking history responses. Agency users can include staff notes by adding `includeStaffNotes=true` to `/bookings/history`. Both roles can filter visit history by note text using the `notes` query parameter. The notes-only filter matches visits that contain either client or staff notes.

## Environment variables

This feature does not require any additional environment variables.

## Localization

Add the following translation strings to locale files:

- `help.client.booking_appointments.steps.2`
- `dashboard`
- `client_note_label`
- `staff_note_label`
- `notes`
- `visits_with_notes_only`

Document any new translation keys here when extending note functionality.
