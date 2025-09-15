import mockDb from './utils/mockDb';
import {
  listDonations,
  addDonation,
  updateDonation,
  deleteDonation,
  manualDonorAggregation,
  donorAggregations,
  exportDonorAggregations,
} from '../src/controllers/warehouse/donationController';
import { refreshWarehouseOverall } from '../src/controllers/warehouse/warehouseOverallController';
import writeXlsxFile from 'write-excel-file/node';

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  refreshWarehouseOverall: jest.fn(),
}));

jest.mock('write-excel-file/node', () => jest.fn());

const flushPromises = () => new Promise(process.nextTick);

describe('donationController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (refreshWarehouseOverall as jest.Mock).mockReset();
    (writeXlsxFile as jest.Mock).mockReset();
  });

  describe('listDonations', () => {
    it('lists donations for a date', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            weight: 10,
            donorId: 2,
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'a@example.com',
          },
        ],
      });
      const req = { query: { date: '2024-05-20' } } as any;
      const res = { json: jest.fn() } as any;
      await listDonations(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ['2024-05-20']);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 1,
          date: '2024-05-20',
          weight: 10,
          donorId: 2,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'a@example.com',
        },
      ]);
    });

    it('lists donations for a month', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-05-01',
            weight: 10,
            donorId: 2,
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'a@example.com',
          },
        ],
      });
      const req = { query: { month: '2024-05' } } as any;
      const res = { json: jest.fn() } as any;
      await listDonations(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ['2024-05-01', '2024-06-01']);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 1,
          date: '2024-05-01',
          weight: 10,
          donorId: 2,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'a@example.com',
        },
      ]);
    });

    it('requires date or month', async () => {
      const req = { query: {} } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await listDonations(req, res, jest.fn());
      await flushPromises();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Date or month required' });
    });

    it('validates month format', async () => {
      const req = { query: { month: '2024-13' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await listDonations(req, res, jest.fn());
      await flushPromises();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid month' });
    });

    it('handles database errors', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const req = { query: { date: '2024-05-20' } } as any;
      const res = { json: jest.fn() } as any;
      const next = jest.fn();
      await listDonations(req, res, next);
      await flushPromises();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('addDonation', () => {
    it('adds a donation', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { id: 2, firstName: 'Alice', lastName: 'Smith', email: 'a@example.com' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, date: '2024-05-20', weight: 10 },
          ],
        });
      const req = { body: { date: '2024-05-20', donorId: 2, weight: 10 } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await addDonation(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id, first_name AS "firstName", last_name AS "lastName", email FROM donors WHERE id = $1',
        [2],
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO donations (date, donor_email, weight) VALUES ($1, $2, $3) RETURNING id, date, weight',
        ['2024-05-20', 'a@example.com', 10],
      );
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        date: '2024-05-20',
        weight: 10,
        donorId: 2,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'a@example.com',
      });
    });

    it('handles database errors', async () => {
      (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const req = { body: { date: '2024-05-20', donorId: 2, weight: 10 } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();
      await addDonation(req, res, next);
      await flushPromises();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateDonation', () => {
    it('updates a donation and refreshes old month when changed', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ date: '2024-04-30' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 2, firstName: 'Alice', lastName: 'Smith', email: 'a@example.com' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, date: '2024-05-02', weight: 15 }],
        });
      const req = {
        params: { id: '1' },
        body: { date: '2024-05-02', donorId: 2, weight: 15 },
      } as any;
      const res = { json: jest.fn() } as any;
      await updateDonation(req, res, jest.fn());
      await flushPromises();
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 4);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        date: '2024-05-02',
        weight: 15,
        donorId: 2,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'a@example.com',
      });
    });
  });

  describe('deleteDonation', () => {
    it('deletes a donation', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
        .mockResolvedValueOnce({});
      const req = { params: { id: '1' } } as any;
      const res = { json: jest.fn() } as any;
      await deleteDonation(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
      expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), ['1']);
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
      expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
    });
  });

  describe('manualDonorAggregation', () => {
    it('saves manual donor aggregation', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({});
      const req = {
        body: { year: 2024, month: 5, donorEmail: 'a@example.com', total: 100 },
      } as any;
      const res = { json: jest.fn() } as any;
      await manualDonorAggregation(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [
        2024,
        5,
        'a@example.com',
        100,
      ]);
      expect(res.json).toHaveBeenCalledWith({ message: 'Saved' });
    });

    it('validates required fields', async () => {
      const req = { body: { year: 2024, month: 5 } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await manualDonorAggregation(req, res, jest.fn());
      await flushPromises();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Year, month, and donorEmail required' });
    });
  });

  describe('donorAggregations', () => {
    it('returns donor aggregations for the year', async () => {
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const rows = [
        ...months.map(month => ({
          donor: 'Alice',
          email: 'alice@example.com',
          month,
          total: month === 1 ? 100 : month === 2 ? 50 : 0,
        })),
        ...months.map(month => ({ donor: 'Bob', email: 'bob@example.com', month, total: 0 })),
      ];
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows });
      const req = { query: { year: '2024' } } as any;
      const res = { json: jest.fn() } as any;
      await donorAggregations(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [2024]);
      expect(res.json).toHaveBeenCalledWith([
        {
          donor: 'Alice',
          email: 'alice@example.com',
          monthlyTotals: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          total: 150,
        },
        {
          donor: 'Bob',
          email: 'bob@example.com',
          monthlyTotals: Array(12).fill(0),
          total: 0,
        },
      ]);
    });
  });

  describe('exportDonorAggregations', () => {
    it('exports donor aggregations to xlsx', async () => {
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const rows = [
        ...months.map(month => ({
          donor: 'Alice',
          month,
          total: month === 1 ? 100 : 0,
        })),
        ...months.map(month => ({ donor: 'Bob', month, total: 0 })),
      ];
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows });
      const buffer = Buffer.from('file');
      (writeXlsxFile as jest.Mock).mockResolvedValue(buffer);
      const req = { query: { year: '2024' } } as any;
      const res = {
        setHeader: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;
      await exportDonorAggregations(req, res, jest.fn());
      await flushPromises();
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [2024]);
      expect(writeXlsxFile).toHaveBeenCalledWith(expect.any(Array), {
        sheet: 'Donor Aggregations 2024',
        buffer: true,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=2024_donor_aggregations.xlsx',
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});

