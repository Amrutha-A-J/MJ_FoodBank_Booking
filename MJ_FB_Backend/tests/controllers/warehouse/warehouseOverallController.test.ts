import mockDb from '../../utils/mockDb';
import {
  refreshWarehouseOverall,
  listWarehouseOverall,
  manualWarehouseOverall,
} from '../../../src/controllers/warehouse/warehouseOverallController';

const flushPromises = () => new Promise(process.nextTick);

describe('warehouseOverallController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
  });

  describe('refreshWarehouseOverall', () => {
    it('aggregates monthly totals and refreshes donor data', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 120 }] })
        .mockResolvedValueOnce({ rows: [{ total: 45 }] })
        .mockResolvedValueOnce({ rows: [{ total: 15 }] })
        .mockResolvedValueOnce({ rows: [{ total: 8 }] })
        .mockResolvedValueOnce({
          rows: [{ donorId: 42, total: 60 }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await refreshWarehouseOverall(2024, 5);

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM donations'),
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM surplus_log'),
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('FROM pig_pound_log'),
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('FROM outgoing_donation_log'),
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('FROM donations d'),
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('INSERT INTO warehouse_overall'),
        [2024, 5, 120, 45, 15, 8],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        7,
        'DELETE FROM donor_aggregations WHERE year = $1 AND month = $2',
        [2024, 5],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        8,
        expect.stringContaining('INSERT INTO donor_aggregations'),
        [2024, 5, 42, 60],
      );
    });

    it('defaults totals to zero when no records exist', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await refreshWarehouseOverall(2024, 6);

      expect(mockDb.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('INSERT INTO warehouse_overall'),
        [2024, 6, 0, 0, 0, 0],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        7,
        'DELETE FROM donor_aggregations WHERE year = $1 AND month = $2',
        [2024, 6],
      );
      expect(mockDb.query).toHaveBeenCalledTimes(7);
    });
  });

  describe('listWarehouseOverall', () => {
    it('returns data for the requested year', async () => {
      const rows = [
        { month: 1, donations: 10, surplus: 2, pigPound: 3, outgoingDonations: 4 },
      ];
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows });
      const req = { query: { year: '2022' } } as any;
      const res = { json: jest.fn() } as any;
      const next = jest.fn();

      listWarehouseOverall(req, res, next);
      await flushPromises();

      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [2022]);
      expect(res.json).toHaveBeenCalledWith(rows);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns an empty array when no data is found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const req = { query: { year: '2020' } } as any;
      const res = { json: jest.fn() } as any;

      listWarehouseOverall(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('manualWarehouseOverall', () => {
    it('returns 400 when year or month is invalid', async () => {
      const req = { body: { year: 'invalid', month: '' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      manualWarehouseOverall(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Year and month required' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });
});
