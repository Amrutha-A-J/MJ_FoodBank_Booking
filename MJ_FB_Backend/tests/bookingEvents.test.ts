import { registerBookingStream, sendBookingEvent } from '../src/utils/bookingEvents';
import type { Response } from 'express';

describe('bookingEvents', () => {
  it('delivers events to registered clients', () => {
    const res = {
      write: jest.fn(),
      on: jest.fn(),
    } as unknown as Response;
    registerBookingStream(res);
    const event = { action: 'created', name: 'Test', role: 'client', date: '2024-01-01', time: '09:00:00' } as const;
    sendBookingEvent(event);
    expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(event)}\n\n`);
  });
});
