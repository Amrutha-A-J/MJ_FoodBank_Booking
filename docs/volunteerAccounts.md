# Volunteer accounts

Create volunteers from the Volunteers page. When **Online Access** is enabled, the email field becomes mandatory and an invitation email is sent.
Volunteers sign in with their email address instead of a username. Volunteer emails must be unique, though volunteers without online access can be added without an email.

When editing a volunteer's trained roles, send the full list of role IDs to `PUT /volunteers/:id/trained-areas`; roles not included in the request are removed.
