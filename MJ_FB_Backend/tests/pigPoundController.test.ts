import mockDb from './utils/mockDb';
import {
  listPigPounds,
  addPigPound,
  updatePigPound,
  deletePigPound,
} from '../src/controllers/warehouse/pigPoundController';
import { refreshWarehouseOverall } from '../src/controllers/warehouse/warehouseOverallController';

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  refreshWarehouseOverall: jest.fn(),
}));

const flushPromises = () => new Promise(process.nextTick);

describe('pigPoundController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (refreshWarehouseOverall as jest.Mock).mockReset();
  });

  it('lists pig pounds for a date', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 1, date: '2024-05-20', weight: 10 },
      ],
    });
    const req = { query: { date: '2024-05-20' } } as any;
    const res = { json: jest.fn() } as any;
    await listPigPounds(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ['2024-05-20']);
    expect(res.json).toHaveBeenCalledWith([
      { id: 1, date: '2024-05-20', weight: 10 },
    ]);
  });

  it('requires date for listing', async () => {
    const req = { query: {} } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await listPigPounds(req, res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Date required' });
  });

  it('handles database error on list', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { query: { date: '2024-05-20' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await listPigPounds(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('adds pig pound entry', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 1, date: '2024-05-20', weight: 10 }],
    });
    const req = { body: { date: '2024-05-20', weight: 10 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await addPigPound(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [
      '2024-05-20',
      10,
    ]);
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, date: '2024-05-20', weight: 10 });
  });

  it('handles database error on add', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { body: { date: '2024-05-20', weight: 10 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    await addPigPound(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('updates pig pound entry', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, date: '2024-05-21', weight: 12 }],
      });
    const req = { params: { id: '1' }, body: { date: '2024-05-21', weight: 12 } } as any;
    const res = { json: jest.fn() } as any;
    await updatePigPound(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '2024-05-21',
      12,
      '1',
    ]);
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
    expect(res.json).toHaveBeenCalledWith({ id: 1, date: '2024-05-21', weight: 12 });
  });

  it('handles database error on update', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { params: { id: '1' }, body: { date: '2024-05-21', weight: 12 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await updatePigPound(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('deletes pig pound entry', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({});
    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    await deletePigPound(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), ['1']);
    expect(refreshWarehouseOverall).toHaveBeenCalledWith(2024, 5);
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
  });

  it('handles database error on delete', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await deletePigPound(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

