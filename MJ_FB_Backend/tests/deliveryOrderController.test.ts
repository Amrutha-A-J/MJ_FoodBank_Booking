import mockDb from './utils/mockDb';
import { createDeliveryOrder, cancelDeliveryOrder } from '../src/controllers/deliveryOrderController';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import { getDeliverySettings } from '../src/utils/deliverySettings';
import config from '../src/config';

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

const flushPromises = () => new Promise(process.nextTick);

const mockGetDeliverySettings = getDeliverySettings as jest.MockedFunction<
  typeof getDeliverySettings
>;

describe('deliveryOrderController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (sendTemplatedEmail as jest.Mock).mockReset();
    mockGetDeliverySettings.mockReset();
    config.deliveryRequestTemplateId = 99;
    mockGetDeliverySettings.mockResolvedValue({
      requestEmail: 'ops@example.com',
    });
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
        expect.stringContaining('America/Regina'),
        [123],
      );
      const firstQuery = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(firstQuery).toContain('FROM delivery_orders');
      expect(firstQuery).toContain("status <> 'cancelled'");
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
        expect.stringContaining('America/Regina'),
        [123],
      );
      const firstQuery = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(firstQuery).toContain('FROM delivery_orders');
      expect(firstQuery).toContain("status <> 'cancelled'");
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
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
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
        expect.stringContaining('America/Regina'),
        [456],
      );
      const firstQuery = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(firstQuery).toContain('FROM delivery_orders');
      expect(firstQuery).toContain("status <> 'cancelled'");
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM clients'),
        [456],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('FROM delivery_items'),
        [[21]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO delivery_orders'),
        [456, '456 Elm St', '555-2222', 'shopper@example.com', 'pending', null, null],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        5,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['456 Elm St', 456],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        6,
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
        .mockImplementationOnce(async (query: string) => {
          if (!query.includes("status <> 'cancelled'")) {
            return { rows: [{ count: '2' }], rowCount: 1 };
          }
          return { rows: [{ count: '1' }], rowCount: 1 };
        })
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
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
        expect.stringContaining('America/Regina'),
        [555],
      );
      const firstQuery = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(firstQuery).toContain('FROM delivery_orders');
      expect(firstQuery).toContain("status <> 'cancelled'");
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
        [[52]],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE clients'),
        ['789 Pine Ave', '555-3333', 'client@example.com', 555],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO delivery_orders'),
        [555, '789 Pine Ave', '555-3333', 'client@example.com', 'pending', null, null],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        5,
        'UPDATE clients SET address = $1 WHERE client_id = $2',
        ['789 Pine Ave', 555],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('INSERT INTO delivery_order_items'),
        [88, 52, 1],
      );

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
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
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
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
        3,
        expect.stringContaining('UPDATE clients'),
        ['789 Pine Ave', '555-3333', 'client@example.com', 555],
      );
      expect(req.user).toMatchObject({
        address: '789 Pine Ave',
        phone: '555-3333',
        email: 'client@example.com',
      });

      expect(res.status).toHaveBeenCalledWith(201);
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
        message:
          'You have already used the food bank 2 times this month, please request again next month',
      });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('America/Regina'),
        [321],
      );
      const firstQuery = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(firstQuery).toContain('FROM delivery_orders');
      expect(firstQuery).toContain("status <> 'cancelled'");
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
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
});
