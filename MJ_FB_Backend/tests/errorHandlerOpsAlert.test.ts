jest.mock('../src/utils/opsAlert');
import express from 'express';
import request from 'supertest';
import { alertOps } from '../src/utils/opsAlert';
import errorHandler from '../src/middleware/errorHandler';
import { describe, it, expect } from '@jest/globals';

describe('errorHandler ops alert', () => {
  it('includes method and path in ops alert for server errors', async () => {
    const app = express();
    app.get('/fail', () => {
      throw new Error('boom');
    });
    app.use(errorHandler);

    await request(app).get('/fail');

    expect(alertOps).toHaveBeenCalledWith('GET /fail', expect.any(Error));
  });
});
