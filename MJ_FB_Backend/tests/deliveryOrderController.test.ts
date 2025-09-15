import mockDb from './utils/mockDb';
import { createDeliveryOrder } from '../src/controllers/deliveryOrderController';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

const flushPromises = () => new Promise(process.nextTick);

describe('deliveryOrderController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (sendTemplatedEmail as jest.Mock).mockReset();
  });

  describe('createDeliveryOrder', () => {
    it('rejects selections exceeding category limits', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({
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
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_orders'),
        [123],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
        [[11]],
      );
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('rejects selections exceeding category limits after normalizing duplicates', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({
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
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_orders'),
        [123],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
        [[11]],
      );
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('creates an order and notifies staff via email', async () => {
      const submittedAt = new Date('2024-06-01T15:30:00Z');
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
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
        expect.stringContaining('FROM delivery_orders'),
        [456],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
        [[21]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO delivery_orders'),
        [456, '456 Elm St', '555-2222', 'shopper@example.com'],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO delivery_order_items'),
        [77, 21, 2],
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
            quantity: 2,
            itemName: 'Whole Wheat Bread',
            categoryId: 8,
            categoryName: 'Bakery',
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
          itemList: 'Bakery: Whole Wheat Bread x2',
          createdAt: submittedAt.toISOString(),
        },
      });
    });

    it('rejects a third order in the same month', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
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
        message: "You've reached the monthly delivery limit",
      });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM delivery_orders'),
        [321],
      );
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
    });
  });
});
