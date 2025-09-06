jest.doMock('../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));
jest.doMock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

const { awardMilestoneBadge } = require('../src/utils/badgeUtils');
const { enqueueEmail } = require('../src/utils/emailQueue');
const db = require('../src/db').default;

test('does not query database on import', () => {
  expect(db.query).not.toHaveBeenCalled();
});

describe('awardMilestoneBadge', () => {
  it('returns a card url without sending email', () => {
    const cardUrl = awardMilestoneBadge('user@example.com', 'gold');
    expect(enqueueEmail).not.toHaveBeenCalled();
    expect(cardUrl).toContain('gold');
  });
});

export {};
