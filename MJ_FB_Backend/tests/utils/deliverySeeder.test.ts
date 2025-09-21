import mockPool from '../utils/mockDb';
import * as deliverySeeder from '../../src/utils/deliverySeeder';
import { DeliveryCategorySeedDefinition } from '../../src/utils/deliverySeeder';
import { createDeliveryCategory, createDeliveryItem } from '../../src/models/delivery';

jest.mock('../../src/models/delivery', () => ({
  __esModule: true,
  createDeliveryCategory: jest.fn(),
  createDeliveryItem: jest.fn(),
}));

describe('deliverySeeder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPool.query as jest.Mock).mockReset();
    (createDeliveryCategory as jest.Mock).mockReset();
    (createDeliveryItem as jest.Mock).mockReset();
  });

  describe('seedDeliveryCategory', () => {
    it('updates existing categories when max_items changes and seeds missing items once', async () => {
      const definition: DeliveryCategorySeedDefinition = {
        name: 'Existing Category',
        maxItems: 3,
        items: ['First Item', 'Second Item'],
      };

      (mockPool.query as jest.Mock).mockImplementation(async (sql: string) => {
        if (sql.startsWith('SELECT id, max_items FROM delivery_categories')) {
          return { rowCount: 1, rows: [{ id: 42, max_items: 1 }] };
        }
        if (sql.startsWith('UPDATE delivery_categories SET max_items')) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.startsWith('SELECT id FROM delivery_items')) {
          return { rowCount: 0, rows: [] };
        }
        throw new Error(`Unexpected query: ${sql}`);
      });

      (createDeliveryItem as jest.Mock).mockResolvedValue({ id: 1 });

      await deliverySeeder.seedDeliveryCategory(definition, mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, max_items FROM delivery_categories WHERE name = $1',
        [definition.name],
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE delivery_categories SET max_items = $1 WHERE id = $2',
        [definition.maxItems, 42],
      );
      expect(createDeliveryItem).toHaveBeenCalledTimes(definition.items.length);
      expect(createDeliveryItem).toHaveBeenNthCalledWith(1, 42, 'First Item', mockPool);
      expect(createDeliveryItem).toHaveBeenNthCalledWith(2, 42, 'Second Item', mockPool);
    });

    it('creates new categories and avoids reseeding existing items', async () => {
      const definition: DeliveryCategorySeedDefinition = {
        name: 'New Category',
        maxItems: 2,
        items: ['Unique Item'],
      };

      (createDeliveryCategory as jest.Mock).mockResolvedValue({ id: 7 });
      (createDeliveryItem as jest.Mock).mockResolvedValue({ id: 11 });

      (mockPool.query as jest.Mock)
        .mockImplementationOnce(async (sql: string) => {
          expect(sql).toBe('SELECT id, max_items FROM delivery_categories WHERE name = $1');
          return { rowCount: 0, rows: [] };
        })
        .mockImplementationOnce(async (sql: string) => {
          expect(sql).toBe('SELECT id FROM delivery_items WHERE category_id = $1 AND name = $2');
          return { rowCount: 0, rows: [] };
        })
        .mockImplementationOnce(async (sql: string) => {
          expect(sql).toBe('SELECT id, max_items FROM delivery_categories WHERE name = $1');
          return { rowCount: 1, rows: [{ id: 7, max_items: definition.maxItems }] };
        })
        .mockImplementationOnce(async (sql: string) => {
          expect(sql).toBe('SELECT id FROM delivery_items WHERE category_id = $1 AND name = $2');
          return { rowCount: 1, rows: [{ id: 22 }] };
        });

      await deliverySeeder.seedDeliveryCategory(definition, mockPool);
      await deliverySeeder.seedDeliveryCategory(definition, mockPool);

      expect(createDeliveryCategory).toHaveBeenCalledTimes(1);
      expect(createDeliveryCategory).toHaveBeenCalledWith(definition.name, definition.maxItems, mockPool);
      expect(createDeliveryItem).toHaveBeenCalledTimes(1);
      expect(createDeliveryItem).toHaveBeenCalledWith(7, 'Unique Item', mockPool);
      const updateCall = (mockPool.query as jest.Mock).mock.calls.find(([sql]: [string]) =>
        sql.startsWith('UPDATE delivery_categories SET max_items'),
      );
      expect(updateCall).toBeUndefined();
    });
  });

  describe('seedDeliveryData', () => {
    it('delegates to seedDeliveryCategory for each definition', async () => {
      const definitions: DeliveryCategorySeedDefinition[] = [
        { name: 'Category A', maxItems: 1, items: ['A1'] },
        { name: 'Category B', maxItems: 2, items: ['B1'] },
      ];
      const processedNames: string[] = [];

      let nextCategoryId = 1;
      (createDeliveryCategory as jest.Mock).mockImplementation(async () => ({ id: nextCategoryId++ }));
      let nextItemId = 1;
      (createDeliveryItem as jest.Mock).mockImplementation(async () => ({ id: nextItemId++ }));

      (mockPool.query as jest.Mock).mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.startsWith('SELECT id, max_items FROM delivery_categories')) {
          processedNames.push(params[0] as string);
          return { rowCount: 0, rows: [] };
        }
        if (sql.startsWith('SELECT id FROM delivery_items')) {
          return { rowCount: 0, rows: [] };
        }
        throw new Error(`Unexpected query: ${sql}`);
      });

      await deliverySeeder.seedDeliveryData(definitions, mockPool);

      expect(processedNames).toEqual(['Category A', 'Category B']);
      expect(createDeliveryCategory).toHaveBeenCalledTimes(definitions.length);
    });
  });
});
