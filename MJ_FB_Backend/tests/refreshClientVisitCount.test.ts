import { refreshClientVisitCount } from '../src/controllers/clientVisitController';
import mockDb from './utils/mockDb';

describe('refreshClientVisitCount', () => {
  afterEach(() => {
    (mockDb.query as jest.Mock).mockClear();
  });

  it('uses date range for current month', async () => {
    await refreshClientVisitCount(1, mockDb);
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    const sql = (mockDb.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("v.date >= DATE_TRUNC('month', CURRENT_DATE)");
    expect(sql).toContain("v.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'");
    expect((mockDb.query as jest.Mock).mock.calls[0][1]).toEqual([1]);
  });
});
