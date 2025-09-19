import request from 'supertest';
import express from 'express';
import deliveryOrdersRouter from '../src/routes/delivery/orders';
import pool from '../src/db';

let mockUser: any = { id: '42', role: 'delivery', type: 'user' };

jest.mock('../src/middleware/authMiddleware', () => ({
  __esModule: true,
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  }),
  authorizeRoles: (...roles: string[]) =>
    (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return next();
    },
}));

const app = express();
app.use(express.json());
app.use('/delivery/orders', deliveryOrdersRouter);

describe('delivery orders routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: '42', role: 'delivery', type: 'user' };
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
            status: 'pending',
            scheduledFor: null,
            notes: null,
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
        status: 'pending',
        scheduledFor: null,
        notes: null,
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

  it('requires staff role to list outstanding delivery orders', async () => {
    const res = await request(app).get('/delivery/orders/outstanding');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('lists outstanding delivery orders for staff users', async () => {
    mockUser = { id: '7', role: 'staff', type: 'staff' };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            clientId: 88,
            clientName: 'Casey Client',
            address: '10 River Ave',
            phone: '555-1111',
            email: null,
            status: 'pending',
            scheduledFor: null,
            notes: 'Leave at back door',
            createdAt: '2024-07-01T14:00:00Z',
          },
          {
            id: 205,
            clientId: 93,
            clientName: null,
            address: '22 Pine St',
            phone: '555-2222',
            email: 'shopper@example.com',
            status: 'scheduled',
            scheduledFor: '2024-07-12T16:30:00Z',
            notes: null,
            createdAt: '2024-07-05T09:15:00Z',
          },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            orderId: 101,
            itemId: 301,
            quantity: 2,
            itemName: 'Apples',
            categoryId: 40,
            categoryName: 'Produce',
          },
          {
            orderId: 101,
            itemId: 205,
            quantity: 1,
            itemName: 'Whole Wheat Bread',
            categoryId: 12,
            categoryName: 'Bakery',
          },
          {
            orderId: 205,
            itemId: 410,
            quantity: 3,
            itemName: 'Milk',
            categoryId: 8,
            categoryName: 'Dairy',
          },
        ],
        rowCount: 3,
      });

    const res = await request(app).get('/delivery/orders/outstanding');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 101,
        clientId: 88,
        clientName: 'Casey Client',
        address: '10 River Ave',
        phone: '555-1111',
        email: null,
        status: 'pending',
        scheduledFor: null,
        notes: 'Leave at back door',
        createdAt: '2024-07-01T14:00:00.000Z',
        items: [
          {
            itemId: 205,
            quantity: 1,
            itemName: 'Whole Wheat Bread',
            categoryId: 12,
            categoryName: 'Bakery',
          },
          {
            itemId: 301,
            quantity: 2,
            itemName: 'Apples',
            categoryId: 40,
            categoryName: 'Produce',
          },
        ],
      },
      {
        id: 205,
        clientId: 93,
        clientName: null,
        address: '22 Pine St',
        phone: '555-2222',
        email: 'shopper@example.com',
        status: 'scheduled',
        scheduledFor: '2024-07-12T16:30:00.000Z',
        notes: null,
        createdAt: '2024-07-05T09:15:00.000Z',
        items: [
          {
            itemId: 410,
            quantity: 3,
            itemName: 'Milk',
            categoryId: 8,
            categoryName: 'Dairy',
          },
        ],
      },
    ]);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("status <> 'completed'"),
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("status <> 'cancelled'"),
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('JOIN clients'),
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM delivery_order_items'),
      [[101, 205]],
    );
  });

  it('requires staff role to complete a delivery order', async () => {
    const res = await request(app).post('/delivery/orders/55/complete');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('marks a delivery order as completed', async () => {
    mockUser = { id: '99', role: 'staff', type: 'staff' };

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 55,
          clientId: 300,
          address: '789 Pine St',
          phone: '555-1234',
          email: 'shopper@example.com',
          status: 'completed',
          scheduledFor: '2024-07-22T18:00:00Z',
          notes: 'Leave at front desk',
          createdAt: '2024-07-10T17:30:00Z',
        },
      ],
      rowCount: 1,
    });

    const res = await request(app).post('/delivery/orders/55/complete');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 55,
      clientId: 300,
      address: '789 Pine St',
      phone: '555-1234',
      email: 'shopper@example.com',
      status: 'completed',
      scheduledFor: '2024-07-22T18:00:00.000Z',
      notes: 'Leave at front desk',
      createdAt: '2024-07-10T17:30:00.000Z',
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'completed'"),
      [55],
    );
  });
});
