# Delivery requests

## Overview

- Clients with the **delivery** role see **Book Delivery** and **Delivery History** in the navigation.
- Book Delivery fetches delivery categories and items from `/api/v1/delivery/categories`. Each category exposes a `maxItems` value that caps the total quantity shoppers can request from that category.
- The request form requires the delivery address, phone number, and email. Duplicate item selections are merged automatically before the order is submitted.
- Delivery History lists each request in reverse chronological order so clients can confirm what they previously asked for.

## Configure categories and items

1. Sign in as a staff admin and open **Admin → Settings → Pantry**.
2. Use the **Delivery categories** card to create a category and set its **Max items per delivery** limit.
3. Within each category, add the individual items that should be available on the delivery request form.
4. Edit or delete categories and items as offerings change; the Book Delivery page reloads the latest definitions each time it opens.

## Handling new requests

- Every submission to `/api/v1/delivery/orders` sends a Brevo email using `DELIVERY_REQUEST_TEMPLATE_ID`. Update the template when wording changes so the notification still matches the operation team’s process.
- The notification includes the order ID, client ID, contact details, timestamp, and a newline-delimited list of requested items. Use that email to coordinate fulfillment and scheduling.
- When the delivery date is confirmed, reply to the client with the plan (email or phone) and document the outcome in internal logs as needed. The app does not yet track delivery status, so rely on your operations checklist.

## Supporting clients

- Create new delivery accounts from **Staff → Client Management → Add Client** by choosing the **Delivery** role. Existing pantry clients can also be converted from the same form.
- Remind delivery clients to keep their contact information current—the form will reject blank address, phone, or email fields.
- Staff can review a client’s delivery history by calling `GET /api/v1/delivery/orders/history?clientId=<id>` with a staff token. This endpoint returns the same payload the client sees in the app.
- Staff may submit a request on a client’s behalf by sending the same payload to `POST /api/v1/delivery/orders`; include the `clientId` in the body so the order is recorded correctly.
