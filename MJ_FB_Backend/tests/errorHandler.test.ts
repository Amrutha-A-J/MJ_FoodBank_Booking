import express from 'express';
import request from 'supertest';
import errorHandler from '../src/middleware/errorHandler';
import logger from '../src/utils/logger';

describe('global error handler', () => {
  it('hides internal messages for 500 errors', async () => {
    const app = express();

    app.get('/boom', () => {
      const err: any = new Error('Sensitive internal details');
      err.status = 500;
      throw err;
    });

    app.use(errorHandler);

    const spy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal Server Error');
    expect(res.body.message).not.toContain('Sensitive internal details');
    expect(spy).toHaveBeenCalledWith('Unhandled error:', 'Sensitive internal details', expect.any(Error));

    spy.mockRestore();
  });
});
