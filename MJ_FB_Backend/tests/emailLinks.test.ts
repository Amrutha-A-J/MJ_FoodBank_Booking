import { buildCancelRescheduleLinks } from '../src/utils/emailUtils';
import config from '../src/config';

describe('buildCancelRescheduleLinks', () => {
  it('returns cancel and reschedule links', () => {
    const links = buildCancelRescheduleLinks('tok');
    expect(links).toEqual({
      cancelLink: 'http://localhost:3000/cancel/tok',
      rescheduleLink: 'http://localhost:3000/reschedule/tok',
    });
  });

  it('throws when no frontend origin is configured', () => {
    const original = config.frontendOrigins;
    config.frontendOrigins = [];
    expect(() => buildCancelRescheduleLinks('tok')).toThrow(
      'No frontend origin configured',
    );
    config.frontendOrigins = original;
  });
});
