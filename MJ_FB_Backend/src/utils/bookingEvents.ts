import { EventEmitter } from 'events';

export interface BookingEvent {
  action: 'created' | 'cancelled';
  name: string;
  role: 'client' | 'volunteer';
  date: string;
  time: string;
}

class BookingEventEmitter extends EventEmitter {}
export const bookingEvents = new BookingEventEmitter();

export function emitBookingEvent(event: BookingEvent) {
  bookingEvents.emit('booking', event);
}
