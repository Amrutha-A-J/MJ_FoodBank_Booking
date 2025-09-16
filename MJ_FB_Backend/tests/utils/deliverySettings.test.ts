import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

const DEFAULT_EMAIL = 'amrutha.laxman@mjfoodbank.org';

describe('deliverySettings', () => {
  const originalMonthlyLimit = process.env.DELIVERY_MONTHLY_ORDER_LIMIT;

  beforeEach(() => {
    jest.resetModules();
    mockQuery.mockReset();
  });

  afterEach(() => {
    if (originalMonthlyLimit === undefined) {
      delete process.env.DELIVERY_MONTHLY_ORDER_LIMIT;
    } else {
      process.env.DELIVERY_MONTHLY_ORDER_LIMIT = originalMonthlyLimit;
    }
  });

  it('returns defaults when env vars are missing', async () => {
    delete process.env.DELIVERY_MONTHLY_ORDER_LIMIT;
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { getDeliverySettings } = await import('../../src/utils/deliverySettings');
    const settings = await getDeliverySettings();

    expect(settings).toEqual({
      requestEmail: DEFAULT_EMAIL,
      monthlyOrderLimit: 2,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT value FROM app_config WHERE key = 'delivery_request_email'",
    );
  });

  it('reads the monthly order limit from environment variables', async () => {
    process.env.DELIVERY_MONTHLY_ORDER_LIMIT = '3';
    mockQuery.mockResolvedValueOnce({ rows: [{ value: 'ops@example.com ' }] });

    const { getDeliverySettings } = await import('../../src/utils/deliverySettings');
    const settings = await getDeliverySettings();

    expect(settings.requestEmail).toBe('ops@example.com');
    expect(settings.monthlyOrderLimit).toBe(3);
  });

  it('throws when the monthly limit exceeds the allowed range', async () => {
    process.env.DELIVERY_MONTHLY_ORDER_LIMIT = '10';

    await expect(import('../../src/utils/deliverySettings')).rejects.toThrow(
      'DELIVERY_MONTHLY_ORDER_LIMIT must be between 1 and 5',
    );
  });
});
