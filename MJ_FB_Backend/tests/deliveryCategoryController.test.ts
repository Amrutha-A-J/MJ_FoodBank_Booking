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
  const createResponse = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    return { json, status, send } as any;
  };

  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
  });

  describe('listDeliveryCategories', () => {
    it('returns categories with nested items grouped by category', async () => {
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
            { id: 10, category_id: 1, name: 'Beans', is_active: true },
            { id: 11, category_id: 1, name: 'Rice', is_active: null },
            { id: 12, category_id: 2, name: 'Fish', is_active: false },
          ],
          rowCount: 3,
        });

      const res = createResponse();

      await listDeliveryCategories({} as any, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM delivery_categories'),
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM delivery_items'),
      );

      expect(res.json).toHaveBeenCalledWith([
        {
          id: 1,
          name: 'Pantry',
          maxItems: 3,
          items: [
            { id: 10, categoryId: 1, name: 'Beans', isActive: true },
            { id: 11, categoryId: 1, name: 'Rice', isActive: true },
          ],
        },
        {
          id: 2,
          name: 'Frozen',
          maxItems: 2,
          items: [{ id: 12, categoryId: 2, name: 'Fish', isActive: false }],
        },
      ]);
    });
  });

  describe('createDeliveryCategory', () => {
    it('creates a new category and returns it with empty items', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Produce', max_items: 4 }],
        rowCount: 1,
      });

      const req = { body: { name: 'Produce', maxItems: 4 } } as any;
      const res = createResponse();

      await createDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO delivery_categories'),
        ['Produce', 4],
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 5,
        name: 'Produce',
        maxItems: 4,
        items: [],
      });
    });
  });

  describe('updateDeliveryCategory', () => {
    it('requires a valid numeric id', async () => {
      const req = { params: { id: 'abc' }, body: { name: 'Pantry', maxItems: 5 } } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('updates an existing category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 7, name: 'Dry Goods', max_items: 6 }],
        rowCount: 1,
      });

      const req = {
        params: { id: '7' },
        body: { name: 'Dry Goods', maxItems: 6 },
      } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_categories'),
        ['Dry Goods', 6, 7],
      );
      expect(res.json).toHaveBeenCalledWith({ id: 7, name: 'Dry Goods', maxItems: 6 });
    });

    it('responds with 404 when the category does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        params: { id: '12' },
        body: { name: 'Pantry', maxItems: 5 },
      } as any;
      const res = createResponse();

      await updateDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });
  });

  describe('deleteDeliveryCategory', () => {
    it('requires a valid numeric id', async () => {
      const req = { params: { id: 'xyz' } } as any;
      const res = createResponse();

      await deleteDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('deletes an existing category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const req = { params: { id: '4' } } as any;
      const res = createResponse();

      await deleteDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM delivery_categories'),
        [4],
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('responds with 404 when the category does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req = { params: { id: '9' } } as any;
      const res = createResponse();

      await deleteDeliveryCategory(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });
  });

  describe('createDeliveryItem', () => {
    it('requires a valid category id', async () => {
      const req = { params: { categoryId: 'abc' }, body: { name: 'Milk' } } as any;
      const res = createResponse();

      await createDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('creates a new item for the category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 15, category_id: 3, name: 'Milk', is_active: true }],
        rowCount: 1,
      });

      const req = {
        params: { categoryId: '3' },
        body: { name: 'Milk', isActive: true },
      } as any;
      const res = createResponse();

      await createDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO delivery_items'),
        [3, 'Milk', true],
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 15,
        categoryId: 3,
        name: 'Milk',
        isActive: true,
      });
    });

    it('returns 404 when the category does not exist', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce({ code: '23503' });

      const req = { params: { categoryId: '8' }, body: { name: 'Cereal' } } as any;
      const res = createResponse();

      await createDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
    });
  });

  describe('updateDeliveryItem', () => {
    it('requires valid category and item ids', async () => {
      const req = {
        params: { categoryId: '1', itemId: 'foo' },
        body: { name: 'Beans' },
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category or item id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('requires at least one change', async () => {
      const req = {
        params: { categoryId: '1', itemId: '2' },
        body: {},
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No changes provided' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('updates the item in the specified category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 22, category_id: 4, name: 'Brown Rice', is_active: false }],
        rowCount: 1,
      });

      const req = {
        params: { categoryId: '4', itemId: '22' },
        body: { name: 'Brown Rice', isActive: false },
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_items'),
        ['Brown Rice', false, 22, 4],
      );
      expect(res.json).toHaveBeenCalledWith({
        id: 22,
        categoryId: 4,
        name: 'Brown Rice',
        isActive: false,
      });
    });

    it('responds with 404 when the item does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = {
        params: { categoryId: '2', itemId: '30' },
        body: { name: 'Pasta' },
      } as any;
      const res = createResponse();

      await updateDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item not found' });
    });
  });

  describe('deleteDeliveryItem', () => {
    it('requires valid category and item ids', async () => {
      const req = { params: { categoryId: 'x', itemId: '1' } } as any;
      const res = createResponse();

      await deleteDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category or item id' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('deletes an item from the category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const req = { params: { categoryId: '5', itemId: '12' } } as any;
      const res = createResponse();

      await deleteDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM delivery_items'),
        [12, 5],
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('responds with 404 when the item does not exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const req = { params: { categoryId: '5', itemId: '20' } } as any;
      const res = createResponse();

      await deleteDeliveryItem(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item not found' });
    });
  });
});
