import mockDb from './utils/mockDb';
import { createDeliveryOrder } from '../src/controllers/deliveryOrderController';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import logger from '../src/utils/logger';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const flushPromises = () => new Promise(process.nextTick);

describe('deliveryOrderController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (sendTemplatedEmail as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
  });

  describe('createDeliveryOrder', () => {
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
          selections: [
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
        message: 'Too many items selected for Pantry. Limit is 1.',
      });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('creates an order and notifies staff via email', async () => {
      const submittedAt = new Date('2024-06-01T15:30:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 32,
              categoryId: 9,
              itemName: 'Peas',
              categoryName: 'Frozen',
              maxItems: 4,
            },
            {
              itemId: 21,
              categoryId: 8,
              itemName: 'Whole Wheat Bread',
              categoryName: 'Bakery',
              maxItems: 5,
            },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 77,
              clientId: 456,
              address: '456 Elm St',
              phone: '555-2222',
              email: 'shopper@example.com',
              createdAt: submittedAt,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        user: { role: 'staff', id: '99', type: 'staff' },
        body: {
          clientId: 456,
          address: '456 Elm St',
          phone: '555-2222',
          email: 'shopper@example.com',
          selections: [
            { itemId: 21, quantity: 1 },
            { itemId: 32, quantity: 1 },
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
        expect.stringContaining('FROM delivery_items'),
        [[21, 32]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO delivery_orders'),
        [456, '456 Elm St', '555-2222', 'shopper@example.com'],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO delivery_order_items'),
        [77, 21, 3, 32, 1],
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 77,
        clientId: 456,
        address: '456 Elm St',
        phone: '555-2222',
        email: 'shopper@example.com',
        createdAt: submittedAt.toISOString(),
        items: [
          {
            itemId: 21,
            quantity: 3,
            itemName: 'Whole Wheat Bread',
            categoryId: 8,
            categoryName: 'Bakery',
          },
          {
            itemId: 32,
            quantity: 1,
            itemName: 'Peas',
            categoryId: 9,
            categoryName: 'Frozen',
          },
        ],
      });

      expect(sendTemplatedEmail).toHaveBeenCalledWith({
        to: 'amrutha.laxman@mjfoodbank.org',
        templateId: 16,
        params: {
          orderId: 77,
          clientId: 456,
          address: '456 Elm St',
          phone: '555-2222',
          email: 'shopper@example.com',
          itemList: 'Bakery: Whole Wheat Bread x3\nFrozen: Peas x1',
          createdAt: submittedAt.toISOString(),
        },
      });
    });

    it('logs an error when the notification email fails to send', async () => {
      const submittedAt = new Date('2024-06-02T10:00:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              itemId: 5,
              categoryId: 1,
              itemName: 'Cereal',
              categoryName: 'Pantry',
              maxItems: 4,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 81,
              clientId: 600,
              address: '789 Oak St',
              phone: '555-3333',
              email: 'order@example.com',
              createdAt: submittedAt,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      (sendTemplatedEmail as jest.Mock).mockRejectedValueOnce(new Error('Email down'));

      const req = {
        user: { role: 'staff', id: '77', type: 'staff' },
        body: {
          clientId: 600,
          address: '789 Oak St',
          phone: '555-3333',
          email: 'order@example.com',
          selections: [{ itemId: 5, quantity: 1 }],
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await createDeliveryOrder(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send delivery order notification email',
        expect.any(Error),
      );
    });
  });
});
