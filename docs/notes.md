# Booking notes

Clients can enter a **client note** when booking an appointment. The client note is stored with the booking and appears in staff dialogs when managing client bookings or volunteer shifts.

Staff can add a **staff note** when recording client visits in the pantry schedule. Staff notes are stored with the visit.

Staff booking history views display only staff notes for visited bookings; client notes remain hidden.

Staff users automatically receive staff notes in booking history responses. Other roles cannot request staff notes. Staff can filter visit history by note text using the `notes` query parameter. The notes-only filter matches visits that contain either client or staff notes.

The "visits with notes only" filter appears only on staff booking history pages and is hidden from clients.

## Environment variables

This feature does not require any additional environment variables.

