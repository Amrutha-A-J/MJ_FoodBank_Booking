import mockDb from './utils/mockDb';
import {
  listOutgoingDonations,
  addOutgoingDonation,
  updateOutgoingDonation,
  deleteOutgoingDonation,
} from '../src/controllers/warehouse/outgoingDonationController';
import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../src/utils/warehouseRefresh';

jest.mock('../src/utils/warehouseRefresh', () => ({
  refreshWarehouseForDate: jest.fn(),
  refreshWarehouseForDateChange: jest.fn(),
}));

const flushPromises = () => new Promise(process.nextTick);

describe('outgoingDonationController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (refreshWarehouseForDate as jest.Mock).mockReset();
    (refreshWarehouseForDateChange as jest.Mock).mockReset();
  });

  it('lists outgoing donations for a date', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          date: '2024-05-20',
          weight: 10,
          receiverId: 2,
          receiver: 'Org',
          note: null,
        },
      ],
    });
    const req = { query: { date: '2024-05-20' } } as any;
    const res = { json: jest.fn() } as any;
    await listOutgoingDonations(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), ['2024-05-20']);
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        date: '2024-05-20',
        weight: 10,
        receiverId: 2,
        receiver: 'Org',
        note: null,
      },
    ]);
  });

  it('requires date for listing', async () => {
    const req = { query: {} } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await listOutgoingDonations(req, res, jest.fn());
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Date required' });
  });

  it('handles database error on list', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = { query: { date: '2024-05-20' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await listOutgoingDonations(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('adds outgoing donation', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            receiverId: 2,
            weight: 5,
            note: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Org' }] });
    const req = {
      body: { date: '2024-05-20', receiverId: 2, weight: 5 },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await addOutgoingDonation(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), [
      '2024-05-20',
      2,
      5,
      null,
    ]);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), [2]);
    expect(refreshWarehouseForDate).toHaveBeenCalledWith('2024-05-20');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      date: '2024-05-20',
      receiverId: 2,
      weight: 5,
      note: null,
      receiver: 'Org',
    });
  });

  it('handles database error on add', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = {
      body: { date: '2024-05-20', receiverId: 2, weight: 5 },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    await addOutgoingDonation(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('updates outgoing donation', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-05-21',
            receiverId: 2,
            weight: 5,
            note: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Org' }] });
    const req = {
      params: { id: '1' },
      body: { date: '2024-05-21', receiverId: 2, weight: 5 },
    } as any;
    const res = { json: jest.fn() } as any;
    await updateOutgoingDonation(req, res, jest.fn());
    await flushPromises();
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.any(String), ['1']);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '2024-05-21',
      2,
      5,
      null,
      '1',
    ]);
    expect(refreshWarehouseForDateChange).toHaveBeenCalledWith('2024-05-21', '2024-05-20');
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      date: '2024-05-21',
      receiverId: 2,
      weight: 5,
      note: null,
      receiver: 'Org',
    });
  });

  it('handles database error on update', async () => {
    (mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const req = {
      params: { id: '1' },
      body: { date: '2024-05-21', receiverId: 2, weight: 5 },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await updateOutgoingDonation(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('deletes outgoing donation', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ date: '2024-05-20' }] })
      .mockResolvedValueOnce({});
    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    await deleteOutgoingDonation(req, res, jest.fn());
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
    await deleteOutgoingDonation(req, res, next);
    await flushPromises();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

