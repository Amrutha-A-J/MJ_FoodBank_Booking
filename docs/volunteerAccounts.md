# Volunteer accounts

Create volunteers from the Volunteers page. When **Online Access** is enabled, the email field becomes mandatory and an invitation email is sent.
Volunteers sign in with their email address instead of a username. Volunteer emails must be unique, though volunteers without online access can be added without an email.

Volunteer shift bookings are automatically approved when a slot is available; staff do not review or approve shifts.

When updating trained roles via `PUT /volunteers/:id/trained-areas`, provide the complete array of role IDs; roles not included in the request are removed from the volunteer.
