import mockDb from './utils/mockDb';
import {
  listSurplus,
  addSurplus,
  updateSurplus,
  deleteSurplus,
} from '../src/controllers/warehouse/surplusController';
import { getWarehouseSettings } from '../src/utils/warehouseSettings';
import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../src/utils/warehouseRefresh';

jest.mock('../src/utils/warehouseSettings', () => ({
  getWarehouseSettings: jest.fn(),
}));

jest.mock('../src/utils/warehouseRefresh', () => ({
  refreshWarehouseForDate: jest.fn(),
  refreshWarehouseForDateChange: jest.fn(),
}));

const flushPromises = () => new Promise(process.nextTick);

describe('surplusController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (getWarehouseSettings as jest.Mock).mockReset();
    (refreshWarehouseForDate as jest.Mock).mockReset();
    (refreshWarehouseForDateChange as jest.Mock).mockReset();
  });

  it('lists surplus entries', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 1, date: '2024-05-20', type: 'BREAD', count: 2, weight: 1 },
      ],
    });
    const req = {} as any;
    const res = { json: jest.fn() } as any;
    await listSurplus(req, res, jest.fn());
    await flushPromises();
    expect(res.json).toHaveBeenCalledWith([
      { id: 1, date: '2024-05-20', type: 'BREAD', count: 2, weight: 1 },
    ]);
  });

  it('handles database error on list', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await listSurplus(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('adds surplus entry', async () => {
    (getWarehouseSettings as jest.Mock).mockResolvedValue({
      breadWeightMultiplier: 0.5,
      cansWeightMultiplier: 1,
    });
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 1, date: '2024-05-20', type: 'BREAD', count: 2, weight: 1 }],
    });
    const req = { body: { date: '2024-05-20', type: 'BREAD', count: 2 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await addSurplus(req, res, jest.fn());
    await flushPromises();
    expect(getWarehouseSettings).toHaveBeenCalled();
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [
      '2024-05-20',
      'BREAD',
      2,
      1,
    ]);
    expect(refreshWarehouseForDate).toHaveBeenCalledWith('2024-05-20');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      date: '2024-05-20',
      type: 'BREAD',
      count: 2,
      weight: 1,
    });
  });

  it('handles database error on add', async () => {
    (getWarehouseSettings as jest.Mock).mockResolvedValue({
      breadWeightMultiplier: 0.5,
      cansWeightMultiplier: 1,
    });
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { body: { date: '2024-05-20', type: 'BREAD', count: 2 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    await addSurplus(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('updates surplus entry', async () => {
    (getWarehouseSettings as jest.Mock).mockResolvedValue({
      breadWeightMultiplier: 0.5,
      cansWeightMultiplier: 1,
    });
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, date: '2024-05-21', type: 'BREAD', count: 2, weight: 1 }],
      });
    const req = {
      params: { id: '1' },
      body: { date: '2024-05-21', type: 'BREAD', count: 2 },
    } as any;
    const res = { json: jest.fn() } as any;
    await updateSurplus(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '2024-05-21',
      'BREAD',
      2,
      1,
      '1',
    ]);
    expect(refreshWarehouseForDateChange).toHaveBeenCalledWith('2024-05-21', '2024-05-20');
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      date: '2024-05-21',
      type: 'BREAD',
      count: 2,
      weight: 1,
    });
  });

  it('handles database error on update', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = {
      params: { id: '1' },
      body: { date: '2024-05-21', type: 'BREAD', count: 2 },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await updateSurplus(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('deletes surplus entry', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({});
    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    await deleteSurplus(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), ['1']);
    expect(refreshWarehouseForDate).toHaveBeenCalledWith('2024-05-20');
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
  });

  it('handles database error on delete', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await deleteSurplus(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

