import { awardMilestoneBadge } from '../src/utils/badgeUtils';
import { enqueueEmail } from '../src/utils/emailQueue';

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

describe('awardMilestoneBadge', () => {
  it('queues a thank-you email and returns a card url', () => {
    const cardUrl = awardMilestoneBadge('user@example.com', 'gold');
    expect(enqueueEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringContaining('gold'),
      expect.stringContaining('Download your card'),
    );
    expect(cardUrl).toContain('gold');
  });
});
