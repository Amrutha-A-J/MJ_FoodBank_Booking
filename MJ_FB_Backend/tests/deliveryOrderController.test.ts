import mockDb from './utils/mockDb';
import {
  createDeliveryOrder,
  cancelDeliveryOrder,
  completeDeliveryOrder,
} from '../src/controllers/deliveryOrderController';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { getDeliverySettings } from '../src/utils/deliverySettings';
import config from '../src/config';
import {
  refreshPantryMonthly,
  refreshPantryWeekly,
  refreshPantryYearly,
} from '../src/controllers/pantry/pantryAggregationController';
import { refreshClientVisitCount } from '../src/controllers/clientVisitController';

jest.mock('../src/config', () => {
  const actual = jest.requireActual('../src/config');
  return {
    __esModule: true,
    default: { ...actual.default, deliveryRequestTemplateId: 99 },
  };
});

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../src/utils/deliverySettings', () => ({
  getDeliverySettings: jest.fn(),
}));

jest.mock('../src/controllers/pantry/pantryAggregationController', () => {
  const actual = jest.requireActual('../src/controllers/pantry/pantryAggregationController');
  return {
    ...actual,
    refreshPantryWeekly: jest.fn().mockResolvedValue(undefined),
    refreshPantryMonthly: jest.fn().mockResolvedValue(undefined),
    refreshPantryYearly: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../src/controllers/clientVisitController', () => {
  const actual = jest.requireActual('../src/controllers/clientVisitController');
  return {
    ...actual,
    refreshClientVisitCount: jest.fn().mockResolvedValue(undefined),
  };
});

const flushPromises = () => new Promise(process.nextTick);

const mockGetDeliverySettings = getDeliverySettings as jest.MockedFunction<
  typeof getDeliverySettings
>;
const MOCK_MONTHLY_LIMIT = 3;

describe('deliveryOrderController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.connect as jest.Mock).mockReset();
    (sendTemplatedEmail as jest.Mock).mockReset();
    mockGetDeliverySettings.mockReset();
    config.deliveryRequestTemplateId = 99;
    mockGetDeliverySettings.mockResolvedValue({
      requestEmail: 'ops@example.com',
      monthlyOrderLimit: MOCK_MONTHLY_LIMIT,
    });
    (refreshPantryWeekly as jest.Mock).mockClear();
    (refreshPantryMonthly as jest.Mock).mockClear();
    (refreshPantryYearly as jest.Mock).mockClear();
    (refreshClientVisitCount as jest.Mock).mockClear();
  });

  describe('createDeliveryOrder', () => {
    let mockClient: { query: jest.Mock; release: jest.Mock };

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn(),
      };
      (mockDb.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    it('rejects selections exceeding category limits', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            itemId: 11,
            categoryId: 5,
            itemName: 'Canned Soup',
            categoryName: 'Pantry',
            maxItems: 1,
          },
        ],
        rowCount: 1,
      });

      const req = {
        user: { role: 'delivery', id: '123', type: 'user' },
        body: {
          clientId: 123,
          address: '123 Main St',
          phone: '555-1111',
          email: 'client@example.com',
          selections: [{ itemId: 11, quantity: 2 }],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Too many items selected for Pantry. Limit is 1.',
      });
      expect(mockDb.connect).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM delivery_items'),
        [[11]],
      );
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('rejects selections exceeding category limits after normalizing duplicates', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            itemId: 11,
            categoryId: 5,
            itemName: 'Canned Soup',
            categoryName: 'Pantry',
            maxItems: 3,
          },
        ],
        rowCount: 1,
      });

      const req = {
        user: { role: 'delivery', id: '123', type: 'user' },
        body: {
          clientId: 123,
          address: '123 Main St',
          phone: '555-1111',
          email: 'client@example.com',
          selections: [
            { itemId: 11, quantity: 2 },
            { itemId: 11, quantity: 2 },
          ],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Too many items selected for Pantry. Limit is 3.',
      });
      expect(mockDb.connect).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM delivery_items'),
        [[11]],
      );
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('creates an order and notifies staff via email', async () => {
      const submittedAt = new Date('2024-06-01T15:30:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              firstName: 'Pat',
              lastName: 'Delivery',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 21,
              categoryId: 8,
              itemName: 'Whole Wheat Bread',
              categoryName: 'Bakery',
              maxItems: 3,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockClient.query.mockImplementation(async (query: string, params?: unknown[]) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return { rows: [], rowCount: 0 };
        }
        if (query.includes('FOR UPDATE')) {
          expect(params).toEqual([456]);
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
        if (query.includes('COUNT(*)')) {
          return { rows: [{ count: '1' }], rowCount: 1 };
        }
        if (query.includes('INSERT INTO delivery_orders')) {
          return {
            rows: [
              {
                id: 77,
                clientId: 456,
                address: '456 Elm St',
                phone: '555-2222',
                email: 'shopper@example.com',
                status: 'pending',
                scheduledFor: null,
                notes: null,
                createdAt: submittedAt,
              },
            ],
            rowCount: 1,
          };
        }
        if (query.includes('INSERT INTO delivery_order_items')) {
          expect(params).toEqual([77, 21, 2]);
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const req = {
        user: { role: 'staff', id: '99', type: 'staff' },
        body: {
          clientId: 456,
          address: '456 Elm St',
          phone: '555-2222',
          email: 'shopper@example.com',
          selections: [
            { itemId: 21, quantity: 2 },
          ],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM clients'),
        [456],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
        [[21]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['456 Elm St', 456],
      );

      expect(mockDb.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      const lockCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('FOR UPDATE'),
      );
      expect(lockCall).toBeDefined();
      expect(lockCall![1]).toEqual([456]);
      const countCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('COUNT(*)'),
      );
      expect(countCall).toBeDefined();
      const [, countParams] = countCall! as [string, unknown[]];
      expect(countParams[0]).toBe(456);
      expect(countParams[1]).toBeInstanceOf(Date);
      expect(countParams[2]).toBeInstanceOf(Date);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 77,
        clientId: 456,
        address: '456 Elm St',
        phone: '555-2222',
        email: 'shopper@example.com',
        status: 'pending',
        scheduledFor: null,
        notes: null,
        createdAt: submittedAt.toISOString(),
        items: [
          {
            itemId: 21,
            quantity: 2,
            itemName: 'Whole Wheat Bread',
            categoryId: 8,
            categoryName: 'Bakery',
          },
        ],
      });

      expect(sendTemplatedEmail).toHaveBeenCalledWith({
        to: 'ops@example.com',
        templateId: config.deliveryRequestTemplateId,
        params: {
          orderId: 77,
          clientId: 456,
          clientName: 'Pat Delivery',
          address: '456 Elm St',
          phone: '555-2222',
          email: 'shopper@example.com',
          itemList: '<strong>Bakery</strong> - Whole Wheat Bread x2<br>',
          createdAt: submittedAt.toISOString(),
        },
      });
    });

    it('does not count cancelled orders toward the monthly limit', async () => {
      const submittedAt = new Date('2024-07-10T18:15:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 52,
              categoryId: 9,
              itemName: 'Fresh Produce Box',
              categoryName: 'Produce',
              maxItems: 2,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockClient.query.mockImplementation(async (query: string, params?: unknown[]) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return { rows: [], rowCount: 0 };
        }
        if (query.includes('FOR UPDATE')) {
          expect(params).toEqual([555]);
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
        if (query.includes('COUNT(*)')) {
          expect(query).toContain("status <> 'cancelled'");
          return { rows: [{ count: '1' }], rowCount: 1 };
        }
        if (query.startsWith('UPDATE clients')) {
          expect(params).toEqual(['789 Pine Ave', '555-3333', 'client@example.com', 555]);
          return { rows: [], rowCount: 1 };
        }
        if (query.includes('INSERT INTO delivery_orders')) {
          return {
            rows: [
              {
                id: 88,
                clientId: 555,
                address: '789 Pine Ave',
                phone: '555-3333',
                email: 'client@example.com',
                status: 'pending',
                scheduledFor: null,
                notes: null,
                createdAt: submittedAt,
              },
            ],
            rowCount: 1,
          };
        }
        if (query.includes('INSERT INTO delivery_order_items')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const req = {
        user: { role: 'delivery', id: '555', type: 'user', name: 'Taylor Client' },
        body: {
          clientId: 555,
          address: '789 Pine Ave',
          phone: '555-3333',
          email: 'client@example.com',
          selections: [
            { itemId: 52, quantity: 1 },
          ],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_items'),
        [[52]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['789 Pine Ave', 555],
      );

      expect(mockDb.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      const lockCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('FOR UPDATE'),
      );
      expect(lockCall).toBeDefined();
      expect(lockCall![1]).toEqual([555]);
      const countCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('COUNT(*)'),
      );
      expect(countCall).toBeDefined();
      const [, countParams] = countCall! as [string, unknown[]];
      expect(countParams[0]).toBe(555);
      expect(countParams[1]).toBeInstanceOf(Date);
      expect(countParams[2]).toBeInstanceOf(Date);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 88,
        clientId: 555,
        address: '789 Pine Ave',
        phone: '555-3333',
        email: 'client@example.com',
        status: 'pending',
        scheduledFor: null,
        notes: null,
        createdAt: submittedAt.toISOString(),
        items: [
          {
            itemId: 52,
            quantity: 1,
            itemName: 'Fresh Produce Box',
            categoryId: 9,
            categoryName: 'Produce',
          },
        ],
      });

      expect(sendTemplatedEmail).toHaveBeenCalledWith({
        to: 'ops@example.com',
        templateId: config.deliveryRequestTemplateId,
        params: {
          orderId: 88,
          clientId: 555,
          clientName: 'Taylor Client',
          address: '789 Pine Ave',
          phone: '555-3333',
          email: 'client@example.com',
          itemList: '<strong>Produce</strong> - Fresh Produce Box<br>',
          createdAt: submittedAt.toISOString(),
        },
      });
    });

    it('updates the client profile when contact details change', async () => {
      const submittedAt = new Date('2024-07-20T18:15:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 52,
              categoryId: 9,
              itemName: 'Fresh Produce Box',
              categoryName: 'Produce',
              maxItems: 2,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockClient.query.mockImplementation(async (query: string, params?: unknown[]) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return { rows: [], rowCount: 0 };
        }
        if (query.includes('FOR UPDATE')) {
          expect(params).toEqual([555]);
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
        if (query.includes('COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1 };
        }
        if (query.startsWith('UPDATE clients')) {
          expect(params).toEqual(['789 Pine Ave', '555-3333', 'client@example.com', 555]);
          return { rows: [], rowCount: 1 };
        }
        if (query.includes('INSERT INTO delivery_orders')) {
          return {
            rows: [
              {
                id: 88,
                clientId: 555,
                address: '789 Pine Ave',
                phone: '555-3333',
                email: 'client@example.com',
                status: 'pending',
                scheduledFor: null,
                notes: null,
                createdAt: submittedAt,
              },
            ],
            rowCount: 1,
          };
        }
        if (query.includes('INSERT INTO delivery_order_items')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const req = {
        user: {
          role: 'delivery',
          id: '555',
          type: 'user',
          address: '456 Old Ave',
          phone: '555-0000',
          email: 'old@example.com',
        },
        body: {
          clientId: 555,
          address: '789 Pine Ave',
          phone: '555-3333',
          email: 'client@example.com',
          selections: [{ itemId: 52, quantity: 1 }],
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_items'),
        [[52]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['789 Pine Ave', 555],
      );

      expect(mockDb.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      const lockCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('FOR UPDATE'),
      );
      expect(lockCall).toBeDefined();
      expect(lockCall![1]).toEqual([555]);
      const countCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('COUNT(*)'),
      );
      expect(countCall).toBeDefined();
      const [, countParams] = countCall! as [string, unknown[]];
      expect(countParams[0]).toBe(555);
      expect(countParams[1]).toBeInstanceOf(Date);
      expect(countParams[2]).toBeInstanceOf(Date);
      expect(req.user).toMatchObject({
        address: '789 Pine Ave',
        phone: '555-3333',
        email: 'client@example.com',
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('accepts orders without an email address', async () => {
      const submittedAt = new Date('2024-07-21T18:15:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 52,
              categoryId: 9,
              itemName: 'Fresh Produce Box',
              categoryName: 'Produce',
              maxItems: 2,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockClient.query.mockImplementation(async (query: string, params?: unknown[]) => {
        if (query === 'BEGIN' || query === 'COMMIT') {
          return { rows: [], rowCount: 0 };
        }
        if (query.includes('FOR UPDATE')) {
          expect(params).toEqual([555]);
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
        if (query.includes('COUNT(*)')) {
          return { rows: [{ count: '0' }], rowCount: 1 };
        }
        if (query.startsWith('UPDATE clients')) {
          expect(params).toEqual(['789 Pine Ave', '555-3333', null, 555]);
          return { rows: [], rowCount: 1 };
        }
        if (query.includes('INSERT INTO delivery_orders')) {
          return {
            rows: [
              {
                id: 91,
                clientId: 555,
                address: '789 Pine Ave',
                phone: '555-3333',
                email: null,
                status: 'pending',
                scheduledFor: null,
                notes: null,
                createdAt: submittedAt,
              },
            ],
            rowCount: 1,
          };
        }
        if (query.includes('INSERT INTO delivery_order_items')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const req = {
        user: {
          role: 'delivery',
          id: '555',
          type: 'user',
          address: '456 Old Ave',
          phone: '555-0000',
          email: 'old@example.com',
        },
        body: {
          clientId: 555,
          address: '789 Pine Ave',
          phone: '555-3333',
          selections: [{ itemId: 52, quantity: 1 }],
        },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_items'),
        [[52]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['789 Pine Ave', 555],
      );

      expect(mockDb.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      const lockCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('FOR UPDATE'),
      );
      expect(lockCall).toBeDefined();
      expect(lockCall![1]).toEqual([555]);
      const countCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('COUNT(*)'),
      );
      expect(countCall).toBeDefined();
      const [, countParams] = countCall! as [string, unknown[]];
      expect(countParams[0]).toBe(555);
      expect(countParams[1]).toBeInstanceOf(Date);
      expect(countParams[2]).toBeInstanceOf(Date);

      expect(req.user).toMatchObject({
        address: '789 Pine Ave',
        phone: '555-3333',
        email: null,
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 91,
        clientId: 555,
        address: '789 Pine Ave',
        phone: '555-3333',
        email: null,
        status: 'pending',
        scheduledFor: null,
        notes: null,
        createdAt: submittedAt.toISOString(),
        items: [
          {
            itemId: 52,
            quantity: 1,
            itemName: 'Fresh Produce Box',
            categoryId: 9,
            categoryName: 'Produce',
          },
        ],
      });

      expect(sendTemplatedEmail).toHaveBeenCalledWith({
        to: 'ops@example.com',
        templateId: config.deliveryRequestTemplateId,
        params: {
          orderId: 91,
          clientId: 555,
          clientName: '',
          address: '789 Pine Ave',
          phone: '555-3333',
          email: null,
          itemList: '<strong>Produce</strong> - Fresh Produce Box<br>',
          createdAt: submittedAt.toISOString(),
        },
      });
    });

    it('rejects a third order in the same month', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            itemId: 42,
            categoryId: 7,
            itemName: 'Pantry Item',
            categoryName: 'Pantry',
            maxItems: 2,
          },
        ],
        rowCount: 1,
      });

      mockClient.query.mockImplementation(async (query: string, params?: unknown[]) => {
        if (query === 'BEGIN') {
          return { rows: [], rowCount: 0 };
        }
        if (query.includes('FOR UPDATE')) {
          expect(params).toEqual([321]);
          return { rows: [{ ok: 1 }], rowCount: 1 };
        }
        if (query.includes('COUNT(*)')) {
          return { rows: [{ count: String(MOCK_MONTHLY_LIMIT) }], rowCount: 1 };
        }
        if (query === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const req = {
        user: { role: 'delivery', id: '321', type: 'user' },
        body: {
          clientId: 321,
          address: '789 Pine Ave',
          phone: '555-3333',
          email: 'third@example.com',
          selections: [
            { itemId: 42, quantity: 1 },
          ],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message:
          `You have already used the food bank ${MOCK_MONTHLY_LIMIT} times this month, which is the limit of ${MOCK_MONTHLY_LIMIT}. Please request again next month`,
      });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM delivery_items'),
        [[42]],
      );
      expect(mockDb.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      const rollbackCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql === 'ROLLBACK',
      );
      expect(rollbackCall).toBeDefined();
      const insertCall = mockClient.query.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO delivery_orders'),
      );
      expect(insertCall).toBeUndefined();
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('prevents concurrent orders from exceeding the monthly limit', async () => {
      const itemRow = {
        itemId: 52,
        categoryId: 9,
        itemName: 'Fresh Produce Box',
        categoryName: 'Produce',
        maxItems: 2,
      };

      (mockDb.query as jest.Mock).mockImplementation(async (query: string) => {
        if (typeof query === 'string' && query.includes('FROM delivery_items')) {
          return { rows: [itemRow], rowCount: 1 };
        }
        if (typeof query === 'string' && query.startsWith('UPDATE clients SET address')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      const firstSubmitted = new Date('2024-08-01T18:00:00Z');
      let inserted = 0;

      const firstClient = {
        query: jest.fn(async (query: string, params?: unknown[]) => {
          if (query === 'BEGIN' || query === 'COMMIT') {
            return { rows: [], rowCount: 0 };
          }
          if (query.includes('FOR UPDATE')) {
            expect(params).toEqual([600]);
            return { rows: [{ ok: 1 }], rowCount: 1 };
          }
          if (query.includes('COUNT(*)')) {
            return { rows: [{ count: String(inserted) }], rowCount: 1 };
          }
          if (query.includes('INSERT INTO delivery_orders')) {
            inserted += 1;
            return {
              rows: [
                {
                  id: 201,
                  clientId: 600,
                  address: '100 Main St',
                  phone: '555-6000',
                  email: 'client@example.com',
                  status: 'pending',
                  scheduledFor: null,
                  notes: null,
                  createdAt: firstSubmitted,
                },
              ],
              rowCount: 1,
            };
          }
          if (query.includes('INSERT INTO delivery_order_items')) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [], rowCount: 0 };
        }),
        release: jest.fn(),
      };

      const secondClient = {
        query: jest.fn(async (query: string, params?: unknown[]) => {
          if (query === 'BEGIN') {
            return { rows: [], rowCount: 0 };
          }
          if (query.includes('FOR UPDATE')) {
            expect(params).toEqual([600]);
            return { rows: [{ ok: 1 }], rowCount: 1 };
          }
          if (query.includes('COUNT(*)')) {
            return { rows: [{ count: String(MOCK_MONTHLY_LIMIT) }], rowCount: 1 };
          }
          if (query === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [], rowCount: 0 };
        }),
        release: jest.fn(),
      };

      (mockDb.connect as jest.Mock)
        .mockResolvedValueOnce(firstClient as any)
        .mockResolvedValueOnce(secondClient as any);

      const makeReq = () =>
        ({
          user: {
            role: 'delivery',
            id: '600',
            type: 'user',
            address: '100 Main St',
            phone: '555-6000',
            email: 'client@example.com',
          },
          body: {
            clientId: 600,
            address: '100 Main St',
            phone: '555-6000',
            email: 'client@example.com',
            selections: [{ itemId: 52, quantity: 1 }],
          },
        } as any);

      const resFactory = () =>
        ({
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any);

      const res1 = resFactory();
      const res2 = resFactory();

      await Promise.all([
        createDeliveryOrder(makeReq(), res1, jest.fn()),
        createDeliveryOrder(makeReq(), res2, jest.fn()),
      ]);
      await flushPromises();

      expect(res1.status).toHaveBeenCalledWith(201);
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(res2.json).toHaveBeenCalledWith({
        message: `You have already used the food bank ${MOCK_MONTHLY_LIMIT} times this month, which is the limit of ${MOCK_MONTHLY_LIMIT}. Please request again next month`,
      });
      expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
      expect(firstClient.release).toHaveBeenCalled();
      expect(secondClient.release).toHaveBeenCalled();
    });
  });

  describe('cancelDeliveryOrder', () => {
    const baseOrderRow = {
      id: 101,
      clientId: 123,
      address: '123 Main St',
      phone: '555-1111',
      email: 'client@example.com',
      status: 'pending',
      scheduledFor: null,
      notes: null,
      createdAt: new Date('2024-06-15T17:00:00Z'),
    };

    it('allows the owning client to cancel a pending order', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [baseOrderRow], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...baseOrderRow, status: 'cancelled' }],
          rowCount: 1,
        });

      const req = {
        user: { role: 'delivery', id: '123', type: 'user' },
        params: { id: '101' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await cancelDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_orders'),
        [101],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE delivery_orders'),
        [101],
      );

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        id: 101,
        clientId: 123,
        address: '123 Main St',
        phone: '555-1111',
        email: 'client@example.com',
        status: 'cancelled',
        scheduledFor: null,
        notes: null,
        createdAt: baseOrderRow.createdAt.toISOString(),
      });
    });

    it('prevents cancelling orders in a non-cancellable status', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...baseOrderRow, status: 'completed' }],
        rowCount: 1,
      });

      const req = {
        user: { role: 'delivery', id: '123', type: 'user' },
        params: { id: '101' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await cancelDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This delivery request cannot be cancelled',
      });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('allows staff to cancel orders for any client', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [baseOrderRow], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...baseOrderRow, status: 'cancelled' }],
          rowCount: 1,
        });

      const req = {
        user: { role: 'staff', id: '99', type: 'staff' },
        params: { id: '101' },
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await cancelDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        id: 101,
        clientId: 123,
        address: '123 Main St',
        phone: '555-1111',
        email: 'client@example.com',
        status: 'cancelled',
        scheduledFor: null,
        notes: null,
        createdAt: baseOrderRow.createdAt.toISOString(),
      });
    });
  });

  describe('completeDeliveryOrder', () => {
    it('records a pantry visit with the delivered weight', async () => {
      const baseOrderRow = {
        id: 101,
        clientId: 123,
        address: '123 Main St',
        phone: '555-1111',
        email: 'client@example.com',
        status: 'completed',
        scheduledFor: new Date('2024-07-15T18:00:00Z'),
        notes: 'Leave at door',
        createdAt: new Date('2024-07-01T15:00:00Z'),
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [baseOrderRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        user: { role: 'staff', id: '7', type: 'staff' },
        params: { id: '101' },
        body: { weight: 37.5 },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await completeDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("SET status = 'completed'"),
        [101],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO client_visits'),
        [expect.any(String), 123, 37.5, 1, 0],
      );
      expect(refreshClientVisitCount).toHaveBeenCalledWith(123);
      expect(refreshPantryWeekly).toHaveBeenCalled();
      expect(refreshPantryMonthly).toHaveBeenCalled();
      expect(refreshPantryYearly).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        id: 101,
        clientId: 123,
        address: '123 Main St',
        phone: '555-1111',
        email: 'client@example.com',
        status: 'completed',
        scheduledFor: new Date('2024-07-15T18:00:00Z').toISOString(),
        notes: 'Leave at door',
        createdAt: new Date('2024-07-01T15:00:00Z').toISOString(),
      });
    });

    it('returns 404 when the delivery order is not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        user: { role: 'staff', id: '7', type: 'staff' },
        params: { id: '999' },
        body: { weight: 12 },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await completeDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Delivery order not found' });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(refreshClientVisitCount).not.toHaveBeenCalled();
    });
  });
});
