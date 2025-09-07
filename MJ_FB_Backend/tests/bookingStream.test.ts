import { EventEmitter } from 'events';
import { streamBookings } from '../src/controllers/bookingStreamController';
import { emitBookingEvent } from '../src/utils/bookingEvents';

test('streamBookings writes booking events and cleans up on close', () => {
  const req = new EventEmitter();
  const write = jest.fn();
  const res: any = { setHeader: jest.fn(), write, flushHeaders: jest.fn() };
  streamBookings(req as any, res as any);
  const evt = {
    action: 'created' as const,
    name: 'Test User',
    role: 'client' as const,
    date: '2024-01-01',
    time: '09:00:00',
  };
  emitBookingEvent(evt);
  expect(write).toHaveBeenCalledWith(`data: ${JSON.stringify(evt)}\n\n`);
  write.mockClear();
  req.emit('close');
  emitBookingEvent(evt);
  expect(write).not.toHaveBeenCalled();
});
