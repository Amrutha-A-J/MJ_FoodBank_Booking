# Password visibility toggle

Password fields include an eye icon that lets users show or hide the typed value.

## Localization

Add the following translation strings to locale files:

- `show_password`
- `hide_password`
- `email_or_client_id` – label for the password reset field
- `password_reset_instructions` – instructs users to enter their email or client ID and submit to receive a reset link via email

## Password setup identifier

The password setup page now displays the account identifier from the token.
Client tokens show the **Client ID** while staff and volunteer tokens show the
associated **Email** address.
