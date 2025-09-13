# Notification preferences

Clients and volunteers can manage email reminder settings from the Profile page.

## API
- `GET /users/me/preferences` returns `{ emailReminders }`.
- `PUT /users/me/preferences` updates `{ emailReminders }`.

Email reminders default to `true`.

