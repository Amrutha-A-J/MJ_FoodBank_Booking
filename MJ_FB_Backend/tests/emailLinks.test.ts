import { buildCancelRescheduleLinks } from '../src/utils/emailUtils';
import config from '../src/config';
import logger from '../src/utils/logger';
import { shutdownQueue } from '../src/utils/emailQueue';

describe('buildCancelRescheduleLinks', () => {
  afterEach(() => {
    shutdownQueue();
  });
  it('returns cancel and reschedule links', () => {
    const links = buildCancelRescheduleLinks('tok');
    expect(links).toEqual({
      cancelLink: 'http://localhost:3000/cancel/tok',
      rescheduleLink: 'http://localhost:3000/reschedule/tok',
    });
  });

  it('returns placeholder links when no frontend origin is configured', () => {
    const original = config.frontendOrigins;
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    config.frontendOrigins = [];

    const links = buildCancelRescheduleLinks('tok');
    expect(links).toEqual({ cancelLink: '#', rescheduleLink: '#' });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
    config.frontendOrigins = original;
  });
});
