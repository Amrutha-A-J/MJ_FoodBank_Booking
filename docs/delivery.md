# Delivery requests

## Overview

- Clients with the **delivery** role see **Book Delivery** and **Delivery History** in the navigation.
- Only delivery-role clients and staff can submit or cancel delivery orders. Volunteers—including those linked to delivery
  clients—cannot reach the delivery endpoints because the backend requires `req.user.role === 'delivery'`.
- Book Delivery fetches delivery categories and items from `/api/v1/delivery/categories`. Each category exposes a `maxItems` value that caps the total quantity shoppers can request from that category.
- The request form requires the delivery address, phone number, and email. Duplicate item selections are merged automatically before the order is submitted.
- Delivery History lists each request in reverse chronological order so clients can confirm what they previously asked for, review status updates, and see any scheduled drop-off details.
- Clients can cancel requests while they remain in **Pending**, **Approved**, or **Scheduled** status. Once a request is marked **Completed** or **Cancelled**, it is locked for historical reference.

## Configure categories and items

> **Note:** When running the backend in development mode, the server automatically seeds baseline delivery categories and items on startup. Update `src/utils/deliverySeeder.ts` if you need to adjust the default definitions.

1. Sign in as a staff admin and open **Admin → Settings → Pantry**.
2. Use the **Delivery categories** card to create a category and set its **Max items per delivery** limit.
3. Within each category, add the individual items that should be available on the delivery request form.
4. Edit or delete categories and items as offerings change; the Book Delivery page reloads the latest definitions each time it opens.

## Handling new requests

- Every submission to `/api/v1/delivery/orders` sends a Brevo email using `DELIVERY_REQUEST_TEMPLATE_ID`. Update the template when wording changes so the notification still matches the operation team’s process.
- The notification includes the order ID, client ID, client name, contact details, timestamp, and a grouped list of requested items. Each category renders as `<strong>Category</strong> - Item xQuantity` with `<br>` line breaks, and the summary falls back to “No items selected” when a shopper doesn’t add items. Use that email to coordinate fulfillment and scheduling.
- Track progress from the Deliveries management page so everyone sees the latest status, scheduled delivery time, and any notes added for the client. Continue emailing or calling clients when you set or adjust delivery plans so the written record and real-time communication stay in sync.

## Deliveries management for staff

Staff see a **Deliveries** page in the staff navigation. The view lists the newest requests first with each card showing the client’s contact information, requested items, the current status, and any notes entered for the client. Inline actions let the team adjust the status, populate a scheduled delivery date, and mark the order complete without leaving the page. Notes appear verbatim in the client’s delivery history, so keep them clear and action-oriented for shoppers.

- Requests move through five statuses: **Pending**, **Approved**, **Scheduled**, **Completed**, and **Cancelled**. Use Pending for new orders, Approved once the hamper is accepted, Scheduled after you confirm a delivery time, Completed once the hamper is delivered, and Cancelled for duplicates or withdrawals.
- The **Scheduled for** field shows in Delivery History, so update it as soon as you confirm a date. Completed requests stay visible for reporting but drop out of the “needs action” queue.
- Clients are limited to two deliveries per calendar month (cancelled requests do not count). When they reach the limit the app blocks additional submissions until the next month.

### Completion workflow

1. Open the Deliveries page daily to review new Pending requests. Confirm the contact information before proceeding.
2. After approving a hamper, switch the status to **Approved** and add a brief note if the client needs to prepare anything ahead of time.
3. Once a delivery time is confirmed, set the **Scheduled for** date/time and move the request to **Scheduled**. This information feeds the client-facing timeline so they know when to expect their order.
4. Deliver the hamper, then update the request to **Completed**. Add a short note summarizing the outcome (for example, “Delivered on doorstep at 2 PM”) so the client can see the confirmation in Delivery History.
5. If a request must be abandoned, set the status to **Cancelled** with an explanatory note. Clients can submit a new request immediately afterward as long as they remain under the monthly limit.

## Supporting clients

- Create new delivery accounts from **Staff → Client Management → Add Client** by choosing the **Delivery** role. Existing pantry clients can also be converted from the same form.
- Remind delivery clients to keep their contact information current—the form will reject blank address, phone, or email fields.
- Staff can review a client’s delivery history by calling `GET /api/v1/delivery/orders/history?clientId=<id>` with a staff token. This endpoint returns the same payload the client sees in the app.
- Staff → Client Management → History now loads `/api/v1/delivery/orders?clientId=<id>` only when the selected account has the **delivery** role. In that case the booking timeline is replaced with a full-width delivery history that summarizes each hamper’s status, scheduled date, contact details, and requested items so the pantry and delivery teams stay aligned during follow-up calls. Non-delivery clients continue to see their booking timeline.
- Staff may submit a request on a client’s behalf by sending the same payload to `POST /api/v1/delivery/orders`; include the `clientId` in the body so the order is recorded correctly.
- Volunteers cannot submit or cancel delivery orders, even if they are linked to a delivery client account, because the API enforces the delivery role on `req.user`.
