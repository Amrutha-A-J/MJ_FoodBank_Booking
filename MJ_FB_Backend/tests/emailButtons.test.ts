import { buildCancelRescheduleButtons } from '../src/utils/emailUtils';

describe('buildCancelRescheduleButtons', () => {
  it('includes cancel and reschedule links', () => {
    const html = buildCancelRescheduleButtons('tok');
    expect(html).toContain('http://localhost:3000/cancel/tok');
    expect(html).toContain('http://localhost:3000/reschedule/tok');
  });
});
