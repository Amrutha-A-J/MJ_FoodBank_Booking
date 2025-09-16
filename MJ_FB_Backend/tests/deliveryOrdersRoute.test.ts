import request from 'supertest';
import express from 'express';
import deliveryOrdersRouter from '../src/routes/delivery/orders';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  __esModule: true,
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: '42', role: 'delivery', type: 'user' };
    next();
  },
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/delivery/orders', deliveryOrdersRouter);

describe('delivery orders routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the authenticated client order history at /delivery/orders', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 12,
            clientId: 42,
            address: '123 Main St',
            phone: '555-0000',
            email: 'client@example.com',
            createdAt: '2024-07-10T15:00:00Z',
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            orderId: 12,
            itemId: 7,
            quantity: 3,
            itemName: 'Canned Soup',
            categoryId: 5,
            categoryName: 'Pantry',
          },
        ],
        rowCount: 1,
      });

    const res = await request(app).get('/delivery/orders');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 12,
        clientId: 42,
        address: '123 Main St',
        phone: '555-0000',
        email: 'client@example.com',
        createdAt: '2024-07-10T15:00:00.000Z',
        items: [
          {
            itemId: 7,
            quantity: 3,
            itemName: 'Canned Soup',
            categoryId: 5,
            categoryName: 'Pantry',
          },
        ],
      },
    ]);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM delivery_orders'),
      [42],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM delivery_order_items'),
      [[12]],
    );
  });
});
