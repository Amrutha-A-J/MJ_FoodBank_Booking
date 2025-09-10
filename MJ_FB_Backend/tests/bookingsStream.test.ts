import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { EventSource } from 'undici';
import request from 'supertest';
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
    server.closeAllConnections();
    server.close(done);
  });

  it('receives booking events via SSE', async () => {
    await new Promise<void>((resolve, reject) => {
      const req = request(baseUrl).head('/bookings/stream');
      req.on('response', (res) => {
        try {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toMatch(/text\/event-stream/);
        } catch (err) {
          reject(err);
          return;
        }
        req.abort();
        resolve();
      });
      req.on('error', reject);
      req.end();
    });

    const ac = new AbortController();
    const es = new EventSource(`${baseUrl}/bookings/stream`, { signal: ac.signal });

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('onopen timeout')), 1000);
        es.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        es.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
      });

      const messagePromise = new Promise<MessageEvent>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('message timeout')), 1000);
        es.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event);
        };
        es.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
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
      ac.abort();
    }
  });
});
