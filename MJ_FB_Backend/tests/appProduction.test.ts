import path from 'path';
import request from 'supertest';

jest.setTimeout(15000);

const ORIGINAL_ENV = process.env.NODE_ENV;

describe('app production mode', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('uses static middleware and serves index.html', async () => {
    // require express after resetting modules so app.ts uses this instance
    const express = require('express');

    const staticHandler = jest.fn((_req: any, _res: any, next: any) => {
      next();
    });
    const staticMock = jest
      .spyOn(express, 'static')
      .mockReturnValue(staticHandler);

    const sendImpl = function (this: any, _file: string) {
      this.send('index');
    };
    const sendFileMock = jest
      .spyOn(express.response, 'sendFile')
      .mockImplementation(sendImpl);

    const app = (await import('../src/app')).default;

    await request(app).get('/some-path').expect(200, 'index');

    const frontendPath = path.join(__dirname, '..', '..', 'MJ_FB_Frontend', 'dist');
    const indexPath = path.join(frontendPath, 'index.html');

    expect(staticMock.mock.calls.some(([p]) => p === frontendPath)).toBe(true);
    expect(sendFileMock).toHaveBeenCalledWith(indexPath);

    const next = jest.fn();
    staticHandler({}, {}, next);
    expect(next).toHaveBeenCalledTimes(1);

    const send = jest.fn();
    sendImpl.call({ send }, 'file');
    expect(send).toHaveBeenCalledWith('index');
  });
});
