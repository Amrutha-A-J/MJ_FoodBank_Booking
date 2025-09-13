# Booking transaction logging

The booking creation workflow now logs each database operation inside its transaction
at the info level. Logs include the `userId`, `slotId`, and `date` for calls to
`lockClientRow`, `countVisitsAndBookingsForMonth`, `isHoliday`, `checkSlotCapacity`,
and `insertBooking` so failures can be traced to the specific step.
