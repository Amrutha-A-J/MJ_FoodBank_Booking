# Password visibility toggle

Password fields include an eye icon that lets users show or hide the typed value.

## Localization

Add the following translation strings to locale files:

- `show_password`
- `hide_password`
- `email_or_client_id` – label for the password reset field
- `password_reset_instructions` – instructs users to enter their email or client ID and submit to receive a reset link via email
- `profile_page.password_requirements` – helper text describing password rules
- `profile_page.password_checklist.min_length` – checklist item for minimum length
- `profile_page.password_checklist.uppercase` – checklist item for an uppercase letter
- `profile_page.password_checklist.lowercase` – checklist item for a lowercase letter
- `profile_page.password_checklist.symbol` – checklist item for a symbol

## Password setup identifier

The password setup page now displays the account identifier from the token.
Client tokens show the **Client ID** while staff and volunteer tokens show the
associated **Email** address.

## Role-specific login reminder

After fetching token details, the password setup page shows a message directing
users to the correct login screen for their role and provides a button linking
to that page.

Add these translation strings to locale files:

- `use_client_login`
- `use_volunteer_login`
- `use_staff_login`
- `use_agency_login`
