import mockDb from './utils/mockDb';
import { getWeekForDate } from '../src/utils/dateUtils';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantry/pantryAggregationController';
import {
  addVisit,
  deleteVisit,
  toggleVisitVerification,
  getVisitStats,
} from '../src/controllers/clientVisitController';

jest.mock('../src/controllers/pantry/pantryAggregationController', () => ({
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
}));

jest.mock('../src/models/bookingRepository', () => ({
  updateBooking: jest.fn(),
}));

describe('clientVisitController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.connect as jest.Mock).mockReset();
    (refreshPantryWeekly as jest.Mock).mockReset();
    (refreshPantryMonthly as jest.Mock).mockReset();
    (refreshPantryYearly as jest.Mock).mockReset();
  });

  it('deleteVisit triggers pantry refresh', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 1, date: '2024-05-20' }] }) // select existing
      .mockResolvedValueOnce({}) // delete
      .mockResolvedValueOnce({}) // refreshClientVisitCount
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // booking query

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await deleteVisit(req, res, next);
    const { week, month, year } = getWeekForDate('2024-05-20');
    expect(refreshPantryWeekly).toHaveBeenCalledWith(year, month, week);
    expect(refreshPantryMonthly).toHaveBeenCalledWith(year, month);
    expect(refreshPantryYearly).toHaveBeenCalledWith(year);
  });

  it('toggles visit verification', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            clientId: 1,
            clientName: 'Ann Client',
            weightWithCart: 0,
            weightWithoutCart: 0,
            petItem: 0,
            anonymous: false,
            note: null,
            adults: 0,
            children: 0,
            verified: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            clientId: 1,
            clientName: 'Ann Client',
            weightWithCart: 0,
            weightWithoutCart: 0,
            petItem: 0,
            anonymous: false,
            note: null,
            adults: 0,
            children: 0,
            verified: false,
          },
        ],
      });

    const req = { params: { id: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await toggleVisitVerification(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true, clientName: 'Ann Client' }),
    );

    await toggleVisitVerification(req, res, next);
    expect(res.json).toHaveBeenLastCalledWith(
      expect.objectContaining({ verified: false, clientName: 'Ann Client' }),
    );
  });

  it('allows anonymous duplicate visit', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ value: '0' }], rowCount: 1 }) // cart tare
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2024-05-20',
            clientId: 1,
            weightWithCart: 10,
            weightWithoutCart: 8,
            petItem: 0,
            anonymous: true,
            note: null,
            adults: 1,
            children: 0,
            verified: false,
          },
        ],
        rowCount: 1,
      }) // insert
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // refresh count
      .mockResolvedValueOnce({}); // COMMIT

    (mockDb.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const req = {
      body: {
        date: '2024-05-20',
        clientId: 1,
        anonymous: true,
        weightWithCart: 10,
        weightWithoutCart: 8,
        petItem: 0,
        adults: 1,
        children: 0,
      },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await addVisit(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    const sqls = queryMock.mock.calls.map(c => c[0]);
    expect(sqls.some((s: string) => /SELECT 1 FROM client_visits/.test(s))).toBe(false);
  });

  it('clamps negative weightWithoutCart to zero', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }) // duplicate check
      .mockResolvedValueOnce({ rows: [{ value: '10' }], rowCount: 1 }) // cart tare
      .mockImplementationOnce((sql: string, params: any[]) => {
        expect(params[3]).toBe(0);
        return {
          rows: [
            {
              id: 1,
              date: '2024-05-20',
              clientId: 1,
              weightWithCart: 5,
              weightWithoutCart: 0,
              petItem: 0,
              anonymous: false,
              note: null,
              adults: 1,
              children: 0,
              verified: false,
            },
          ],
          rowCount: 1,
        };
      }) // insert
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // refreshClientVisitCount
      .mockResolvedValueOnce({ rowCount: 0 }) // sameDayRes
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // otherRes
      .mockResolvedValueOnce({}); // COMMIT

    (mockDb.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const req = {
      body: {
        date: '2024-05-20',
        clientId: 1,
        weightWithCart: 5,
        petItem: 0,
        adults: 1,
        children: 0,
      },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await addVisit(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('excludes anonymous visits from stats', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req = { query: { group: 'month', months: '1' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await getVisitStats(req, res, next);
    const sql = (mockDb.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toMatch(/COUNT\(DISTINCT CASE WHEN NOT is_anonymous THEN client_id END\)::int AS clients/);
    expect(sql).toMatch(/SUM\(adults\) FILTER \(WHERE NOT is_anonymous\)/);
    expect(sql).toMatch(/SUM\(children\) FILTER \(WHERE NOT is_anonymous\)/);
  });

  it('returns 409 on concurrent duplicate visits', async () => {
    const defer = () => {
      let resolve: () => void;
      const promise = new Promise<void>(r => (resolve = r));
      return { promise, resolve: resolve! };
    };
    const insertGate = defer();

    const query1 = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }) // duplicate check
      .mockResolvedValueOnce({ rows: [{ value: '0' }], rowCount: 1 }) // cart tare
      .mockImplementationOnce(() =>
        insertGate.promise.then(() => ({
          rows: [
            {
              id: 1,
              date: '2024-05-20',
              clientId: 1,
              weightWithCart: 10,
              weightWithoutCart: 8,
              petItem: 0,
              anonymous: false,
              note: null,
              adults: 1,
              children: 0,
              verified: false,
            },
          ],
          rowCount: 1,
        })),
      )
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // refreshClientVisitCount
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // same day booking
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // other bookings
      .mockResolvedValueOnce({}); // COMMIT

    const query2 = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockImplementationOnce(() => {
        insertGate.resolve();
        return Promise.resolve({ rowCount: 0 });
      }) // duplicate check
      .mockResolvedValueOnce({ rows: [{ value: '0' }], rowCount: 1 }) // cart tare
      .mockRejectedValueOnce({ code: '23505' }) // insert fails
      .mockResolvedValueOnce({}); // ROLLBACK

    (mockDb.connect as jest.Mock)
      .mockResolvedValueOnce({ query: query1, release: jest.fn() })
      .mockResolvedValueOnce({ query: query2, release: jest.fn() });

    const req = {
      body: {
        date: '2024-05-20',
        clientId: 1,
        weightWithCart: 10,
        weightWithoutCart: 8,
        petItem: 0,
        anonymous: false,
        adults: 1,
        children: 0,
      },
    } as any;

    const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next1 = jest.fn();
    const next2 = jest.fn();

    await Promise.all([addVisit(req, res1, next1), addVisit(req, res2, next2)]);

    expect(res1.status).toHaveBeenCalledWith(201);
    expect(res2.status).toHaveBeenCalledWith(409);
    expect(res2.json).toHaveBeenCalledWith({ message: 'Duplicate visit' });
  });
});
