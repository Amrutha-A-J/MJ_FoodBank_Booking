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
  it('queues a thank-you email and returns a card url', () => {
    const cardUrl = awardMilestoneBadge('user@example.com', 'gold');
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        templateId: expect.any(Number),
        params: expect.objectContaining({
          body: expect.stringContaining('Download your card'),
          cardUrl: expect.stringContaining('gold'),
        }),
      }),
    );
    expect(cardUrl).toContain('gold');
  });
});

export {};
