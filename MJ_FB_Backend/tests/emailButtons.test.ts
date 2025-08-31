import { buildCancelRescheduleButtons } from '../src/utils/emailUtils';
import config from '../src/config';

describe('buildCancelRescheduleButtons', () => {
  it('includes cancel and reschedule links', () => {
    const html = buildCancelRescheduleButtons('tok');
    expect(html).toContain('http://localhost:3000/cancel/tok');
    expect(html).toContain('http://localhost:3000/reschedule/tok');
  });

  it('throws when no frontend origin is configured', () => {
    const original = config.frontendOrigins;
    config.frontendOrigins = [];
    expect(() => buildCancelRescheduleButtons('tok')).toThrow('No frontend origin configured');
    config.frontendOrigins = original;
  });
});
