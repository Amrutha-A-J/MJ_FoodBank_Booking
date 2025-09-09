# Notification preferences

Clients and volunteers can manage notification settings from the Profile page.

## API
- `GET /users/me/preferences` returns `{ emailReminders, pushNotifications }`.
- `PUT /users/me/preferences` updates `{ emailReminders, pushNotifications }`.

Both options default to `true`.

## Localization
Add these translation keys to locale files:
- `profile_page.notifications`
- `profile_page.email_reminders`
- `profile_page.push_notifications`
- `profile_page.preferences_saved`
- `help.client.manage_profile_and_password.steps.1`
