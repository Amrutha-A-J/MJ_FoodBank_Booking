import { Request, Response } from 'express';
import { bookingEvents, BookingEvent } from '../utils/bookingEvents';

export function streamBookings(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const listener = (event: BookingEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  bookingEvents.on('booking', listener);
  req.on('close', () => {
    bookingEvents.off('booking', listener);
  });
}
