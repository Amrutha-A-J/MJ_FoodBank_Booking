jest.doMock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));
const { awardMilestoneBadge, getBadgeCardLink } = require('../src/utils/badgeUtils');
const db = require('../src/db').default;

test('does not query database on import', () => {
  expect(db.query).not.toHaveBeenCalled();
});

describe('awardMilestoneBadge', () => {
  it('returns a card url', () => {
    const cardUrl = awardMilestoneBadge('user@example.com', 'gold');
    expect(cardUrl).toContain('gold');
    expect(getBadgeCardLink('user@example.com')).toBe(cardUrl);
  });
});

export {};
