import mockDb from './utils/mockDb';
import {
  listDeliveryCategories,
  createDeliveryCategory,
  updateDeliveryCategory,
  deleteDeliveryCategory,
  createDeliveryItem,
  updateDeliveryItem,
  deleteDeliveryItem,
} from '../src/controllers/deliveryCategoryController';

const flushPromises = () => new Promise(process.nextTick);

describe('deliveryCategoryController', () => {
  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  });

  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
  });

  describe('listDeliveryCategories', () => {
    it('returns categories with their mapped items', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Pantry', max_items: 3 },
            { id: 2, name: 'Frozen', max_items: 2 },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 10, category_id: 1, name: 'Beans', is_active: null },
            { id: 11, category_id: 1, name: 'Rice', is_active: false },
            { id: 20, category_id: 2, name: 'Peas', is_active: true },
          ],
          rowCount: 3,
        });

      const res = { json: jest.fn() } as any;

      await listDeliveryCategories({} as any, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledTimes(1);
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload).toHaveLength(2);
      expect(payload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Pantry',
            maxItems: 3,
            items: [
              { id: 10, categoryId: 1, name: 'Beans', isActive: true },
              { id: 11, categoryId: 1, name: 'Rice', isActive: false },
            ],
          }),
          expect.objectContaining({
            id: 2,
            name: 'Frozen',
            maxItems: 2,
            items: [{ id: 20, categoryId: 2, name: 'Peas', isActive: true }],
          }),
        ]),
      );
    });
  });

  describe('createDeliveryCategory', () => {
    it('persists a category and returns it with default items', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Bakery', max_items: 4 }],
        rowCount: 1,
      });

      const req = {
        body: { name: 'Bakery', maxItems: 4 },
      } as any;
      const res = createResponse();

      await createDeliveryCategory(req, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO delivery_categories'),
        ['Bakery', 4],
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 5,
        name: 'Bakery',
        maxItems: 4,
        items: [],
      });
    });
  });

  describe('updateDeliveryCategory', () => {
    it('rejects invalid category ids', async () => {
      const req = {
        params: { id: 'abc' },
        body: { name: 'Produce', maxItems: 2 },
      } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('returns 404 when the category does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        params: { id: '7' },
        body: { name: 'Produce', maxItems: 2 },
      } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });

    it('updates and returns the category when valid', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Dry Goods', max_items: 6 }],
        rowCount: 1,
      });

      const req = {
        params: { id: '3' },
        body: { name: 'Dry Goods', maxItems: 6 },
      } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_categories'),
        ['Dry Goods', 6, 3],
      );
      expect(res.json).toHaveBeenCalledWith({ id: 3, name: 'Dry Goods', maxItems: 6 });
    });
  });

  describe('deleteDeliveryCategory', () => {
    it('validates the category id', async () => {
      const res = createResponse();

      await deleteDeliveryCategory({ params: { id: '0' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
    });

    it('returns 404 when delete affects no rows', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = createResponse();

      await deleteDeliveryCategory({ params: { id: '9' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });

    it('responds with 204 when the category is removed', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = createResponse();

      await deleteDeliveryCategory({ params: { id: '4' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM delivery_categories'),
        [4],
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });
  });

  describe('createDeliveryItem', () => {
    it('requires a valid category id', async () => {
      const res = createResponse();

      await createDeliveryItem({ params: { categoryId: 'x' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('returns 404 when the referenced category is missing', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce({ code: '23503' });

      const req = {
        params: { categoryId: '3' },
        body: { name: 'Bread', isActive: true },
      } as any;
      const res = createResponse();

      await createDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });

    it('persists and returns a new item', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 12, category_id: 3, name: 'Bread', is_active: false }],
        rowCount: 1,
      });

      const req = {
        params: { categoryId: '3' },
        body: { name: 'Bread', isActive: false },
      } as any;
      const res = createResponse();

      await createDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO delivery_items'),
        [3, 'Bread', false],
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 12,
        categoryId: 3,
        name: 'Bread',
        isActive: false,
      });
    });
  });

  describe('updateDeliveryItem', () => {
    it('requires valid category and item ids', async () => {
      const req = { params: { categoryId: '1', itemId: '0' }, body: {} } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category or item id' });
    });

    it('requires at least one field to update', async () => {
      const req = { params: { categoryId: '2', itemId: '5' }, body: {} } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No changes provided' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('returns 404 if no item matches the ids', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        params: { categoryId: '2', itemId: '5' },
        body: { name: 'Canned Soup' },
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_items SET'),
        ['Canned Soup', 5, 2],
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item not found' });
    });

    it('updates the item and returns the mapped entity', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 5, category_id: 2, name: 'Canned Soup', is_active: true }],
        rowCount: 1,
      });

      const req = {
        params: { categoryId: '2', itemId: '5' },
        body: { isActive: true },
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_items SET'),
        [true, 5, 2],
      );
      expect(res.json).toHaveBeenCalledWith({
        id: 5,
        categoryId: 2,
        name: 'Canned Soup',
        isActive: true,
      });
    });
  });

  describe('deleteDeliveryItem', () => {
    it('requires valid identifiers', async () => {
      const res = createResponse();

      await deleteDeliveryItem({ params: { categoryId: 'a', itemId: '1' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category or item id' });
    });

    it('returns 404 when no item is deleted', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = createResponse();

      await deleteDeliveryItem({ params: { categoryId: '2', itemId: '7' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item not found' });
    });

    it('responds with 204 when the item is removed', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = createResponse();

      await deleteDeliveryItem({ params: { categoryId: '2', itemId: '7' } } as any, res as any, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM delivery_items'),
        [7, 2],
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });
  });
});
