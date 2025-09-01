import { awardMilestoneBadge } from '../src/utils/badgeUtils';
import { enqueueEmail } from '../src/utils/emailQueue';

jest.mock('../src/utils/emailQueue', () => ({
  enqueueEmail: jest.fn(),
}));

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
