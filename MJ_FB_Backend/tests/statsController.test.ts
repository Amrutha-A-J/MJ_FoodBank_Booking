import { getStats } from '../src/controllers/statsController';
import { getBadgeCardLink } from '../src/utils/badgeUtils';

jest.mock('../src/utils/badgeUtils', () => ({
  getBadgeCardLink: jest.fn(),
}));

describe('statsController.getStats', () => {
  beforeEach(() => {
    (getBadgeCardLink as jest.Mock).mockReset();
  });

  it('returns cardUrl when email is provided', () => {
    (getBadgeCardLink as jest.Mock).mockReturnValue('/cards/thanks.pdf');
    const req = { query: { email: 'user@example.com' } } as any;
    const res = { json: jest.fn() } as any;
    getStats(req, res, jest.fn());
    expect(getBadgeCardLink).toHaveBeenCalledWith('user@example.com');
    expect(res.json).toHaveBeenCalledWith({ cardUrl: '/cards/thanks.pdf' });
  });

  it('returns undefined cardUrl when email is missing', () => {
    const req = { query: {} } as any;
    const res = { json: jest.fn() } as any;
    getStats(req, res, jest.fn());
    expect(getBadgeCardLink).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ cardUrl: undefined });
  });
});
