# Password visibility toggle

Password fields include an eye icon that lets users show or hide the typed value.

## Localization

Add the following translation strings to locale files:

- `show_password`
- `hide_password`
- `client_reset_password_instructions` – instructs clients to enter their client ID and submit to receive a reset link via email

## Password setup identifier

The password setup page now displays the account identifier from the token.
Client tokens show the **Client ID** while staff and volunteer tokens show the
associated **Email** address.
