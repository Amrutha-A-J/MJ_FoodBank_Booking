import express from 'express';
import request from 'supertest';
import errorHandler from '../src/middleware/errorHandler';

describe('404 middleware', () => {
  it('returns 404 for unknown routes before hitting error handler', async () => {
    const app = express();
    const handlerSpy = jest.fn();

    app.use((req, res) => res.status(404).json({ message: 'Not found' }));
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      handlerSpy();
      return errorHandler(err, req, res, next);
    });

    const res = await request(app).get('/missing');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not found' });
    expect(handlerSpy).not.toHaveBeenCalled();
  });
});
