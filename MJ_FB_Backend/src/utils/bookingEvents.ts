import type { Response } from 'express';

export interface BookingEvent {
  action: 'created' | 'cancelled';
  name: string;
  role: 'client' | 'volunteer';
  date: string;
  time: string;
}

const clients = new Set<Response>();

export function registerBookingStream(res: Response) {
  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
  });
}

export function sendBookingEvent(event: BookingEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}
