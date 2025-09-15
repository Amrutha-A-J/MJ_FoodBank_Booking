jest.mock('../src/utils/configCache', () => {
  let cached: number | null = null;
  const pool = require('../src/db').default;
  return {
    getCartTare: jest.fn(async () => {
      if (cached === null) {
        const result = await pool.query("SELECT value FROM app_config WHERE key = 'cart_tare'");
        cached = Number(result.rows[0]?.value ?? 0);
      }
      return cached;
    }),
    refreshCartTare: jest.fn(async () => {
      cached = null;
      return 0;
    }),
    setCartTare: jest.fn((val: number | null) => {
      cached = val;
    }),
  };
});

import mockDb from './utils/mockDb';
import logger from '../src/utils/logger';
import { getAppConfig, updateAppConfig } from '../src/controllers/admin/appConfigController';
import * as configCache from '../src/utils/configCache';

const flushPromises = () => new Promise(process.nextTick);

describe('appConfigController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configCache.setCartTare(null);
  });

  it('returns cached cart tare', async () => {
    configCache.setCartTare(5);
    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getAppConfig(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ cartTare: 5 });
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('persists new cart tare and refreshes cache', async () => {
    const req = { body: { cartTare: 9 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateAppConfig(req, res, next);

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_config'),
      ['9'],
    );
    expect(configCache.refreshCartTare).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ cartTare: 9 });
    expect(next).not.toHaveBeenCalled();
  });

  it('handles error when fetching config fails', async () => {
    const error = new Error('db fail');
    configCache.setCartTare(null);
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getAppConfig(req, res, next);
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith('Error fetching app config:', error);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('handles error when updating config fails', async () => {
    const error = new Error('db fail');
    const req = { body: { cartTare: 10 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);

    await updateAppConfig(req, res, next);
    await flushPromises();

    expect(logger.error).toHaveBeenCalledWith('Error updating app config:', error);
    expect(next).toHaveBeenCalledWith(error);
  });
});

