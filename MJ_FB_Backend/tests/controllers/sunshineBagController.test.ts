import mockDb from '../utils/mockDb';
import {
  getSunshineBag,
  upsertSunshineBag,
} from '../../src/controllers/sunshineBagController';
import { authorizeAccess } from '../../src/middleware/authMiddleware';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../../src/controllers/pantry/pantryAggregationController';

jest.mock('../../src/controllers/pantry/pantryAggregationController', () => ({
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('sunshineBagController edge cases', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
    (refreshPantryWeekly as jest.Mock).mockReset();
    (refreshPantryMonthly as jest.Mock).mockReset();
    (refreshPantryYearly as jest.Mock).mockReset();
  });

  it('returns 400 when date query parameter is missing', async () => {
    const req = { query: {} } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await getSunshineBag(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Date required' });
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('denies access when user lacks pantry permissions', () => {
    const middleware = authorizeAccess('pantry');
    const req = { user: { role: 'staff', access: [] } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards database errors when retrieving sunshine bag entries', async () => {
    const error = new Error('database down');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);

    const req = { query: { date: '2024-06-15' } } as any;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as any;
    const next = jest.fn();

    await getSunshineBag(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards database errors when saving sunshine bag entries', async () => {
    const error = new Error('insert failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);

    const req = { body: { date: '2024-06-15', weight: 12, clientCount: 3 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    await upsertSunshineBag(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(refreshPantryWeekly).not.toHaveBeenCalled();
    expect(refreshPantryMonthly).not.toHaveBeenCalled();
    expect(refreshPantryYearly).not.toHaveBeenCalled();
  });
});
