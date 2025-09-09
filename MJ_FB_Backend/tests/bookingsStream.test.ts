import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { EventSource } from 'undici';
import bookingsRouter from '../src/routes/bookings';
import { sendBookingEvent } from '../src/utils/bookingEvents';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);

describe('GET /bookings/stream', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('receives booking events via SSE', async () => {
    const es = new EventSource(`${baseUrl}/bookings/stream`);

    try {
      await new Promise<void>((resolve, reject) => {
        es.onopen = () => resolve();
        es.onerror = (err) => reject(err);
      });

      const messagePromise = new Promise<MessageEvent>((resolve) => {
        es.onmessage = (event) => resolve(event);
      });

      const event = {
        action: 'created' as const,
        name: 'Test User',
        role: 'client' as const,
        date: '2024-01-01',
        time: '09:00:00',
      };

      sendBookingEvent(event);

      const message = await messagePromise;
      expect(message.data).toBe(JSON.stringify(event));
    } finally {
      es.close();
    }
  });
});
